"""
IdealOS Backend - FastAPI + Agno Framework
Python-based multi-agent orchestration system
"""

import asyncio
import os
import pathlib
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables BEFORE any submodule imports so that
# module-level os.getenv() calls in agents/tools.py, routes/agent.py etc.
# see the correct values when their modules are first imported.
load_dotenv()

# Alias GEMINI_API_KEY → GOOGLE_API_KEY if only one is set
if not os.getenv("GOOGLE_API_KEY") and os.getenv("GEMINI_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = os.environ["GEMINI_API_KEY"]

from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from .database.schema import init_db
from .database.crud import Database
from .database.engine import IS_SQLITE
from .auth.routes import router as auth_router
from .routes.agent import router as agent_router
from .routes.tasks import router as tasks_router
from .routes.artifacts import router as artifacts_router
from .routes.projects import router as projects_router
from .routes.messages import router as messages_router
from .routes.context import router as context_router
from .routes.leads import router as leads_router
from .routes.project_infra import provision_router as infra_provision_router
from .routes.project_infra import project_api_router as infra_api_router
from .routes.publish import router as publish_router

_is_dev = os.getenv("ENVIRONMENT", "development") == "development"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicialização async do app: banco + validação de segurança + cleanup task."""
    from .auth.jwt import validate_secret_key
    await init_db()
    validate_secret_key()
    await _start_job_cleanup()
    yield


# Create FastAPI app — Swagger/ReDoc disabled in production
app = FastAPI(
    lifespan=lifespan,
    title="IdealOS Backend",
    description="Multi-agent orchestration platform using Agno framework",
    version="2.0.0",
    docs_url="/docs" if _is_dev else None,
    redoc_url="/redoc" if _is_dev else None,
    openapi_url="/openapi.json" if _is_dev else None,
)

# Allowed origins from env (comma-separated) — never "*" with credentials
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trusted hosts from env
_trusted_hosts = [h.strip() for h in os.getenv("TRUSTED_HOSTS", "localhost,127.0.0.1").split(",") if h.strip()]
app.add_middleware(TrustedHostMiddleware, allowed_hosts=_trusted_hosts)


# Health check endpoint
@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "idealos-backend",
        "version": "2.0.0",
    }


# Agent logs endpoint (used by frontend)
@app.get("/api/logs")
async def get_agent_logs(request: Request):
    from .auth.routes import get_current_user
    from .database.engine import engine
    from sqlalchemy import text
    try:
        current_user = await get_current_user(request)
        tenant_id = current_user["tenant_id"]
        async with engine.connect() as conn:
            result = await conn.execute(text("""
                SELECT id, tenant_id, project_id, from_agent, to_agent, event_type,
                       payload, tokens_consumed, credits_consumed, duration_ms,
                       status, created_at
                FROM agent_logs WHERE tenant_id = :tid
                ORDER BY created_at DESC LIMIT 200
            """), {"tid": tenant_id})
            rows = result.fetchall()
            return [
                {
                    "id": r[0], "tenantId": r[1], "projectId": r[2], "verticalId": "tech",
                    "fromAgent": r[3], "toAgent": r[4], "eventType": r[5],
                    "payload": r[6] or "", "tokensConsumed": r[7] or 0,
                    "creditsConsumed": r[8] or 0, "durationMs": r[9] or 0,
                    "status": r[10], "createdAt": r[11],
                }
                for r in rows
            ]
    except Exception:
        return []


# Include routers
app.include_router(auth_router)
app.include_router(agent_router)
app.include_router(tasks_router)
app.include_router(artifacts_router)
app.include_router(projects_router)
app.include_router(messages_router)
app.include_router(context_router)
app.include_router(leads_router)
app.include_router(infra_provision_router)
app.include_router(infra_api_router)
app.include_router(publish_router)


# ── Periodic job cleanup (iniciado pelo lifespan) ─────────────────────────────
async def _start_job_cleanup():
    async def _loop():
        while True:
            await asyncio.sleep(1800)  # a cada 30 minutos
            try:
                from .routes.agent import _cleanup_old_jobs
                _cleanup_old_jobs()
            except Exception:
                pass
    asyncio.create_task(_loop())


# ── Custom domain routing ─────────────────────────────────────────────────────
# When a request arrives with a Host header that matches a saved custom_domain,
# serve that project's HTML (same as /p/{project_id}).
@app.middleware("http")
async def custom_domain_middleware(request: Request, call_next):
    host = request.headers.get("host", "").split(":")[0]  # strip port
    skip = {"localhost", "127.0.0.1", "0.0.0.0"}
    if host and host not in skip and not host.endswith(".localhost"):
        # Only intercept root-level requests (not /api/* etc.)
        path = request.url.path
        if not path.startswith(("/api", "/p/", "/docs", "/redoc", "/openapi", "/static", "/health")):
            db_inst = Database()
            project = await db_inst.get_project_by_domain(host)
            if project:
                artifacts = await db_inst.get_artifacts_by_project(project["id"])
                html_art = next((a for a in artifacts if a.get("language") == "html"), None)
                if html_art:
                    return HTMLResponse(content=html_art.get("code", ""), status_code=200, headers=_ARTIFACT_HEADERS)
    return await call_next(request)


# Public endpoints (no auth) for deployed artifacts
_CSP_HEADER = (
    "default-src 'self' https:; "
    "script-src 'self' 'unsafe-inline' https:; "
    "style-src 'self' 'unsafe-inline' https:; "
    "img-src 'self' data: https:; "
    "font-src 'self' https:; "
    "connect-src 'self' https:; "
    "frame-ancestors 'none';"
)
_ARTIFACT_HEADERS = {
    "Content-Security-Policy": _CSP_HEADER,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
}


@app.get("/p/{project_id}", response_class=HTMLResponse)
async def serve_project_page(project_id: str):
    """Serve landing page HTML publicly — client points domain to this server"""
    db_inst = Database()
    artifacts = await db_inst.get_artifacts_by_project(project_id)
    html_art = next((a for a in artifacts if a.get("language") == "html"), None)
    if not html_art:
        return HTMLResponse("<h1>Página não encontrada</h1>", status_code=404, headers=_ARTIFACT_HEADERS)
    html = html_art.get("code") or ""
    if not html:
        return HTMLResponse("<h1>Conteúdo indisponível</h1>", status_code=404, headers=_ARTIFACT_HEADERS)
    return HTMLResponse(content=html, status_code=200, headers=_ARTIFACT_HEADERS)


# ── Frontend (React SPA) ──────────────────────────────────────────────────────
# In production the Vite build outputs to <repo_root>/dist/.
# We mount /assets as static files and serve index.html for every other path
# so that client-side routing works correctly.
_dist = pathlib.Path(__file__).parent.parent / "dist"

if _dist.exists():
    # Serve compiled JS/CSS/images from /assets
    app.mount("/assets", StaticFiles(directory=_dist / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        """Catch-all: serve the React SPA index.html for any unknown path."""
        index = _dist / "index.html"
        if index.exists():
            return HTMLResponse(index.read_text(encoding="utf-8"))
        return HTMLResponse("<h1>App not built — run npm run build</h1>", status_code=503)
else:
    @app.get("/")
    async def root():
        return {"message": "IdealOS Backend", "docs": "/docs", "version": "2.0.0"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=os.getenv("ENVIRONMENT") == "development",
    )
