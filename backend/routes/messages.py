"""Messages management routes"""

from fastapi import APIRouter, HTTPException, Depends
from ..auth.routes import get_current_user
from ..database.crud import Database
from ..models.schemas import MessageCreate, MessageResponse

router = APIRouter(prefix="/api/messages", tags=["messages"])
db = Database()


@router.post("", response_model=MessageResponse)
async def create_message_body(
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    """Create a message with areaId in body (used by frontend persistMessage)"""
    tenant_id = current_user["tenant_id"]
    user = current_user["user"]
    area_id = payload.get("areaId", "global")
    created = await db.create_message(
        tenant_id=tenant_id,
        area_id=area_id,
        sender_id=payload.get("senderId", user["id"]),
        sender_name=payload.get("senderName", user["name"]),
        text=payload.get("text", ""),
        role=payload.get("role", "user"),
        artifact_id=payload.get("artifactId"),
    )
    return MessageResponse(**created)


@router.post("/{area_id}", response_model=MessageResponse)
async def create_message(
    area_id: str,
    message: MessageCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create a message in an area"""
    tenant_id = current_user["tenant_id"]
    user = current_user["user"]

    created = await db.create_message(
        tenant_id=tenant_id,
        area_id=area_id,
        sender_id=user["id"],
        sender_name=user["name"],
        text=message.text,
        role=message.role,
        artifact_id=message.artifactId,
    )
    return MessageResponse(**created)


@router.get("/{area_id}", response_model=list[MessageResponse])
async def get_messages(
    area_id: str, current_user: dict = Depends(get_current_user)
):
    """Get messages for an area"""
    tenant_id = current_user["tenant_id"]
    messages = await db.get_messages(tenant_id, area_id)
    return [MessageResponse(**msg) for msg in messages]
