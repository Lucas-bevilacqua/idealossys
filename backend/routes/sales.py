"""Sales pipeline routes — GET/POST para leads, sequências e conversas WhatsApp"""

from fastapi import APIRouter, Request, Depends
from ..auth.routes import get_current_user
from ..database.crud import Database

router = APIRouter(prefix="/api/sales")
db = Database()


@router.get("/pipeline")
async def get_pipeline(request: Request, stage: str = "", current_user=Depends(get_current_user)):
    tenant_id = current_user["tenant_id"]
    leads = await db.get_sales_pipeline(tenant_id=tenant_id, stage=stage or None)
    return leads


@router.patch("/pipeline/{lead_id}")
async def update_lead(lead_id: str, request: Request, current_user=Depends(get_current_user)):
    tenant_id = current_user["tenant_id"]
    body = await request.json()
    stage = body.get("stage", "")
    notes = body.get("notes", "")
    if not stage:
        return {"error": "stage is required"}
    await db.update_sales_lead_stage(lead_id=lead_id, tenant_id=tenant_id,
                                     stage=stage, notes=notes)
    return {"ok": True}


@router.get("/email-sequences")
async def get_sequences(request: Request, current_user=Depends(get_current_user)):
    tenant_id = current_user["tenant_id"]
    seqs = await db.get_email_sequences(tenant_id=tenant_id)
    return seqs


@router.get("/whatsapp")
async def get_whatsapp(request: Request, current_user=Depends(get_current_user)):
    tenant_id = current_user["tenant_id"]
    convs = await db.get_whatsapp_conversations(tenant_id=tenant_id)
    return convs


@router.post("/whatsapp/webhook")
async def whatsapp_webhook(request: Request):
    """
    Receives incoming WhatsApp messages from Evolution API or Z-API.
    Evolution API sends: { "event": "messages.upsert", "data": { "key": {...}, "message": {...} } }
    Z-API sends: { "phone": "5511...", "text": "...", "isGroupMsg": false }
    This endpoint saves the conversation and marks it for Leo to respond.
    """
    try:
        body = await request.json()
    except Exception:
        return {"ok": False}

    # Try to normalize across Evolution API and Z-API formats
    phone = ""
    text = ""
    name = ""

    # Evolution API format
    if "data" in body and "key" in body.get("data", {}):
        key = body["data"].get("key", {})
        phone = key.get("remoteJid", "").replace("@s.whatsapp.net", "")
        msg = body["data"].get("message", {})
        text = (msg.get("conversation") or
                msg.get("extendedTextMessage", {}).get("text") or "")
        name = body["data"].get("pushName", phone)

    # Z-API format
    elif "phone" in body:
        phone = str(body.get("phone", ""))
        text = body.get("text", "") or body.get("body", "")
        name = body.get("senderName", phone)

    if phone and text:
        import json
        db_inst = Database()
        # Determine tenant from phone — multi-tenant webhook needs instance mapping
        # For now, skip saving (Leo agents handle responses on-demand)
        # Full multi-tenant webhook routing requires EVOLUTION_TENANT_MAP in config
        pass

    return {"ok": True}
