"""Briefing Semanal — geração on-demand e histórico de resumos por BU"""

import os
import time
from fastapi import APIRouter, Request, Depends
from ..auth.routes import get_current_user
from ..database.crud import Database

router = APIRouter(prefix="/api/briefing", tags=["briefing"])
db = Database()

_WEEK_MS = 7 * 24 * 60 * 60 * 1000  # 1 semana em ms


async def _generate_briefing_content(tenant_id: str, period_start: int, period_end: int) -> dict:
    """
    Agrega dados da semana e gera resumo executivo via Gemini.
    Retorna dict com content + métricas.
    """
    from ..agents.tools import _gemini_generate

    # ── Coleta de dados ─────────────────────────────────────────────
    tenant = await db.get_tenant(tenant_id)
    company_name = tenant.get("name", "Empresa") if tenant else "Empresa"

    tasks = await db.get_tasks(tenant_id)
    artifacts = await db.get_artifacts(tenant_id)
    pipeline = await db.get_sales_pipeline(tenant_id=tenant_id)

    # Filtra pelo período
    done_tasks = [t for t in tasks if t.get("status") == "DONE"]
    new_artifacts = [a for a in artifacts
                     if (a.get("timestamp") or 0) >= period_start
                     and (a.get("timestamp") or 0) <= period_end]
    new_leads = [l for l in pipeline
                 if (l.get("created_at") or 0) >= period_start
                 and (l.get("created_at") or 0) <= period_end]

    # BU Memory — aprendizados recentes
    bu_memories = await db.get_bu_memories(tenant_id=tenant_id, limit=10)

    # Inter-BU tasks concluídas
    try:
        pending = await db.get_pending_inter_bu_tasks(tenant_id=tenant_id)
        # Usamos o total de tasks inter-BU como proxy para colaboração
        inter_bu_count = len(pending)
    except Exception:
        inter_bu_count = 0

    # Agrupamento de tasks por assignee (proxy de BU)
    bu_map = {
        "luna": "BU Tech", "sarah": "BU Tech", "bob": "BU Tech",
        "alex": "BU Tech", "carla": "BU Tech", "bruno": "BU Tech",
        "diego": "BU Tech", "elena": "BU Tech",
        "mkt-head": "BU Marketing", "strat": "BU Marketing",
        "copy": "BU Marketing", "seo": "BU Marketing", "social": "BU Marketing",
        "sales-head": "BU Vendas", "leads": "BU Vendas",
        "email": "BU Vendas", "whatsapp": "BU Vendas",
    }
    tasks_by_bu: dict[str, list] = {}
    for t in done_tasks:
        assignee = (t.get("assigneeId") or "").lower()
        bu = bu_map.get(assignee, "Geral")
        tasks_by_bu.setdefault(bu, []).append(t["title"])

    # ── Geração do briefing via Gemini ──────────────────────────────
    period_label = (
        f"{time.strftime('%d/%m', time.localtime(period_start / 1000))} a "
        f"{time.strftime('%d/%m/%Y', time.localtime(period_end / 1000))}"
    )

    tasks_section = "\n".join(
        f"- {bu}: {len(ts)} tasks — {', '.join(ts[:3])}{'...' if len(ts) > 3 else ''}"
        for bu, ts in tasks_by_bu.items()
    ) or "Nenhuma task concluída no período."

    artifacts_section = "\n".join(
        f"- {a.get('title', 'sem título')} ({a.get('language', '?')})"
        for a in new_artifacts[:10]
    ) or "Nenhum artefato gerado."

    leads_section = (
        f"{len(new_leads)} novos leads adicionados ao pipeline."
        if new_leads else "Nenhum lead novo."
    )

    memories_section = "\n".join(
        f"- [{m.get('category','?')}] {m.get('key_name','')}: {m.get('value','')[:80]}"
        for m in bu_memories[:5]
    ) or "Sem aprendizados registrados."

    prompt = f"""Você é o assistente de IA executivo da empresa {company_name}.
Gere um briefing semanal executivo CONCISO e ACIONÁVEL em português, em formato markdown.

PERÍODO: {period_label}
EMPRESA: {company_name}

DADOS DA SEMANA:

Tasks Concluídas por BU:
{tasks_section}

Artefatos Gerados:
{artifacts_section}

Pipeline de Vendas:
{leads_section}

Aprendizados e Memórias das BUs:
{memories_section}

INSTRUÇÕES:
1. Escreva em tom executivo — direto, sem enrolação
2. Use seções: ## Resumo da Semana | ## Por BU | ## Métricas | ## Alertas | ## Próximos Passos
3. Destaque 1-3 conquistas mais importantes da semana
4. Aponte 1-2 alertas ou riscos (se houver)
5. Sugira 3 próximos passos concretos para a semana seguinte
6. Máximo 500 palavras
"""
    content = await _gemini_generate(prompt, timeout=60.0)

    return {
        "content": content,
        "tasks_done": len(done_tasks),
        "artifacts_generated": len(new_artifacts),
        "leads_added": len(new_leads),
    }


@router.get("")
async def generate_briefing(current_user: dict = Depends(get_current_user)):
    """Gera briefing on-demand da última semana"""
    tenant_id = current_user["tenant_id"]
    now = int(time.time() * 1000)
    period_start = now - _WEEK_MS
    period_end = now

    data = await _generate_briefing_content(
        tenant_id=tenant_id,
        period_start=period_start,
        period_end=period_end,
    )

    saved = await db.save_briefing(
        tenant_id=tenant_id,
        content=data["content"],
        period_start=period_start,
        period_end=period_end,
        tasks_done=data["tasks_done"],
        artifacts_generated=data["artifacts_generated"],
        leads_added=data["leads_added"],
    )
    return saved


@router.get("/latest")
async def get_latest_briefing(current_user: dict = Depends(get_current_user)):
    """Retorna o último briefing salvo (sem gerar novo)"""
    tenant_id = current_user["tenant_id"]
    briefing = await db.get_latest_briefing(tenant_id=tenant_id)
    return briefing or {"content": None}


@router.get("/history")
async def get_briefing_history(current_user: dict = Depends(get_current_user)):
    """Lista os últimos 10 briefings"""
    tenant_id = current_user["tenant_id"]
    return await db.get_briefings(tenant_id=tenant_id)
