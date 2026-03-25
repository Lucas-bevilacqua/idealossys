"""Agent orchestration routes - SSE streaming with per-agent chat messages

Architecture: Jobs are decoupled from HTTP connections.
- POST /api/agent/stream  → starts a job, returns job_id as first SSE event, streams events
- GET  /api/agent/jobs/{job_id} → reconnect to existing job, replay all events from cursor
When the browser disconnects mid-execution the asyncio Task keeps running.
On page reload the frontend reconnects with the saved job_id and reads all buffered events.
"""

import asyncio
import json
import logging
import os
import re
import time
import uuid
from fastapi import APIRouter, HTTPException, Request, Depends

logger = logging.getLogger(__name__)
from fastapi.responses import StreamingResponse
from ..agents.orchestrator import get_os_core_team
from ..auth.routes import get_current_user
from ..database.crud import Database

router = APIRouter(prefix="/api/agent", tags=["agent"])
db = Database()

_api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")

# ── Job store ────────────────────────────────────────────────────────────────
# job_id → {events: list, done: bool, notify: asyncio.Event, task: Task,
#            tenant_id: str, created_at: float}
_jobs: dict[str, dict] = {}
_JOBS_TTL = 3600  # keep jobs for 1 hour


def _cleanup_old_jobs():
    cutoff = time.time() - _JOBS_TTL
    stale = [jid for jid, j in _jobs.items() if j["created_at"] < cutoff]
    for jid in stale:
        del _jobs[jid]


def _make_job(tenant_id: str, area_name: str = "default") -> tuple[str, dict]:
    _cleanup_old_jobs()
    job_id = str(uuid.uuid4())
    job = {
        "events": [],           # all events ever pushed, preserved for reconnect
        "done": False,
        "notify": asyncio.Event(),   # set whenever a new event is pushed
        "task": None,
        "tenant_id": tenant_id,
        "area_name": area_name,
        "created_at": time.time(),
    }
    _jobs[job_id] = job
    return job_id, job


def _push(job: dict, event_type: str, data: dict, **extra):
    """Append event to job store and wake any waiting SSE readers."""
    job["events"].append({"event": event_type, "data": data, **extra})
    # Auto-track created task IDs for cleanup in finally block
    if event_type == "task_created":
        task_id = data.get("task", {}).get("id")
        if task_id:
            job.setdefault("tracked_tasks", []).append(task_id)
    job["notify"].set()


# ── Keyword helpers ──────────────────────────────────────────────────────────
_CREATION_KEYWORDS = [
    "criar", "crie", "cria", "faça", "faz", "faze", "desenvolva", "desenvolver",
    "montar", "monte", "construir", "construa", "gera", "gere", "gerar",
    "landing page", "lp", "site", "website", "sistema", "app", "aplicativo",
    "campanha", "página", "pagina", "portal", "plataforma",
]
_EDIT_KEYWORDS = [
    "arruma", "arrume", "corrige", "corrija", "conserta", "conserte",
    "muda", "mude", "altera", "altere", "modifica", "modifique", "ajusta", "ajuste",
    "refaz", "refaça", "atualiza", "atualize", "melhora", "melhore",
    "fix", "bugado", "bug", "erro no", "problema no", "não funciona", "quebrado",
]
_CONFIRM_WORDS = [
    "sim", "ok", "pode", "pode ir", "pode seguir", "confirmo", "confirmado",
    "prosseguir", "prossiga", "segue", "segue aí", "go", "bora", "vai",
    "execute", "executa", "começa", "começa aí", "manda ver", "pode executar",
    "tá bom", "ta bom", "certo", "exato", "isso mesmo", "perfeito",
]


def _kw_match(text: str, keywords: list) -> bool:
    """Match keywords using word boundaries to avoid substring false positives."""
    for kw in keywords:
        pattern = r'\b' + re.escape(kw) + r'\b'
        if re.search(pattern, text):
            return True
    return False


def _is_edit_request(text: str) -> bool:
    return _kw_match(text.lower(), _EDIT_KEYWORDS)


def _is_creation_request(text: str) -> bool:
    lower = text.lower()
    if _is_edit_request(lower):
        return False
    return _kw_match(lower, _CREATION_KEYWORDS)


def _is_confirmation(text: str) -> bool:
    lower = text.strip().lower()
    # No character length limit — check for confirm words while excluding creation intent
    return _kw_match(lower, _CONFIRM_WORDS) and not _is_creation_request(lower)


def _has_pending_briefing(history: list) -> bool:
    briefing_markers = [
        "posso prosseguir", "prosseguir", "confirmar",
        "**📋", "**🎯", "tem algo que quer ajustar",
        "manda o time", "mandar o time", "é só confirmar",
    ]
    for msg in reversed(history[-6:]):
        if not isinstance(msg, dict):
            continue
        sender_id = msg.get("senderId", "")
        role = msg.get("role", "")
        text = msg.get("text") or ""
        is_helio = sender_id == "ceo-ia" or (role == "agent" and "hélio" in msg.get("senderName", "").lower())
        if is_helio and any(m in text for m in briefing_markers):
            return True
    return False


# Map Agno agent name/id → (frontend agentId, display name)
AGENT_MAP: dict[str, tuple[str, str]] = {
    "luna":    ("analyst", "Luna"),
    "sarah":   ("pm",     "Sarah"),
    "alex":    ("ux",     "Alex"),
    "bruno":   ("dev-fe", "Bruno"),
    "carla":   ("dev-be", "Carla"),
    "diego":   ("qa",     "Diego"),
    "elena":   ("devops", "Elena"),
    "bob":     ("scrum",   "Bob"),
    "hélio":   ("ceo-ia", "Hélio"),
    "helio":   ("ceo-ia", "Hélio"),
    "os-core": ("ceo-ia", "Hélio"),
}


async def _gemini_briefing(company_ctx: str, user_input: str) -> str:
    if not _api_key:
        return "Entendido! Vou criar o que você pediu. Pode confirmar para eu acionar o time?"
    try:
        from google import genai
        from google.genai import types as genai_types
        client = genai.Client(api_key=_api_key)
        prompt = f"""Você é Hélio, CEO de IA e Orquestrador do IdealOS. Sua personalidade é direta, calorosa e conversacional — como um sócio experiente, não um formulário.

{company_ctx}

O usuário pediu: "{user_input}"

Sua tarefa: fazer 2 a 3 perguntas de planejamento OBJETIVAS e CONVERSACIONAIS para garantir que a entrega seja certeira. Não use listas com bullets. Não mostre um briefing formal. Apenas converse naturalmente.

Exemplos de perguntas válidas:
- "Qual é o principal objetivo disso — captar leads, fechar vendas direto ou fortalecer a marca?"
- "Você tem alguma referência visual que te agrada? Algo mais dark/premium ou prefere algo clean e claro?"
- "Já tem um CTA definido (ex: 'Agende uma demo', 'Fale no WhatsApp') ou posso sugerir?"
- "Esse projeto vai substituir o site atual ou é uma página de campanha separada?"

REGRAS ABSOLUTAS:
- MÁXIMO 3 perguntas, separadas por linha em branco
- Use linguagem natural e direta, como numa conversa real
- Use os dados da empresa do contexto para personalizar as perguntas (não pergunte o que já sabe)
- NÃO execute nada ainda — apenas pergunte
- Termine com algo que sinalize que é só confirmar para ir em frente (ex: "Com isso, a gente manda o time pra cima!")
- A resposta DEVE conter a palavra "prosseguir" ou "confirmar" em algum lugar para o sistema detectar que é um briefing
"""
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    client.models.generate_content,
                    model="gemini-2.5-flash",
                    contents=prompt,
                    config=genai_types.GenerateContentConfig(
                        max_output_tokens=1024,
                        temperature=0.8,
                        thinking_config=genai_types.ThinkingConfig(thinking_budget=0),
                    ),
                ),
                timeout=90.0,
            )
            return response.text or ""
        except Exception as e:
            print(f"[BRIEFING] failed: {type(e).__name__}: {e}")
    except Exception as e:
        print(f"[BRIEFING] outer error: {e}")
        return """Boa! Antes de acionar o time, me conta rapidinho:

Qual é o principal objetivo disso — captar leads, fechar vendas ou fortalecer a marca?

Você tem alguma preferência visual? Algo mais dark/premium ou prefere um estilo mais clean e claro?

Tem algum CTA definido (ex: "Fale no WhatsApp", "Agende uma demo") ou posso sugerir algo com base no perfil de vocês?

Com essas respostas, posso prosseguir e mandar o time criar algo certeiro. É só confirmar!"""


# ── Background agent runner ──────────────────────────────────────────────────

async def _run_agent_job(job_id: str, tenant_id: str, full_prompt: str,
                         area_name: str, created_task_ids: list):
    """Run the Agno team in background. Pushes all events to job store.
    Keeps running even if the SSE client disconnects."""
    job = _jobs.get(job_id)
    if not job:
        return

    # Wrap event_queue: any put() also pushes to job store
    raw_q: asyncio.Queue = asyncio.Queue()

    class _BridgeQueue:
        """Forwards puts to both raw_q and job store simultaneously."""
        async def put(self, item):
            if item is None:
                await raw_q.put(None)
                return
            evt = item.get("event", "")
            data = item.get("data", {})
            _push(job, evt, data, **{k: v for k, v in item.items() if k not in ("event", "data")})
            await raw_q.put(item)

    bridge = _BridgeQueue()
    team = get_os_core_team(tenant_id=tenant_id, event_queue=bridge)

    try:
        helio_text_parts = []
        agent_text_parts: dict = {}  # raw_id → accumulated streaming chunks
        active_agents: set = set()

        _push(job, "orchestrator_plan", {"plan": []})

        # 10-minute hard limit on the entire agent run
        async with asyncio.timeout(600):
            async for chunk in team.arun(full_prompt, stream=True):
                event_type = getattr(chunk, 'event', '') or ''
                print(f"[AGNO] event={event_type!r} agent={getattr(chunk,'agent_name','')!r}")

                if event_type in ('ToolCallStarted', 'ToolCallCompleted'):
                    # Map Agno tool events → frontend tool_call events
                    raw_id = getattr(chunk, 'agent_id', '') or getattr(chunk, 'agent_name', '') or ''
                    fe_id, display_name = AGENT_MAP.get(raw_id.lower(), (raw_id.lower() or 'os-core', raw_id or 'Agente'))
                    tool_name = ''
                    args = {}
                    tool_obj = getattr(chunk, 'tool', None)
                    if tool_obj:
                        tool_name = getattr(tool_obj, 'tool_name', '') or ''
                        args = getattr(tool_obj, 'tool_args', {}) or {}
                    if not tool_name:
                        tool_name = getattr(chunk, 'tool_name', '') or ''
                    if tool_name and event_type == 'ToolCallStarted':
                        _push(job, "tool_call", {
                            "agentId": fe_id, "agentName": display_name,
                            "toolName": tool_name, "args": args, "response": "",
                        })
                        try:
                            await db.create_agent_log(
                                tenant_id=tenant_id,
                                from_agent=fe_id,
                                to_agent="tool",
                                event_type="tool_call",
                                payload=f"{tool_name}: {str(args)[:300]}",
                                status="started",
                            )
                        except Exception as _e:
                            logger.debug("Non-critical error suppressed: %s", _e)

                elif event_type == 'RunStarted':
                    raw_id = getattr(chunk, 'agent_id', '') or getattr(chunk, 'agent_name', '') or ''
                    fe_id, display_name = AGENT_MAP.get(raw_id.lower(), (raw_id.lower() or 'os-core', raw_id or 'Agente'))
                    if fe_id not in active_agents:
                        active_agents.add(fe_id)
                        _push(job, "agent_start", {"agentId": fe_id, "agentName": display_name})
                        try:
                            await db.create_agent_log(
                                tenant_id=tenant_id,
                                from_agent="orchestrator",
                                to_agent=fe_id,
                                event_type="agent_start",
                                payload=f"{display_name} iniciado",
                                status="started",
                            )
                        except Exception as _e:
                            logger.debug("Non-critical error suppressed: %s", _e)

                elif event_type == 'RunContent':
                    # Accumulate streaming chunks per sub-agent (fallback if RunCompleted.content is empty)
                    raw_id = getattr(chunk, 'agent_id', '') or getattr(chunk, 'agent_name', '') or ''
                    content = getattr(chunk, 'content', '') or ''
                    if content and raw_id:
                        agent_text_parts.setdefault(raw_id, []).append(content)

                elif event_type == 'RunCompleted':
                    raw_id = getattr(chunk, 'agent_id', '') or getattr(chunk, 'agent_name', '') or ''
                    fe_id, display_name = AGENT_MAP.get(raw_id.lower(), (raw_id.lower() or 'os-core', raw_id or 'Agente'))
                    content = getattr(chunk, 'content', '') or ''.join(agent_text_parts.pop(raw_id, []))
                    if content:
                        _push(job, "agent_message", {"agentId": fe_id, "agentName": display_name, "message": content},
                              _save=True, _agentName=display_name, _agentId=fe_id)
                    _push(job, "agent_done", {"agentId": fe_id, "agentName": display_name, "output": content or "Concluído"})

                    # Persist to DB
                    if content:
                        try:
                            await db.create_message(tenant_id=tenant_id, area_id=area_name,
                                                    sender_id=fe_id, sender_name=display_name,
                                                    text_content=content, role="agent")
                        except Exception as _e:
                            logger.debug("Non-critical error suppressed: %s", _e)
                    try:
                        await db.create_agent_log(
                            tenant_id=tenant_id,
                            from_agent=fe_id,
                            to_agent="orchestrator",
                            event_type="agent_done",
                            payload=(content or "Concluído")[:500],
                            status="completed",
                        )
                    except Exception as _e:
                        logger.debug("Non-critical error suppressed: %s", _e)

                elif event_type == 'TeamRunContent':
                    content = getattr(chunk, 'content', '') or ''
                    if content:
                        helio_text_parts.append(content)

                elif event_type == 'TeamRunCompleted':
                    content = getattr(chunk, 'content', '') or ''.join(helio_text_parts)
                    helio_text_parts = []
                    if content:
                        _push(job, "agent_message", {"agentId": "ceo-ia", "agentName": "Hélio", "message": content},
                              _save=True, _agentName="Hélio", _agentId="ceo-ia", _final_text=content)
                        try:
                            await db.create_message(tenant_id=tenant_id, area_id=area_name,
                                                    sender_id="ceo-ia", sender_name="Hélio",
                                                    text_content=content, role="agent")
                        except Exception as _e:
                            logger.debug("Non-critical error suppressed: %s", _e)
                        try:
                            await db.create_agent_log(
                                tenant_id=tenant_id,
                                from_agent="ceo-ia",
                                to_agent="user",
                                event_type="team_done",
                                payload=content[:500],
                                status="completed",
                            )
                        except Exception as _e:
                            logger.debug("Non-critical error suppressed: %s", _e)

        # Flush remaining Hélio text
        if helio_text_parts:
            content = ''.join(helio_text_parts)
            _push(job, "agent_message", {"agentId": "ceo-ia", "agentName": "Hélio", "message": content},
                  _save=True, _agentName="Hélio", _agentId="ceo-ia", _final_text=content)
            try:
                await db.create_message(tenant_id=tenant_id, area_id=area_name,
                                        sender_id="ceo-ia", sender_name="Hélio",
                                        text_content=content, role="agent")
            except Exception as _e:
                logger.debug("Non-critical error suppressed: %s", _e)

    except asyncio.TimeoutError:
        _push(job, "error", {"text": "Tempo limite atingido (10 min). Verifique os artefatos gerados."})
        try:
            await db.create_agent_log(
                tenant_id=tenant_id, from_agent="orchestrator", to_agent="system",
                event_type="timeout", payload="Execução excedeu 10 minutos", status="error",
            )
        except Exception as _e:
            logger.debug("Non-critical error suppressed: %s", _e)
    except Exception as exc:
        _push(job, "error", {"text": f"Erro na execução: {str(exc)}"})
        try:
            await db.create_agent_log(
                tenant_id=tenant_id, from_agent="orchestrator", to_agent="system",
                event_type="error", payload=str(exc)[:500], status="error",
            )
        except Exception as _e:
            logger.debug("Non-critical error suppressed: %s", _e)
    finally:
        # Auto-close open tasks tracked via _push (task_created events)
        for task_id in job.get("tracked_tasks", []):
            try:
                current = await db.get_task(task_id)
                if current and current.get("status") not in ("DONE", "CANCELLED"):
                    await db.update_task_status(task_id=task_id, status="DONE")
                    _push(job, "task_updated", {"taskId": task_id, "status": "DONE"})
            except Exception as _e:
                logger.debug("Non-critical error suppressed: %s", _e)

        now_ms = int(time.time() * 1000)
        _push(job, "done", {"text": "", "timestamp": now_ms})
        job["done"] = True
        job["notify"].set()


# ── SSE reader helper ─────────────────────────────────────────────────────────

async def _stream_job_events(job: dict, from_cursor: int = 0):
    """Async generator that yields SSE lines from a job's event store.
    Waits for new events when the cursor catches up with the producer."""
    cursor = from_cursor
    while True:
        while cursor < len(job["events"]):
            evt = job["events"][cursor]
            cursor += 1
            event_type = evt.get("event", "agent_event")
            data = evt.get("data", {})
            yield f"event: {event_type}\ndata: {json.dumps(data)}\n\n"

            if event_type == "done":
                return

        if job["done"] and cursor >= len(job["events"]):
            return

        # Wait for the runner to push more events
        # Use short keepalive intervals so the connection stays alive for long tasks
        job["notify"].clear()
        try:
            await asyncio.wait_for(job["notify"].wait(), timeout=30.0)
        except asyncio.TimeoutError:
            # Job still running — send keepalive comment and keep waiting
            if not job["done"]:
                yield ": keepalive\n\n"
                continue
            # Job marked done but no events left — exit cleanly
            return


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/stream")
async def agent_stream(request: Request, current_user: dict = Depends(get_current_user)):
    """Start an agent job and stream its events via SSE.
    The job continues running server-side even if the client disconnects.
    Returns job_id as the first SSE event so the client can reconnect later."""

    try:
        body = await request.json()
    except Exception:
        body = {}

    user_input = body.get("userInput", "")
    history = body.get("history", [])
    area_name = body.get("areaName", "default")

    if not user_input:
        raise HTTPException(status_code=400, detail="userInput is required")

    tenant_id = current_user["tenant_id"]
    user = current_user["user"]

    # ── Create persistent job ────────────────────────────────────────────────
    job_id, job = _make_job(tenant_id, area_name)

    async def event_generator():
        # Always send job_id first so client can save it for reconnection
        yield f"event: job_id\ndata: {json.dumps({'jobId': job_id})}\n\n"

        # Echo user message
        now_ms = int(time.time() * 1000)
        user_msg = {"type": "user_message", "id": f"msg_user_{now_ms}",
                    "senderId": user["id"], "senderName": user["name"],
                    "text": user_input, "timestamp": now_ms, "role": "user", "areaId": area_name}
        yield f"event: user_message\ndata: {json.dumps(user_msg)}\n\n"

        await db.create_message(tenant_id=tenant_id, area_id=area_name,
                                sender_id=user["id"], sender_name=user["name"],
                                text_content=user_input, role="user")

        # Build company context
        tenant = await db.get_tenant(tenant_id)
        company_ctx = ""
        if tenant:
            raw_desc = tenant.get('description', '') or ''
            short_desc = raw_desc[:600].rsplit(' ', 1)[0] + "..." if len(raw_desc) > 600 else raw_desc
            company_ctx = (f"━━━ CONTEXTO DA EMPRESA ━━━\n"
                           f"Nome: {tenant.get('name','')}\n"
                           f"Setor/Indústria: {tenant.get('industry','')}\n"
                           f"Descrição: {short_desc}\n"
                           f"Objetivos: {tenant.get('goals','')}\n"
                           f"Público-alvo: {tenant.get('target_audience','') or 'PMEs e empreendedores'}\n"
                           f"Desafios: {tenant.get('challenges','')}\n"
                           f"Tom da marca: {tenant.get('brand_tone','') or 'profissional e inovador'}\n"
                           f"Cores da marca: {tenant.get('brand_colors','') or 'a definir'}\n"
                           f"Site: {tenant.get('website_url','') or 'não informado'}\n"
                           f"Logo URL: {tenant.get('logo_url','') or 'não disponível'}\n"
                           f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

        def _sanitize(text: str, max_len: int = 500) -> str:
            return str(text).replace("\x00", "").strip()[:max_len]

        ctx_lines = [
            f"{_sanitize(m.get('senderName') or 'Usuário', 50)}: {_sanitize(m.get('text') or '')}"
            for m in history[-10:]
            if isinstance(m, dict) and m.get("role") in ("user", "agent", None)
        ]
        ctx = "\n".join(ctx_lines)
        full_prompt = ((company_ctx + "\n\n") +
                       (f"Histórico:\n{ctx}\n\n" if ctx else "") +
                       f"Solicitação do usuário:\n{user_input}")

        # Briefing interception
        is_creation = _is_creation_request(user_input)
        has_briefing = _has_pending_briefing(history)
        is_confirm = _is_confirmation(user_input)
        print(f"[ROUTE] is_creation={is_creation} has_briefing={has_briefing} is_confirm={is_confirm}")

        if is_confirm and has_briefing:
            full_prompt = ("⚡ BRIEFING JÁ CONFIRMADO PELO USUÁRIO — EXECUTE O PIPELINE IMEDIATAMENTE. "
                           "NÃO APRESENTE NOVO BRIEFING. INICIE DIRETAMENTE A FASE 1 COM LUNA.\n\n") + full_prompt

        if is_creation and not has_briefing:
            briefing_text = await _gemini_briefing(company_ctx, user_input)
            now_ms2 = int(time.time() * 1000)
            yield f"event: agent_start\ndata: {json.dumps({'agentId': 'ceo-ia', 'agentName': 'Hélio'})}\n\n"
            yield f"event: agent_message\ndata: {json.dumps({'agentId': 'ceo-ia', 'agentName': 'Hélio', 'message': briefing_text})}\n\n"
            yield f"event: agent_done\ndata: {json.dumps({'agentId': 'ceo-ia', 'agentName': 'Hélio', 'output': briefing_text})}\n\n"
            yield f"event: done\ndata: {json.dumps({'text': '', 'timestamp': now_ms2})}\n\n"
            await db.create_message(tenant_id=tenant_id, area_id=area_name,
                                    sender_id="ceo-ia", sender_name="Hélio",
                                    text_content=briefing_text, role="agent")
            job["done"] = True
            return

        # Launch agent as independent background task
        created_task_ids: list = []
        bg_task = asyncio.create_task(
            _run_agent_job(job_id, tenant_id, full_prompt, area_name, created_task_ids)
        )
        job["task"] = bg_task

        # Stream events from job store (will keep reading even if runner is still going)
        async for line in _stream_job_events(job, from_cursor=0):
            yield line

    async def byte_generator():
        async for chunk in event_generator():
            yield chunk.encode("utf-8")

    return StreamingResponse(
        byte_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


@router.get("/jobs/active")
async def get_active_job(current_user: dict = Depends(get_current_user)):
    """Return the most recent running job for this tenant (cross-tab detection).
    Must be defined BEFORE /jobs/{job_id} so FastAPI doesn't match 'active' as a job_id."""
    tenant_id = current_user["tenant_id"]
    for job_id, job in reversed(list(_jobs.items())):
        if job["tenant_id"] != tenant_id:
            continue
        if job["done"]:
            continue
        # Check if the background task crashed without setting done=True
        bg_task = job.get("task")
        if bg_task is not None and bg_task.done():
            job["done"] = True
            continue
        return {"found": True, "jobId": job_id, "areaName": job.get("area_name", "global"), "eventCount": len(job["events"])}
    return {"found": False, "jobId": None}


@router.get("/jobs/{job_id}")
async def reconnect_job(job_id: str, from_cursor: int = 0,
                        current_user: dict = Depends(get_current_user)):
    """Reconnect to an existing job and replay all events from cursor.
    Use from_cursor=0 to replay from the beginning.
    The job continues running server-side regardless of connection state."""
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or expired")

    if job["tenant_id"] != current_user["tenant_id"]:
        raise HTTPException(status_code=403, detail="Not your job")

    async def byte_generator():
        async for line in _stream_job_events(job, from_cursor=from_cursor):
            yield line.encode("utf-8")

    return StreamingResponse(
        byte_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


@router.get("/jobs/{job_id}/status")
async def job_status(job_id: str, current_user: dict = Depends(get_current_user)):
    """Check if a job is still running and how many events it has emitted."""
    job = _jobs.get(job_id)
    if not job or job["tenant_id"] != current_user["tenant_id"]:
        return {"found": False}
    return {"found": True, "done": job["done"], "eventCount": len(job["events"])}


@router.post("/run")
async def agent_run(request: Request, current_user: dict = Depends(get_current_user)):
    """Non-streaming run"""
    body = await request.json()
    user_input = body.get("userInput", "")
    tenant_id = current_user["tenant_id"]
    if not user_input:
        raise HTTPException(status_code=400, detail="userInput is required")
    try:
        team = get_os_core_team(tenant_id=tenant_id)
        result = await asyncio.wait_for(team.arun(user_input), timeout=120)
        return {"status": "success",
                "response": str(result.content) if hasattr(result, "content") else str(result),
                "tenant_id": tenant_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")


@router.get("/health")
async def agent_health():
    return {
        "status": "healthy",
        "active_jobs": len([j for j in _jobs.values() if not j["done"]]),
        "agents": ["Hélio", "Sarah", "Alex", "Bruno", "Carla", "Diego", "Elena"],
    }
