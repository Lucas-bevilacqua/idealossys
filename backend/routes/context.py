"""Tenant context and settings routes"""

from fastapi import APIRouter, HTTPException, Depends
from ..auth.routes import get_current_user
from ..database.crud import Database
from ..models.schemas import TenantResponse, TenantUpdate

router = APIRouter(prefix="/api/context", tags=["context"])
db = Database()


def _tenant_to_camel(tenant: dict) -> dict:
    """Map snake_case DB fields to camelCase for frontend"""
    return {
        "id": tenant.get("id"),
        "name": tenant.get("name"),
        "description": tenant.get("description"),
        "industry": tenant.get("industry"),
        "goals": tenant.get("goals"),
        "challenges": tenant.get("challenges"),
        "targetAudience": tenant.get("target_audience"),
        "websiteUrl": tenant.get("website_url"),
        "logoUrl": tenant.get("logo_url"),
        "brandColors": tenant.get("brand_colors"),
        "brandTone": tenant.get("brand_tone"),
        "credits": tenant.get("credits", 5000),
        "plan": tenant.get("plan", "starter"),
    }


@router.get("")
async def get_context(current_user: dict = Depends(get_current_user)):
    """Get current tenant context"""
    tenant_id = current_user["tenant_id"]
    tenant = await db.get_tenant(tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return _tenant_to_camel(tenant)


@router.post("")
@router.put("")
async def update_context(
    update: TenantUpdate, current_user: dict = Depends(get_current_user)
):
    """Update tenant context"""
    tenant_id = current_user["tenant_id"]

    # Include aliases (camelCase from frontend maps to snake_case DB fields)
    update_data = update.model_dump(exclude_unset=True, by_alias=False)
    await db.update_tenant(tenant_id, **update_data)

    tenant = await db.get_tenant(tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return _tenant_to_camel(tenant)
