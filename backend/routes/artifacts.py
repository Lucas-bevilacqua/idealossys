"""Artifacts management routes"""

from fastapi import APIRouter, HTTPException, Depends
from ..auth.routes import get_current_user
from ..database.crud import Database
from ..models.schemas import ArtifactCreate, ArtifactResponse, ArtifactUpdate

router = APIRouter(prefix="/api/artifacts", tags=["artifacts"])
db = Database()


@router.post("", response_model=ArtifactResponse)
async def create_artifact(
    artifact: ArtifactCreate, current_user: dict = Depends(get_current_user)
):
    """Create a new artifact"""
    tenant_id = current_user["tenant_id"]
    created = await db.create_artifact(
        tenant_id=tenant_id,
        title=artifact.title,
        language=artifact.language,
        code=artifact.code,
        artifact_type=artifact.type,
        project_id=artifact.projectId,
        filepath=artifact.filepath,
    )
    return ArtifactResponse(**created)


@router.get("", response_model=list[ArtifactResponse])
async def get_artifacts(current_user: dict = Depends(get_current_user)):
    """Get all artifacts for current tenant"""
    tenant_id = current_user["tenant_id"]
    artifacts = await db.get_artifacts(tenant_id)
    return [ArtifactResponse(**artifact) for artifact in artifacts]


@router.patch("/{artifact_id}")
async def update_artifact(
    artifact_id: str,
    update: ArtifactUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update an artifact's code and/or metadata"""
    tenant_id = current_user["tenant_id"]
    artifacts = await db.get_artifacts(tenant_id)
    existing = next((a for a in artifacts if a["id"] == artifact_id), None)
    if not existing:
        raise HTTPException(status_code=404, detail="Artifact not found")
    if update.code is not None:
        await db.update_artifact_code(artifact_id=artifact_id, code=update.code)
    return {"id": artifact_id, "updated": True}


@router.delete("/{artifact_id}")
async def delete_artifact(
    artifact_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete an artifact"""
    tenant_id = current_user["tenant_id"]
    artifacts = await db.get_artifacts(tenant_id)
    if not any(a["id"] == artifact_id for a in artifacts):
        raise HTTPException(status_code=404, detail="Artifact not found")
    await db.delete_artifact(artifact_id=artifact_id)
    return {"deleted": True}
