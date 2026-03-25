"""Agno agent tools factory - creates tools bound to tenant_id with optional SSE event queue"""

import asyncio
import os
from typing import Optional, List
from ..database.crud import Database

db = Database()

_api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
_unsplash_key = os.getenv("UNSPLASH_ACCESS_KEY", "")
_pexels_key = os.getenv("PEXELS_API_KEY", "")

# ── Curated corporate B2B image library by sector ──────────────────────────
# Unsplash photo IDs — tested, high quality, corporate style
_CORPORATE_IMAGES: dict = {
    "default": [
        "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80",  # modern office
        "https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&q=80",  # team meeting
        "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&q=80",  # business meeting
        "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80",  # team working
        "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&q=80",  # office collab
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80",  # analytics dashboard
        "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1200&q=80",  # presentation
        "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=80",  # workspace
    ],
    "marketing": [
        "https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=1200&q=80",  # marketing strategy
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80",  # analytics
        "https://images.unsplash.com/photo-1432888622747-4eb9a8f5f989?w=1200&q=80",  # digital marketing
        "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=1200&q=80",  # social media
        "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&q=80",  # content creation
        "https://images.unsplash.com/photo-1552581234-26160f608093?w=1200&q=80",  # team brainstorm
    ],
    "tecnologia": [
        "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80",  # circuit board
        "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&q=80",  # cybersecurity
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80",  # data dashboard
        "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=1200&q=80",  # developer
        "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&q=80",  # laptop tech
        "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=1200&q=80",  # code screen
    ],
    "financas": [
        "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80",  # financial charts
        "https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?w=1200&q=80",  # investment
        "https://images.unsplash.com/photo-1565514020179-026b92b84bb6?w=1200&q=80",  # banking
        "https://images.unsplash.com/photo-1563986768494-4641a6c05882?w=1200&q=80",  # finance team
        "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80",  # accounting
    ],
    "saude": [
        "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80",  # medical
        "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=1200&q=80",  # healthcare
        "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&q=80",  # wellness
        "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=1200&q=80",  # clinic
    ],
    "educacao": [
        "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&q=80",  # education
        "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200&q=80",  # learning
        "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&q=80",  # classroom
        "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1200&q=80",  # students
    ],
    "construcao": [
        "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80",  # construction
        "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=1200&q=80",  # building
        "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&q=80",  # architecture
        "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80",  # real estate
    ],
    "consultoria": [
        "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1200&q=80",  # consulting meeting
        "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200&q=80",  # business strategy
        "https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=1200&q=80",  # consultant
        "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1200&q=80",  # boardroom
    ],
}

# Avatar photos for testimonials (diverse, professional)
_TESTIMONIAL_AVATARS = [
    "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=120&q=80",   # man suit
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&q=80", # woman professional
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&q=80", # man executive
    "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&q=80", # woman exec
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&q=80", # man casual
    "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=120&q=80", # woman smile
]


def _get_images_for_sector(industry: str) -> list:
    """Return curated image list based on industry keyword."""
    lower = (industry or "").lower()
    if any(k in lower for k in ["marketing", "agência", "agencia", "publicidade", "mídia"]):
        return _CORPORATE_IMAGES["marketing"]
    if any(k in lower for k in ["tech", "software", "saas", "ti ", "it ", "digital", "dados", "ia", "ai"]):
        return _CORPORATE_IMAGES["tecnologia"]
    if any(k in lower for k in ["financ", "banco", "invest", "contab", "seguro", "economia"]):
        return _CORPORATE_IMAGES["financas"]
    if any(k in lower for k in ["saúde", "saude", "médic", "medic", "clinic", "hospital", "bem-estar", "wellness"]):
        return _CORPORATE_IMAGES["saude"]
    if any(k in lower for k in ["educa", "ensino", "escola", "universidade", "curso", "treina"]):
        return _CORPORATE_IMAGES["educacao"]
    if any(k in lower for k in ["constru", "obra", "imóvel", "imovel", "arquitet"]):
        return _CORPORATE_IMAGES["construcao"]
    if any(k in lower for k in ["consultor", "gestão", "gestao", "estratég", "estrateg", "advisory"]):
        return _CORPORATE_IMAGES["consultoria"]
    return _CORPORATE_IMAGES["default"]


async def _fetch_unsplash_images(query: str, count: int = 6) -> list:
    """Try Unsplash API, fallback to Pexels, fallback to curated."""
    if _unsplash_key:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(
                    "https://api.unsplash.com/search/photos",
                    params={"query": query, "per_page": count, "orientation": "landscape"},
                    headers={"Authorization": f"Client-ID {_unsplash_key}"},
                )
                data = r.json()
                return [p["urls"]["regular"] for p in data.get("results", [])]
        except Exception:
            pass
    if _pexels_key:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(
                    "https://api.pexels.com/v1/search",
                    params={"query": query, "per_page": count, "orientation": "landscape"},
                    headers={"Authorization": _pexels_key},
                )
                data = r.json()
                return [p["src"]["large"] for p in data.get("photos", [])]
        except Exception:
            pass
    return []


async def _gemini_generate(prompt: str, timeout: float = 300.0) -> str:
    """Call Gemini directly for large text generation (bypasses tool call size limits)."""
    if not _api_key:
        return "<!-- Error: GOOGLE_API_KEY not configured -->"

    from google import genai
    from google.genai import types as genai_types

    client = genai.Client(api_key=_api_key)

    for attempt in range(1, 3):  # up to 2 attempts
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    client.models.generate_content,
                    model="gemini-2.5-flash",
                    contents=prompt,
                    config=genai_types.GenerateContentConfig(
                        max_output_tokens=65536,
                        temperature=0.7,
                        thinking_config=genai_types.ThinkingConfig(thinking_budget=0),
                    ),
                ),
                timeout=timeout,
            )
            text = response.text or ""
            print(f"[GEMINI] attempt={attempt} chars={len(text)}")
            return text
        except asyncio.TimeoutError:
            print(f"[GEMINI] Timeout ({timeout}s) attempt={attempt}")
            if attempt < 2:
                await asyncio.sleep(3)
                continue
            return f"<!-- Timeout: Gemini demorou mais de {int(timeout)}s -->"
        except Exception as e:
            print(f"[GEMINI] Error attempt={attempt}: {type(e).__name__}: {e}")
            if attempt < 2:
                await asyncio.sleep(5)
                continue
            return f"<!-- Error generating content: {e} -->"


def _strip_code_fences(html: str) -> str:
    """Remove markdown code fences if present."""
    html = html.strip()
    if html.startswith("```"):
        lines = html.split("\n")
        html = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])
    return html.strip()


from ._fix_html import validate_and_fix_html as _validate_and_fix_html


def make_tools(tenant_id: str, event_queue: asyncio.Queue = None) -> List:
    """
    Create tool functions bound to a specific tenant_id.
    Events emitted use the format the frontend expects:
      task_created   → { task: {...} }
      task_updated   → { taskId, status }
      artifact_created → { artifact: {...} }
      project_created  → { project: {...} }
    """

    async def fetch_stock_images(industry: str = "", keywords: str = "") -> str:
        """
        Fetch curated corporate stock image URLs for use in landing pages.
        Returns a JSON-like string with image URLs for hero, features, team sections.
        industry: the company sector (e.g. 'marketing', 'tecnologia', 'financas').
        keywords: additional search terms (e.g. 'business meeting, analytics').
        """
        tenant = await db.get_tenant(tenant_id)
        sector = industry or (tenant.get("industry", "") if tenant else "")
        curated = _get_images_for_sector(sector)
        # Try API if key available
        search_query = f"{keywords or sector} corporate business professional"
        api_images = await _fetch_unsplash_images(search_query, 6)
        images = api_images if api_images else curated
        avatars = _TESTIMONIAL_AVATARS
        result = (
            f"STOCK IMAGES AVAILABLE (use these URLs directly in <img> tags):\n"
            f"Hero/Banner images:\n"
            f"  hero_1: {images[0] if len(images) > 0 else ''}\n"
            f"  hero_2: {images[1] if len(images) > 1 else ''}\n"
            f"Section/Feature images:\n"
            f"  feat_1: {images[2] if len(images) > 2 else ''}\n"
            f"  feat_2: {images[3] if len(images) > 3 else ''}\n"
            f"  feat_3: {images[4] if len(images) > 4 else ''}\n"
            f"About/Team photo:\n"
            f"  team_photo: {images[5] if len(images) > 5 else images[0] if images else ''}\n"
            f"Testimonial avatars (real professional photos):\n"
            f"  avatar_1: {avatars[0]}\n"
            f"  avatar_2: {avatars[1]}\n"
            f"  avatar_3: {avatars[2]}\n"
            f"Source: {'Unsplash API' if api_images and _unsplash_key else 'Curated corporate library'}\n"
            f"IMPORTANT: Use these exact URLs in <img src='URL' /> tags — they work without any API key."
        )
        print(f"[TOOL] fetch_stock_images: sector={sector!r}, {len(images)} images, api={'yes' if api_images else 'no'}")
        return result

    async def create_task(title: str, description: str, assignee_name: str = "sarah") -> str:
        """
        Create a new task on the Kanban board (starts in BACKLOG).
        Use assignee_name: 'sarah' (PM), 'alex' (UX), 'bruno' (Frontend),
        'carla' (Backend), 'diego' (QA), 'elena' (DevOps).
        """
        print(f"[TOOL] create_task called: title={title!r}, assignee={assignee_name!r}")
        task = await db.create_task(
            tenant_id=tenant_id,
            title=title,
            description=description,
            assignee_id=assignee_name,
        )
        if event_queue:
            await event_queue.put({
                "event": "task_created",
                "data": {"task": task},
            })
        return f"✅ Task '{title}' criada no Kanban (ID: {task['id']})"

    async def update_task_status(task_id: str, new_status: str = "DEV") -> str:
        """
        Move a task to a new Kanban column.
        Always use new_status="DEV" when starting work, "DONE" when finished.
        Any value is accepted — it will be normalized automatically.
        """
        # Silently normalize any status variant — never return errors
        _map = {
            "IN_PROGRESS": "DEV", "IN-PROGRESS": "DEV", "INPROGRESS": "DEV",
            "DOING": "DEV", "STARTED": "DEV", "WORKING": "DEV", "DEVELOPMENT": "DEV",
            "IN_REVIEW": "REVIEW", "REVIEWING": "REVIEW",
            "TESTING": "QA", "TEST": "QA",
            "TODO": "BACKLOG", "PENDING": "BACKLOG", "NEW": "BACKLOG",
            "COMPLETE": "DONE", "COMPLETED": "DONE", "FINISHED": "DONE", "CLOSED": "DONE",
            "BACKLOG": "BACKLOG", "PLANNING": "PLANNING", "UX_DESIGN": "UX_DESIGN",
            "DEV": "DEV", "REVIEW": "REVIEW", "QA": "QA", "DONE": "DONE",
        }
        normalized = _map.get(new_status.upper().replace(" ", "_"), "DEV")
        print(f"[TOOL] update_task_status: {task_id!r} -> {new_status!r} -> {normalized!r}")
        await db.update_task_status(task_id=task_id, status=normalized)
        if event_queue:
            await event_queue.put({
                "event": "task_updated",
                "data": {"taskId": task_id, "status": normalized},
            })
        return f"✅ Task {task_id} → {normalized}"

    async def generate_artifact(
        title: str,
        language: str,
        code: str,
        artifact_type: str = "code",
        project_id: Optional[str] = None,
        filepath: Optional[str] = None,
    ) -> str:
        """
        Generate and save a code artifact (file, component, script, etc).
        language: e.g. 'typescript', 'python', 'html', 'css', 'json'.
        artifact_type: 'code', 'html', 'component'.
        project_id: associate with a project (required when possible).
        filepath: relative file path within the project.
        """
        # Always generate premium HTML via dedicated Gemini call — skip agent draft entirely
        if language.lower() == "html":
            memories = await db.get_memories(tenant_id=tenant_id)
            mem_str = "\n".join(f"• {m['key']}: {m['value']}" for m in memories) if memories else ""
            tenant = await db.get_tenant(tenant_id)
            company_info = ""
            if tenant:
                raw_desc = tenant.get('description', '') or ''
                short_desc = raw_desc[:600].rsplit(' ', 1)[0] + "..." if len(raw_desc) > 600 else raw_desc
                company_info = (
                    f"Empresa: {tenant.get('name','')}\n"
                    f"Setor: {tenant.get('industry','')}\n"
                    f"Descrição: {short_desc}\n"
                    f"Objetivos: {tenant.get('goals','')}\n"
                    f"Público-alvo: {tenant.get('target_audience','') or 'PMEs e empreendedores'}\n"
                    f"Tom da marca: {tenant.get('brand_tone','') or 'profissional e inovador'}\n"
                    f"Cores da marca: {tenant.get('brand_colors','') or 'a definir'}"
                )
            context_block = f"{company_info}\n\nMemórias adicionais:\n{mem_str}" if mem_str else company_info
            html_prompt = f"""Você é um dev frontend senior especializado em landing pages de conversão premium.

Contexto REAL da empresa (use esses dados — não invente outros):
{context_block}

Crie uma landing page COMPLETA, MODERNA e de ALTA QUALIDADE. Requisitos:

ESTRUTURA (todas as seções obrigatórias):
1. Navbar: logo + links de navegação + botão CTA destacado
2. Hero: fullscreen com gradiente dramático, headline impactante (font-size clamp(3rem,8vw,5rem)), subtítulo, 2 CTAs, elemento visual decorativo (shapes SVG ou grid animado)
3. Features: 6 cards glassmorphism com ícone SVG inline, título e descrição
4. Social Proof: 3 métricas numéricas grandes + 3 depoimentos com avatar inicial e estrelas
5. CTA Final: background com gradiente contrastante + headline + formulário simples (nome, email) ou botão grande pulsante
6. Footer: 3 colunas de links + redes sociais + copyright

CSS (inline no <style>, mínimo 200 linhas):
- @import Google Fonts: Inter ou Poppins
- :root com variáveis de cor (primary #6366f1, secondary #8b5cf6, accent #ec4899, bg #0a0a0f)
- @keyframes: fadeInUp, float, glow, pulse
- Glassmorphism: backdrop-filter blur(20px), background rgba(255,255,255,0.05), border rgba(255,255,255,0.1)
- Hover effects: transform translateY(-8px) + box-shadow elevation
- Gradientes em: hero background, botões, texto destacado (background-clip: text)
- Responsivo: media query max-width 768px com layout single column

REGRAS ABSOLUTAS:
- CSS SEMPRE inline no <style> — ZERO <link> externos
- ZERO Lorem Ipsum — use dados reais da empresa das memórias acima
- Mínimo 500 linhas totais
- Retorne APENAS o HTML puro começando com <!DOCTYPE html>
"""
            print(f"[TOOL] Generating premium HTML via Gemini...")
            generated = await _gemini_generate(html_prompt)
            generated = generated.strip()
            if generated.startswith("```"):
                parts = generated.split("\n")
                generated = "\n".join(parts[1:-1] if parts[-1].strip() == "```" else parts[1:])
            if "<!DOCTYPE" in generated or "<html" in generated:
                code = generated
            print(f"[TOOL] HTML generated: {len(code.splitlines())} lines")

        artifact = await db.create_artifact(
            tenant_id=tenant_id,
            title=title,
            language=language,
            code=code,
            artifact_type=artifact_type,
            project_id=project_id,
            filepath=filepath,
        )
        if event_queue:
            await event_queue.put({
                "event": "artifact_created",
                "data": {"artifact": {
                    "id": artifact["id"],
                    "title": artifact["title"],
                    "language": artifact["language"],
                    "type": artifact["type"],
                    "timestamp": artifact["timestamp"],
                    "projectId": project_id,
                    "filepath": filepath,
                    "code": code,
                }},
            })
        return f"✅ Artefato '{title}' gerado (ID: {artifact['id']}, linguagem: {language})"

    async def create_project(
        name: str,
        description: str,
        project_type: str = "web",
        stack: str = "React + FastAPI",
    ) -> str:
        """
        Create a new project in the system.
        project_type: 'web', 'api', 'mobile', 'fullstack'.
        stack: e.g. 'React + FastAPI', 'Next.js', 'Vue + Node'.
        Returns the project_id — use it when calling generate_artifact.
        """
        project = await db.create_project(
            tenant_id=tenant_id,
            name=name,
            description=description,
            project_type=project_type,
            stack=stack,
        )
        if event_queue:
            await event_queue.put({
                "event": "project_created",
                "data": {"project": {
                    "id": project["id"],
                    "name": project["name"],
                    "description": project["description"],
                    "type": project["type"],
                    "stack": project["stack"],
                    "status": project["status"],
                    "createdAt": project["createdAt"],
                }},
            })
        return f"✅ Projeto '{name}' criado (ID: {project['id']}). Use este ID ao chamar generate_artifact."

    async def save_memory(key: str, value: str) -> str:
        """
        Save important information to persistent memory for future conversations.
        Use for: company info, preferences, decisions, context that should be remembered.
        key: short descriptive name (e.g. 'empresa', 'stack_preferido', 'cores_marca').
        value: the information to remember.
        """
        await db.save_memory(tenant_id=tenant_id, key=key, value=value)
        return f"✅ Memorizado — {key}: {value}"

    async def get_memories() -> str:
        """
        Retrieve all saved memories for this workspace.
        Call this at the start of conversations to recall context.
        """
        memories = await db.get_memories(tenant_id=tenant_id)
        if not memories:
            return "Nenhuma memória salva ainda."
        lines = [f"• {m['key']}: {m['value']}" for m in memories]
        return "📚 Memórias do workspace:\n" + "\n".join(lines)

    async def generate_landing_page(
        project_id: str,
        company_name: str,
        product_description: str,
        target_audience: str = "empresas e profissionais",
        style: str = "dark premium com gradientes vibrantes",
        goal: str = "captação de leads",
        design_system: str = "",
    ) -> str:
        """
        Generate a PREMIUM, complete landing page HTML (500+ lines) using AI.
        Use this instead of generate_artifact for landing pages — produces much higher quality output.
        project_id: the project ID from create_project.
        company_name: name of the company.
        product_description: what the product/service does.
        target_audience: who the LP is for.
        style: visual style (e.g. 'dark premium glassmorphism', 'light minimal', 'bold colorful').
        goal: main goal of the LP (e.g. 'captação de leads', 'vendas', 'branding').
        design_system: colors/fonts/style from Alex's design decisions.
        """
        print(f"[TOOL] generate_landing_page: project_id={project_id!r}, company={company_name!r}")

        # Enrich with tenant data from DB (real company context from onboarding)
        memories = await db.get_memories(tenant_id=tenant_id)
        mem_str = "\n".join(f"• {m['key']}: {m['value']}" for m in memories) if memories else ""
        tenant = await db.get_tenant(tenant_id)
        company_info = ""
        logo_url = ""
        if tenant:
            # Use tenant data to override/enrich parameters if they seem generic
            real_name = tenant.get('name', '') or company_name
            # Trim description — DB may have huge HTML blob from website scraping
            raw_desc = tenant.get('description', '') or ''
            short_desc = raw_desc[:600].rsplit(' ', 1)[0] + "..." if len(raw_desc) > 600 else raw_desc
            real_desc = short_desc or product_description
            real_audience = tenant.get('target_audience', '') or target_audience or "PMEs e empreendedores"
            real_tone = tenant.get('brand_tone', '') or "profissional, inovador e orientado a resultados"
            real_colors = tenant.get('brand_colors', '') or ""
            real_goals = tenant.get('goals', '') or ""
            logo_url = tenant.get('logo_url', '') or ""
            website_url = tenant.get('website_url', '') or ""
            company_info = (
                f"Empresa: {real_name}\n"
                f"Setor: {tenant.get('industry','')}\n"
                f"Descrição: {real_desc}\n"
                f"Objetivos: {real_goals}\n"
                f"Público-alvo: {real_audience}\n"
                f"Tom da marca: {real_tone}\n"
                f"Cores da marca: {real_colors}\n"
                f"Logo URL: {logo_url or 'não disponível'}\n"
                f"Site: {website_url or 'não disponível'}"
            )
            company_name = real_name
            product_description = real_desc or product_description
            target_audience = real_audience or target_audience
        context_block = (company_info + "\n\nMemórias adicionais:\n" + mem_str) if mem_str else company_info

        # Extract primary color from design system for shadow/glow effects
        ds = design_system or ""
        import re as _re
        primary_hex = _re.search(r'primary[=:]\s*(#[0-9a-fA-F]{6})', ds)
        primary_color = primary_hex.group(1) if primary_hex else "#6C2BD9"

        # Get stock images for this sector
        sector = (tenant.get("industry", "") if tenant else "") or ""
        curated_imgs = _get_images_for_sector(sector)
        api_imgs = await _fetch_unsplash_images(f"{sector} corporate business professional B2B", 8)
        imgs = api_imgs if api_imgs else curated_imgs
        avatars = _TESTIMONIAL_AVATARS

        # Pad lists to avoid index errors
        while len(imgs) < 8:
            imgs += curated_imgs or [_CORPORATE_IMAGES["default"][0]]

        # Detect style personality from design system / sector
        ds_lower = ds.lower()
        if any(w in ds_lower for w in ["light", "branco", "clean", "minimal"]):
            style_personality = "light"
        elif any(w in ds_lower for w in ["bold", "colorful", "vibrante", "colorido"]):
            style_personality = "bold"
        else:
            style_personality = "dark"

        # Secondary color derived from design system or fallback
        secondary_hex = _re.search(r'secondary[=:]\s*(#[0-9a-fA-F]{6})', ds)
        secondary_color = secondary_hex.group(1) if secondary_hex else "#EC4899"

        # Font from design system or fallback by style
        font_match = _re.search(r'font[=:]\s*([A-Za-z\s+]+?)(?:;|$)', ds)
        font_name = font_match.group(1).strip() if font_match else ("Inter" if style_personality == "dark" else "Plus Jakarta Sans")
        font_import = f"https://fonts.googleapis.com/css2?family={font_name.replace(' ', '+')}:wght@300;400;500;600;700;800;900&display=swap"

        # Style-specific background/surface/text tokens
        if style_personality == "light":
            bg_color = "#fafafa"
            surface_color = "#ffffff"
            border_color = "rgba(0,0,0,0.08)"
            text_color = "#0f0f0f"
            text_muted = "rgba(15,15,15,0.5)"
            navbar_bg = "rgba(250,250,250,0.85)"
            hero_overlay = f"linear-gradient(135deg, rgba(255,255,255,0.92) 0%, color-mix(in srgb, {primary_color} 12%, rgba(255,255,255,0.80)) 60%, rgba(255,255,255,0.70) 100%)"
            hero_text_color = "#0f0f0f"
            card_bg = "#ffffff"
        elif style_personality == "bold":
            bg_color = "#0d0d1a"
            surface_color = "rgba(255,255,255,0.04)"
            border_color = "rgba(255,255,255,0.1)"
            text_color = "#ffffff"
            text_muted = "rgba(255,255,255,0.55)"
            navbar_bg = "rgba(13,13,26,0.80)"
            hero_overlay = f"linear-gradient(135deg, rgba(13,13,26,0.75) 0%, color-mix(in srgb, {primary_color} 35%, rgba(13,13,26,0.60)) 50%, rgba(13,13,26,0.55) 100%)"
            hero_text_color = "#ffffff"
            card_bg = "rgba(255,255,255,0.04)"
        else:  # dark
            bg_color = "#07070e"
            surface_color = "rgba(255,255,255,0.03)"
            border_color = "rgba(255,255,255,0.07)"
            text_color = "#f0f0f8"
            text_muted = "rgba(240,240,248,0.5)"
            navbar_bg = "rgba(7,7,14,0.75)"
            hero_overlay = f"linear-gradient(135deg, rgba(7,7,14,0.90) 0%, color-mix(in srgb, {primary_color} 22%, rgba(7,7,14,0.78)) 50%, rgba(7,7,14,0.72) 100%)"
            hero_text_color = "#ffffff"
            card_bg = "rgba(255,255,255,0.03)"

        logo_tag = f'<img src="{logo_url}" alt="{company_name}" style="height:38px;object-fit:contain">' if logo_url else f'<span class="brand-name">{company_name}</span>'

        prompt = f"""You are a world-class creative frontend developer. Your task: produce a UNIQUE, STUNNING, CONVERSION-OPTIMIZED B2B landing page — single self-contained HTML file.

━━━ BRAND CONTEXT ━━━
{context_block}

GOAL: {goal}
VISUAL STYLE DIRECTION: {style}
DESIGN SYSTEM (from UX designer): {ds or f"dark premium, primary {primary_color}, Inter font, glassmorphism"}
STYLE PERSONALITY: {style_personality}  ← drives overall color scheme
PRIMARY COLOR: {primary_color}
SECONDARY / ACCENT: {secondary_color}
FONT: {font_name} (import from Google Fonts)

━━━ DESIGN INSPIRATION — study these, do NOT copy, CREATE something unique in the same league ━━━
• Stripe.com — crisp typography, subtle gradients, floating UI mockups, precise grid
• Linear.app — dark minimal, sharp contrast, animated noise texture backgrounds
• Framer.com — bold hero text with gradient words, layered depth, motion-forward
• Vercel.com — monochrome base + one accent pop, generous whitespace, clean serif+sans pairing
• Notion.so — approachable, illustrated sections, social proof done simply and powerfully

WHAT MAKES THESE SITES PREMIUM:
1. Typography as design element — huge display headlines (clamp 3rem → 6rem), tight line-height (1.0–1.1), mixed weights
2. Gradient text on key words in headlines (`background-clip: text`)
3. Subtle ambient glow blobs behind sections (radial-gradient absolutely positioned, low opacity, blurred)
4. Card borders that glow on hover using box-shadow with the brand color
5. Stats section with HUGE numbers (font-size 4–5rem) that feel visceral
6. Asymmetric layouts — not everything centered, alternate left/right sections
7. Noise/grain texture overlay on dark backgrounds (CSS SVG filter)
8. Scroll-triggered fade-in animations (IntersectionObserver)
9. Marquee / infinite scroll for client logos
10. Micro-interactions on buttons (scale + shadow on hover)

━━━ STOCK IMAGES — EXACT PLACEMENT ━━━
HERO background (CSS only — NEVER a raw <img>):
  <section class="hero" style="background-image:url('{imgs[0]}')">
  The .hero::before pseudo-element creates the overlay — include it in CSS.

ABOUT section decorative photo (right column, no text on top):
  <div class="about-photo" style="background-image:url('{imgs[2]}')" aria-hidden="true"></div>
  CSS: .about-photo {{ width:100%; height:480px; min-height:300px; border-radius:1.5rem; background-size:cover; background-position:center; background-color:#1a1a2e; }}

CASE STUDY / RESULTS section visual:
  <div class="case-visual" style="background-image:url('{imgs[5]}')" aria-hidden="true"></div>
  CSS: .case-visual {{ width:100%; height:360px; min-height:200px; border-radius:1.5rem; background-size:cover; background-position:center; background-color:#1a1a2e; }}

TESTIMONIAL AVATARS (circular img — these are REAL people photos, use them):
  <img src="{avatars[0]}" alt="Cliente" class="avatar">
  <img src="{avatars[1]}" alt="Cliente" class="avatar">
  <img src="{avatars[2]}" alt="Cliente" class="avatar">
  CSS: .avatar {{ width:48px; height:48px; border-radius:50%; object-fit:cover; flex-shrink:0; border:2px solid {primary_color}; }}

LOGO: {logo_tag}  ← use in navbar + footer only. Max height 40px.

RULE: ONLY the 3 background-image divs + 3 avatar <img> + 1 logo = 7 image elements. Zero placeholder.com / picsum.

━━━ SECTIONS (build ALL of these — use creative layouts, NOT identical grids) ━━━

1. NAVBAR
   Fixed, glass blur, logo left, nav links center/right, CTA button far right, hamburger for mobile.
   JS: id="hamburger" toggles id="navLinks" .open class. Scroll > 50px increases background opacity.

2. HERO — full viewport, photo background + overlay
   Mandatory HTML: <section class="hero" style="background-image:url('{imgs[0]}')">
   Mandatory CSS for .hero:
     min-height:100vh; display:flex; align-items:center; justify-content:center;
     padding: calc(72px + 4rem) 2rem 5rem;   ← THIS IS CRITICAL — prevents content hiding behind fixed navbar
     background-size:cover; background-position:center; background-color:{bg_color};
     position:relative; overflow:hidden;
   .hero::before (overlay — include this, no extra divs):
     content:''; position:absolute; inset:0; z-index:0; background:{hero_overlay};
   .hero > * {{ position:relative; z-index:1; }}
   Layout: centered content column, max-width 820px
   - Eyebrow pill label above h1 (e.g. "✦ Solução B2B" or "✦ Novo em 2025")
   - h1: clamp(2.8rem, 6vw, 5.5rem), font-weight 900, 1–2 lines, key words with gradient text
   - Subheadline: clamp(1rem, 2vw, 1.2rem), 60% opacity, max 2 sentences
   - 2 buttons: flex row, flex-wrap:wrap, gap:1rem (stacks on mobile)
   - Trust row: 3–4 pill badges

3. LOGO BAR (social proof)
   Infinite marquee animation — CSS @keyframes scroll — 6–8 company names as SVG text logos.
   Style: grayscale, on hover full color. Section bg: slightly lighter than hero.

4. ABOUT / WHY US
   Asymmetric 2-col: photo div LEFT (about-photo), text RIGHT — or swap if that looks better for the brand.
   Right col: h2, 3–4 bullet items each with SVG check icon, one highlighted metric box.
   Do NOT put text on top of the photo.

5. SERVICES / FEATURES
   3-col card grid (2-col on tablet, 1-col mobile).
   Each card: gradient icon box (52×52px, border-radius 14px) + meaningful SVG icon + title + body text.
   Card style: glass border, hover lifts + border glows with brand color.
   NO photos inside cards — SVG icons only.

6. RESULTS / METRICS
   Dark/contrast section (invert bg vs main).
   4 giant stat items: number (font-size 3.5–4.5rem, gradient text) + label.
   Below: one testimonial highlight card with avatar + quote.

7. TESTIMONIALS
   3 cards, staggered layout or horizontal scroll on mobile.
   Each: 5 stars (SVG) + quote + avatar (circular img from above) + name + title + company.
   Quotes should feel specific: results, percentages, time frames.

8. CTA / LEAD FORM
   High-contrast full-width section.
   Left side: strong headline + 3 bullet benefits + trust signals.
   Right side: form — name, email, phone, empresa, select (como nos encontrou?) + submit button.
   Form MUST have id="leadForm". ALL inputs have name attribute.
   Below form: "🔒 Seus dados estão seguros. Sem spam."

9. FAQ
   4–6 questions in accordion (JS toggle). Questions address real B2B objections.
   Clean expand/collapse animation.

10. FOOTER
    3-col: logo + tagline + social icons | nav links | contact (CNPJ placeholder, address, email, phone).

━━━ CSS REQUIREMENTS (design these yourself — do NOT copy a generic template) ━━━
Use these tokens but CREATE unique styles around them:

  --bg: {bg_color}
  --surface: {surface_color}
  --border: {border_color}
  --text: {text_color}
  --text-muted: {text_muted}
  --primary: {primary_color}
  --secondary: {secondary_color}
  --radius: 1.25rem
  --radius-sm: 0.75rem
  --radius-pill: 50px
  Font: '{font_name}', imported from Google Fonts

Navbar:
  position:fixed; backdrop-filter:blur(20px); background:{navbar_bg};
  padding:0.875rem 2rem; border-bottom:1px solid var(--border);

Hero overlay (::before pseudo-element):
  background: {hero_overlay};
  z-index:0; position:absolute; inset:0;
  Hero children: position:relative; z-index:1;
  Hero text color: {hero_text_color}

Cards: background:{card_bg}; border:1px solid var(--border); border-radius:var(--radius);
  On hover: box-shadow:0 0 0 1px {primary_color}44, 0 20px 60px {primary_color}22; transform:translateY(-6px);

Ambient glow blobs (optional but premium):
  position:absolute; border-radius:50%; filter:blur(120px); opacity:0.12; pointer-events:none; z-index:0;
  Example: <div style="position:absolute;width:600px;height:600px;background:{primary_color};border-radius:50%;filter:blur(140px);opacity:0.08;top:-200px;left:-100px;pointer-events:none;z-index:0"></div>

Gradient text on headlines:
  background: linear-gradient(135deg, {primary_color}, {secondary_color});
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;

Stat numbers:
  font-size: clamp(3rem, 6vw, 4.5rem); font-weight:900;
  Apply gradient text effect.

━━━ JAVASCRIPT (embed in <script> before </body>) ━━━
Include ALL of these — production-ready, no placeholders:

1. Navbar hamburger (id="hamburger" toggles id="navLinks" .open):
const hamburger=document.getElementById('hamburger');
const navLinks=document.getElementById('navLinks');
if(hamburger){{hamburger.addEventListener('click',()=>{{navLinks.classList.toggle('open');hamburger.innerHTML=navLinks.classList.contains('open')?'✕':'☰';}});}}
navLinks?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{{navLinks.classList.remove('open');if(hamburger)hamburger.innerHTML='☰';}}));

2. Navbar scroll opacity:
window.addEventListener('scroll',()=>{{const nb=document.querySelector('.navbar');if(nb)nb.style.background=window.scrollY>60?'{navbar_bg.replace("0.75","0.97")}':'{navbar_bg}';}});

3. IntersectionObserver fade-in:
const io=new IntersectionObserver((entries)=>entries.forEach(e=>{{if(e.isIntersecting){{e.target.style.opacity='1';e.target.style.transform='translateY(0)';}}}}),{{threshold:0.12}});
document.querySelectorAll('.fade-in').forEach(el=>{{el.style.opacity='0';el.style.transform='translateY(28px)';el.style.transition='opacity 0.65s ease, transform 0.65s ease';io.observe(el);}});

4. Counter animation (for stat numbers):
function animateCount(el){{const target=parseFloat(el.dataset.target||el.textContent);const prefix=el.dataset.prefix||'';const suffix=el.dataset.suffix||'';const dur=1800;const start=performance.now();const from=0;requestAnimationFrame(function tick(now){{const p=Math.min((now-start)/dur,1);const ease=1-Math.pow(1-p,3);const val=from+(target-from)*ease;el.textContent=prefix+(Number.isInteger(target)?Math.round(val):val.toFixed(1))+suffix;if(p<1)requestAnimationFrame(tick);}});}}
const cio=new IntersectionObserver((entries)=>entries.forEach(e=>{{if(e.isIntersecting){{animateCount(e.target);cio.unobserve(e.target);}}}});
document.querySelectorAll('[data-target]').forEach(el=>cio.observe(el));

5. FAQ accordion:
document.querySelectorAll('.faq-item').forEach(item=>{{const q=item.querySelector('.faq-q');const a=item.querySelector('.faq-a');if(q&&a){{a.style.maxHeight='0';a.style.overflow='hidden';a.style.transition='max-height 0.35s ease';q.addEventListener('click',()=>{{const open=item.classList.toggle('open');a.style.maxHeight=open?a.scrollHeight+'px':'0';document.querySelectorAll('.faq-item').forEach(other=>{{if(other!==item){{other.classList.remove('open');const oa=other.querySelector('.faq-a');if(oa)oa.style.maxHeight='0';}}}});}})}}}});

6. Lead form — submits to project API:
const leadForm=document.getElementById('leadForm');
if(leadForm){{leadForm.addEventListener('submit',async(e)=>{{e.preventDefault();const btn=leadForm.querySelector('button[type=submit]');const orig=btn.textContent;btn.textContent='Enviando...';btn.disabled=true;const data={{}};leadForm.querySelectorAll('input,select,textarea').forEach(el=>{{if(el.name)data[el.name]=el.value;}});try{{const res=await fetch('/p/{project_id}/api/leads',{{method:'POST',headers:{{'Content-Type':'application/json'}},body:JSON.stringify({{name:data.name||data.nome||'',email:data.email||'',phone:data.phone||data.telefone||data.tel||'',company:data.company||data.empresa||'',source:data.source||data.origem||'',message:data.message||data.mensagem||''}})}}); if(res.ok){{btn.textContent='✓ Enviado! Entraremos em contato.';btn.style.background='linear-gradient(135deg,#059669,#10b981)';leadForm.querySelectorAll('input:not([type=submit]),textarea').forEach(i=>i.value='');setTimeout(()=>{{btn.textContent=orig;btn.disabled=false;btn.style.background='';}},5000);}}else{{throw new Error();}}}}catch{{btn.textContent='Erro — tente novamente';btn.style.background='linear-gradient(135deg,#dc2626,#ef4444)';setTimeout(()=>{{btn.textContent=orig;btn.disabled=false;btn.style.background='';}},3000);}}}})}}

7. Smooth scroll:
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',(e)=>{{e.preventDefault();document.querySelector(a.getAttribute('href'))?.scrollIntoView({{behavior:'smooth'}})}}));

━━━ HARD RULES — EACH ONE IS MANDATORY, ZERO EXCEPTIONS ━━━

── NAVBAR OVERLAP FIX (most common bug) ──
1. The navbar is position:fixed and 72px tall. To prevent content hiding behind it:
   • Hero section: padding-top MUST be at least calc(72px + 4rem). Example:
     .hero {{ min-height:100vh; padding: calc(72px + 4rem) 2rem 5rem; }}
   • Every other first-content-section: padding-top: calc(72px + 3rem)
   • NEVER set the first section to padding-top less than 90px
   • Add to body: {{ scroll-padding-top: 80px; }} for anchor links

── IMAGE DISPLAY (empty image = broken layout) ──
2. Every background-image div MUST have explicit height AND background-color fallback:
   • .about-photo: height:480px; min-height:280px; background-color:#1a1a2e; background-size:cover; background-position:center;
   • .case-visual: height:360px; min-height:200px; background-color:#1a1a2e; background-size:cover; background-position:center;
   • .hero: min-height:100vh; background-size:cover; background-position:center; background-color:#07070e;
   • NEVER use aspect-ratio alone without a fixed height fallback — it collapses on some browsers
   • background-color is the fallback when image fails to load — always include it

── RESPONSIVENESS (test every section at 375px, 768px, 1280px) ──
3. Mandatory breakpoints — include ALL in your CSS:
   @media (max-width: 1024px) — tablet: reduce font sizes, adjust grid gaps
   @media (max-width: 768px)  — mobile: ALL grids → 1 column, hero text smaller
   @media (max-width: 480px)  — small mobile: extra font-size reduction, no flex wrapping issues
4. .grid-2 and .grid-3: MUST use grid-template-columns:1fr at max-width:768px
5. Hero buttons (.hero-btns): flex-wrap:wrap; gap:0.75rem; at mobile they stack vertically
6. Navbar on mobile: hamburger shows, nav links hide (display:none → display:flex on .open)
7. Font sizes: use clamp() for ALL headlines — never fixed px for h1/h2
8. Images on mobile: .about-photo and .case-visual height:280px at max-width:768px

── OTHER RULES ──
9.  Hero photo: ALWAYS background-image on section element, NEVER raw <img> behind text
10. .hero::before creates overlay — ZERO extra overlay divs, ZERO extra dark layers
11. Feature cards: SVG icons ONLY — no photos inside cards
12. Buttons: display:inline-flex — never display:block inside a flex row
13. id="hamburger", id="navLinks", id="leadForm" — all three REQUIRED
14. ALL CSS in <style> tag — only Google Fonts @import allowed as external resource
15. Apply class="fade-in" to cards, stat items, testimonials, section headings
16. Add data-target="NUMBER" to each stat number element (for counter animation)
17. ZERO placeholder.com / picsum.photos / invented image URLs
18. Minimum 800 lines. Return ONLY complete HTML from <!DOCTYPE html> — zero markdown
"""

        html_code = await _gemini_generate(prompt, timeout=360.0)
        html_code = _strip_code_fences(html_code)

        # Guard: if generation failed/timed-out, return error without saving broken artifact
        if html_code.startswith("<!--") or len(html_code) < 5000:
            err = html_code[:200] if html_code.startswith("<!--") else f"HTML muito curto ({len(html_code)} chars)"
            print(f"[LP] Generation failed: {err}")
            return f"❌ Falha ao gerar landing page: {err}. Tente novamente."

        # Post-generation validation + auto-fix (catches most common failure patterns)
        html_code = _validate_and_fix_html(
            html=html_code,
            primary_color=primary_color,
            project_id=project_id,
            imgs=imgs,
            avatars=avatars,
        )

        artifact = await db.create_artifact(
            tenant_id=tenant_id,
            title="index.html",
            language="html",
            code=html_code,
            artifact_type="html",
            project_id=project_id,
            filepath="index.html",
        )

        if event_queue:
            await event_queue.put({
                "event": "artifact_created",
                "data": {"artifact": {
                    "id": artifact["id"],
                    "title": "index.html",
                    "language": "html",
                    "type": "html",
                    "timestamp": artifact["timestamp"],
                    "projectId": project_id,
                    "filepath": "index.html",
                    "code": html_code,
                }},
            })

        lines_count = len(html_code.split("\n"))
        return f"✅ Landing page premium gerada! {lines_count} linhas de HTML. Artifact ID: {artifact['id']}. Disponível na aba Projetos."

    async def analyze_website(url: str = "") -> str:
        """
        Scrape the company website to extract brand identity: logo, colors, description, fonts.
        Call this at the start of any creation pipeline when website_url is available.
        Returns a summary of brand assets found that should be used in content creation.
        """
        # If no URL provided, try to get from tenant data
        if not url:
            tenant = await db.get_tenant(tenant_id)
            if tenant:
                url = tenant.get("website_url", "") or ""
        if not url:
            return "Nenhuma URL de site disponível. Pule esta etapa."

        print(f"[TOOL] analyze_website: scraping {url!r}")
        try:
            import httpx
            from bs4 import BeautifulSoup
            import re

            headers = {
                "User-Agent": "Mozilla/5.0 (compatible; IdealOS-Bot/1.0)"
            }
            async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
                resp = await client.get(url, headers=headers)
            html = resp.text
            soup = BeautifulSoup(html, "lxml")

            # ── Extract meta info ──────────────────────────────────────────
            title = soup.find("title")
            title_text = title.get_text(strip=True) if title else ""

            description = ""
            for sel in [
                soup.find("meta", attrs={"name": "description"}),
                soup.find("meta", attrs={"property": "og:description"}),
            ]:
                if sel and sel.get("content"):
                    description = sel["content"]
                    break

            og_image = ""
            og_img_tag = soup.find("meta", attrs={"property": "og:image"})
            if og_img_tag and og_img_tag.get("content"):
                og_image = og_img_tag["content"]

            # ── Find logo ─────────────────────────────────────────────────
            logo_url = ""
            # Priority 1: og:image
            if og_image:
                logo_url = og_image
            # Priority 2: img with "logo" in class/id/alt/src
            if not logo_url:
                for img in soup.find_all("img"):
                    src = img.get("src", "")
                    alt = img.get("alt", "").lower()
                    cls = " ".join(img.get("class", [])).lower()
                    img_id = img.get("id", "").lower()
                    if "logo" in (src + alt + cls + img_id).lower():
                        logo_url = src
                        break
            # Make absolute URL if relative
            if logo_url and logo_url.startswith("/"):
                from urllib.parse import urlparse
                parsed = urlparse(url)
                logo_url = f"{parsed.scheme}://{parsed.netloc}{logo_url}"

            # ── Extract colors from CSS ────────────────────────────────────
            colors = []
            # Look for CSS custom properties (--primary, --color-*, etc.)
            css_text = " ".join(str(s) for s in soup.find_all("style"))
            color_vars = re.findall(r'--[\w-]*color[\w-]*\s*:\s*(#[0-9a-fA-F]{3,8}|rgb[^;]+)', css_text)
            colors.extend(color_vars[:5])
            # Also look for common hex patterns in style attributes
            hex_colors = re.findall(r'#[0-9a-fA-F]{6}\b', css_text)
            # Count frequency and take top 3 most repeated (likely brand colors)
            from collections import Counter
            top_colors = [c for c, _ in Counter(hex_colors).most_common(5) if c.lower() not in ('#ffffff', '#000000', '#fff', '#000')]
            colors.extend(top_colors[:3])
            colors = list(dict.fromkeys(colors))[:5]  # deduplicate, keep order

            # ── Extract tagline / hero text ────────────────────────────────
            hero_text = ""
            for tag in ["h1", "h2"]:
                h = soup.find(tag)
                if h:
                    hero_text = h.get_text(strip=True)[:200]
                    break

            # ── Save to tenant DB and memory ──────────────────────────────
            tenant = await db.get_tenant(tenant_id)
            updates: dict = {}
            if logo_url and not (tenant or {}).get("logo_url"):
                updates["logo_url"] = logo_url
            if colors and not (tenant or {}).get("brand_colors"):
                updates["brand_colors"] = ", ".join(colors)
            if description and not (tenant or {}).get("description"):
                updates["description"] = description[:600]
            if updates:
                await db.update_tenant(tenant_id, **updates)

            # Save to agent memory for use in content creation
            brand_summary = (
                f"Site analisado: {url}\n"
                f"Título: {title_text}\n"
                f"Descrição: {description[:300] if description else 'N/A'}\n"
                f"Logo URL: {logo_url or 'não encontrada'}\n"
                f"Cores identificadas: {', '.join(colors) if colors else 'não identificadas'}\n"
                f"Headline principal: {hero_text or 'N/A'}"
            )
            await db.save_memory(tenant_id=tenant_id, key="brand_identity", value=brand_summary)

            result = f"✅ Site analisado com sucesso!\n{brand_summary}"
            print(f"[TOOL] analyze_website: {len(colors)} colors found, logo={'yes' if logo_url else 'no'}")
            return result

        except Exception as e:
            print(f"[TOOL] analyze_website error: {e}")
            return f"Não foi possível analisar o site ({e}). Continue sem dados do site."

    async def get_latest_artifact(language: str = "html") -> str:
        """
        Retrieve the most recent artifact for this workspace.
        Use language='html' to get the latest landing page.
        Returns metadata + structural preview (first 3000 chars) to avoid context overflow.
        For QA: use this to validate structure, IDs, responsiveness markers.
        For editing: edit_landing_page() handles full code retrieval internally.
        """
        artifacts = await db.get_artifacts(tenant_id=tenant_id)
        if not artifacts:
            return "Nenhum artefato encontrado no workspace."
        filtered = [a for a in artifacts if a.get("language", "").lower() == language.lower()]
        if not filtered:
            filtered = artifacts
        # Skip broken stubs (timeout errors, empty files, tiny snippets)
        real = [a for a in filtered if len(a.get("code", "")) > 5000 and not a.get("code", "").startswith("<!--")]
        if real:
            filtered = real
        filtered.sort(key=lambda a: a.get("timestamp", 0), reverse=True)
        latest = filtered[0]
        code = latest.get("code", "")
        total_chars = len(code)
        total_lines = code.count('\n') + 1
        # Structural checks (don't need full HTML)
        has_form = '<form' in code
        has_hamburger = 'id="hamburger"' in code or "id='hamburger'" in code
        has_nav_links = 'id="navLinks"' in code or "id='navLinks'" in code
        has_lead_form = 'id="leadForm"' in code or "id='leadForm'" in code
        has_media_query = '@media' in code
        has_mobile_breakpoint = '768px' in code
        has_whatsapp = 'whatsapp' in code.lower() or 'wa.me' in code.lower()
        has_cta = 'cta' in code.lower() or 'btn' in code.lower() or '<button' in code.lower()
        # Preview: first 3000 chars is enough for structural QA
        preview = code[:3000] + f"\n\n[... +{total_chars - 3000} chars restantes ...]" if total_chars > 3000 else code
        print(f"[TOOL] get_latest_artifact: '{latest.get('title')}' {total_chars} chars, {total_lines} lines")
        return (
            f"=== ARTEFATO: {latest.get('title')} (ID: {latest.get('id')}) ===\n"
            f"Tamanho: {total_chars} chars | {total_lines} linhas\n"
            f"Checks estruturais:\n"
            f"  - Formulário: {'✅' if has_form else '❌'}\n"
            f"  - id=hamburger: {'✅' if has_hamburger else '❌'}\n"
            f"  - id=navLinks: {'✅' if has_nav_links else '❌'}\n"
            f"  - id=leadForm: {'✅' if has_lead_form else '❌'}\n"
            f"  - @media query: {'✅' if has_media_query else '❌'}\n"
            f"  - Breakpoint 768px: {'✅' if has_mobile_breakpoint else '❌'}\n"
            f"  - CTA button: {'✅' if has_cta else '❌'}\n"
            f"  - WhatsApp: {'✅' if has_whatsapp else '❌'}\n\n"
            f"Preview (primeiros 3000 chars):\n{preview}"
        )

    async def edit_landing_page(fix_instructions: str, project_id: str = "") -> str:
        """
        Edit the existing landing page based on user feedback.
        Fetches the latest HTML artifact, applies the requested changes, and saves updated version.
        fix_instructions: describe exactly what to change (e.g. 'fix hamburger menu button', 'change primary color to blue').
        """
        print(f"[TOOL] edit_landing_page: fix={fix_instructions!r}")

        # Create a Kanban task for this edit
        edit_task = await db.create_task(
            tenant_id=tenant_id,
            title=f"Corrigir LP: {fix_instructions[:60]}",
            description=fix_instructions,
            assignee_id="bruno",
        )
        edit_task_id = edit_task["id"]
        if event_queue:
            await event_queue.put({
                "event": "task_created",
                "data": {"task": edit_task},
            })
            await event_queue.put({
                "event": "task_updated",
                "data": {"taskId": edit_task_id, "status": "DEV"},
            })
        await db.update_task_status(task_id=edit_task_id, status="DEV")

        # Get the latest HTML artifact — prefer the one from the specified project
        artifacts = await db.get_artifacts(tenant_id=tenant_id)
        # Only consider real HTML files (not timeout stubs or tiny snippets)
        html_artifacts = [
            a for a in artifacts
            if a.get("language", "").lower() == "html" and len(a.get("code", "")) > 5000
        ]
        if not html_artifacts:
            return "Nenhuma landing page encontrada para editar. Crie uma primeiro."
        # Filter by project_id when provided so we edit the right LP
        if project_id:
            project_html = [a for a in html_artifacts if a.get("projectId") == project_id]
            if project_html:
                html_artifacts = project_html
        html_artifacts.sort(key=lambda a: a.get("timestamp", 0), reverse=True)
        latest = html_artifacts[0]
        existing_code = latest.get("code", "")
        pid = project_id or latest.get("projectId", "")

        # Get company context
        tenant = await db.get_tenant(tenant_id)
        company_name = tenant.get("name", "Empresa") if tenant else "Empresa"

        prompt = f"""You are a world-class frontend developer fixing a landing page.

TASK: Apply the following changes to the existing HTML:
"{fix_instructions}"

EXISTING HTML (edit this — preserve everything not mentioned in the fix):
{existing_code}

RULES:
1. Apply ONLY the requested changes — do NOT restructure or redesign sections not mentioned
2. Preserve ALL existing content, styles, and functionality not related to the fix
3. Fix must be clean and production-ready
4. Return ONLY the complete updated HTML starting with <!DOCTYPE html> — no explanation, no markdown
"""
        updated_html = await _gemini_generate(prompt, timeout=360.0)
        updated_html = updated_html.strip()
        if updated_html.startswith("```"):
            lines = updated_html.split("\n")
            updated_html = "\n".join(lines[1:-1]) if lines[-1] == "```" else "\n".join(lines[1:])

        if updated_html.startswith("<!--") or ("<!DOCTYPE" not in updated_html and "<html" not in updated_html):
            return f"Erro: Gemini não retornou HTML válido ({updated_html[:120]}). Tente novamente."

        # UPDATE the existing artifact in-place (same ID → frontend updates the open viewer)
        artifact_id = latest["id"]
        await db.update_artifact_code(artifact_id=artifact_id, code=updated_html)

        if event_queue:
            await event_queue.put({
                "event": "artifact_updated",
                "data": {"artifact": {
                    "id": artifact_id,
                    "title": latest.get("title", "index.html"),
                    "language": "html",
                    "type": "html",
                    "timestamp": int(__import__("time").time() * 1000),
                    "projectId": pid,
                    "filepath": latest.get("filepath", "index.html"),
                    "code": updated_html,
                }},
            })
        await db.update_task_status(task_id=edit_task_id, status="DONE")
        if event_queue:
            await event_queue.put({
                "event": "task_updated",
                "data": {"taskId": edit_task_id, "status": "DONE"},
            })
        lines_count = len(updated_html.split("\n"))
        return f"✅ Landing page atualizada no lugar! {lines_count} linhas. Correção: '{fix_instructions}'."

    async def provision_project_database(schema_sql: str, project_id: str = "") -> str:
        """
        Provision a dedicated SQLite database for a project.
        Creates the DB and generates a REST API accessible at /p/{project_id}/api/{table}.

        schema_sql: SQL CREATE TABLE statements separated by semicolons.
        Example: "CREATE TABLE customers (name TEXT, email TEXT, phone TEXT, company TEXT);
                  CREATE TABLE appointments (customer_id TEXT, date TEXT, status TEXT, notes TEXT);"

        After provisioning, the project gets a full REST API:
        - GET    /p/{project_id}/api/{table}           → list records
        - POST   /p/{project_id}/api/{table}           → create record
        - GET    /p/{project_id}/api/{table}/{id}       → get record
        - PUT    /p/{project_id}/api/{table}/{id}       → update record
        - DELETE /p/{project_id}/api/{table}/{id}       → delete record
        - GET    /p/{project_id}/api/schema             → see all tables

        All records auto-get: id (UUID), created_at, updated_at fields.
        Returns the API base URL and tables created.
        """
        import httpx

        # Resolve project_id from memory if not given
        pid = project_id
        if not pid:
            memories = await db.get_memories(tenant_id)
            for m in memories:
                if m.get("key") == "project_id":
                    pid = m.get("value", "")
                    break
        if not pid:
            return "❌ Nenhum project_id encontrado. Crie o projeto primeiro com create_project."

        print(f"[TOOL] provision_project_database: project_id={pid}")

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                # Get auth token from main DB to make internal API call
                # We'll directly use the infra module instead
                from pathlib import Path
                import aiosqlite
                import time as _time
                import json as _json

                apps_dir = Path(__file__).parent.parent.parent / "deployed_apps"
                db_path = apps_dir / pid / "db.sqlite"
                db_path.parent.mkdir(parents=True, exist_ok=True)

                async with aiosqlite.connect(str(db_path)) as adb:
                    await adb.execute("""
                        CREATE TABLE IF NOT EXISTS _meta (key TEXT PRIMARY KEY, value TEXT)
                    """)
                    await adb.execute("INSERT OR REPLACE INTO _meta VALUES ('project_id', ?)", (pid,))
                    await adb.execute("INSERT OR REPLACE INTO _meta VALUES ('tenant_id', ?)", (tenant_id,))
                    await adb.execute(
                        "INSERT OR REPLACE INTO _meta VALUES ('provisioned_at', ?)",
                        (str(_time.time()),),
                    )

                    # Always ensure a leads table exists in every project DB
                    _DEFAULT_LEADS_SQL = """
                        CREATE TABLE IF NOT EXISTS leads (
                            id TEXT PRIMARY KEY, created_at TEXT, updated_at TEXT,
                            name TEXT, email TEXT, phone TEXT, company TEXT,
                            source TEXT, message TEXT
                        )
                    """
                    await adb.execute(_DEFAULT_LEADS_SQL)

                    statements = [s.strip() for s in schema_sql.split(";") if s.strip()]
                    created_tables = []
                    for stmt in statements:
                        try:
                            if stmt.upper().startswith("CREATE TABLE"):
                                # Inject system columns
                                paren_idx = stmt.index("(")
                                header = stmt[:paren_idx]
                                cols_body = stmt[paren_idx + 1:].rstrip(")")
                                sys_cols = "id TEXT PRIMARY KEY, created_at TEXT, updated_at TEXT"
                                if "id TEXT PRIMARY KEY" not in cols_body:
                                    new_stmt = f"{header}({sys_cols}, {cols_body})"
                                else:
                                    new_stmt = stmt
                                await adb.execute(new_stmt)
                                # Extract table name
                                parts = header.replace("IF NOT EXISTS", "").split()
                                tname = parts[-1].strip('"\'`')
                                created_tables.append(tname)
                            else:
                                await adb.execute(stmt)
                        except Exception as e:
                            print(f"[TOOL] provision_project_database stmt error: {e}")

                    await adb.commit()

                    async with adb.execute(
                        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_meta'"
                    ) as cursor:
                        all_tables = [row[0] async for row in cursor]

                # Save to main DB
                async with aiosqlite.connect(str(db.db_path)) as mdb:
                    await mdb.execute("""
                        CREATE TABLE IF NOT EXISTS project_infra (
                            project_id TEXT PRIMARY KEY, tenant_id TEXT,
                            db_path TEXT, tables TEXT, schema_sql TEXT, provisioned_at TEXT
                        )
                    """)
                    await mdb.execute(
                        "INSERT OR REPLACE INTO project_infra VALUES (?, ?, ?, ?, ?, ?)",
                        (pid, tenant_id, str(db_path), _json.dumps(all_tables), schema_sql, str(_time.time())),
                    )
                    await mdb.commit()

            tables_str = ", ".join(all_tables)
            api_base = f"/p/{pid}/api"
            result = (
                f"✅ Banco de dados provisionado!\n"
                f"Tabelas criadas: {tables_str}\n"
                f"API base URL: {api_base}\n"
                f"Exemplos de uso:\n"
                f"  GET  {api_base}/schema\n"
                f"  GET  {api_base}/{all_tables[0] if all_tables else 'tabela'}\n"
                f"  POST {api_base}/{all_tables[0] if all_tables else 'tabela'}\n"
                f"O sistema gerou automaticamente: id (UUID), created_at, updated_at em todas as tabelas."
            )
            print(f"[TOOL] provision_project_database: created {len(all_tables)} tables")

            if event_queue:
                await event_queue.put({
                    "event": "infrastructure_provisioned",
                    "data": {
                        "project_id": pid,
                        "tables": all_tables,
                        "api_base": api_base,
                        "message": f"Banco de dados com {len(all_tables)} tabelas provisionado",
                    },
                })

            return result

        except Exception as e:
            print(f"[TOOL] provision_project_database error: {e}")
            return f"❌ Erro ao provisionar banco: {e}"

    return [
        create_task,
        update_task_status,
        generate_artifact,
        generate_landing_page,
        create_project,
        save_memory,
        get_memories,
        analyze_website,
        get_latest_artifact,
        edit_landing_page,
        fetch_stock_images,
        provision_project_database,
    ]
