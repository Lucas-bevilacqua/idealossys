"""Leads management - public form submissions + authenticated viewing"""
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from ..auth.routes import get_current_user
from ..database.crud import Database

router = APIRouter(tags=["leads"])
db = Database()


class LeadCreate(BaseModel):
    name: str
    email: str
    phone: str = ""
    company: str = ""
    source: str = ""
    message: str = ""


# ── Public: LP form submits here (no auth) ───────────────────────────────────
@router.post("/api/leads/{project_id}")
async def submit_lead(project_id: str, lead: LeadCreate):
    """Receive lead from landing page form — public, no auth required"""
    # Find tenant by project_id
    import aiosqlite
    from ..database.schema import get_db_path
    async with aiosqlite.connect(get_db_path()) as conn:
        async with conn.execute("SELECT tenant_id FROM projects WHERE id=?", (project_id,)) as cur:
            row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    tenant_id = row[0]
    result = await db.create_lead(
        project_id=project_id, tenant_id=tenant_id,
        name=lead.name, email=lead.email, phone=lead.phone,
        company=lead.company, source=lead.source, message=lead.message,
    )
    return {"success": True, "id": result["id"]}


# ── Authenticated: view leads ─────────────────────────────────────────────────
@router.get("/api/leads")
async def get_all_leads(current_user: dict = Depends(get_current_user)):
    tenant_id = current_user["tenant_id"]
    leads = await db.get_leads(tenant_id)
    return leads


@router.get("/api/leads/{project_id}")
async def get_project_leads(project_id: str, current_user: dict = Depends(get_current_user)):
    tenant_id = current_user["tenant_id"]
    leads = await db.get_leads(tenant_id, project_id)
    return leads
