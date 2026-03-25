"""Publish route — expose an artifact as a public URL via /p/{project_id}"""

import os
from fastapi import APIRouter, HTTPException, Depends, Request
from ..auth.routes import get_current_user
from ..database.crud import Database

router = APIRouter(prefix="/api/publish", tags=["publish"])
db = Database()

def _public_url(project_id: str, request: Request = None) -> str:
    """Build absolute public URL, preferring PUBLIC_URL env var."""
    base = os.getenv("PUBLIC_URL", "").rstrip("/")
    if not base and request:
        base = str(request.base_url).rstrip("/")
    if not base:
        base = "http://localhost:8000"
    return f"{base}/p/{project_id}"


@router.get("")
async def get_publish_status(current_user: dict = Depends(get_current_user)):
    """Return the most recently published project URL for this tenant."""
    tenant_id = current_user["tenant_id"]
    projects = await db.get_projects(tenant_id)
    # Find the latest project that has an HTML artifact
    artifacts = await db.get_artifacts(tenant_id)
    html_artifacts = [a for a in artifacts if a.get("language") == "html"]
    if not html_artifacts:
        return {"publicUrl": None, "customDomain": None}

    latest = html_artifacts[-1]
    project_id = latest.get("projectId")
    if not project_id:
        return {"publicUrl": None, "customDomain": None}

    project = next((p for p in projects if p.get("id") == project_id), None)
    if not project:
        return {"publicUrl": None, "customDomain": None}
    custom_domain = project.get("customDomain")
    return {"publicUrl": _public_url(project_id), "customDomain": custom_domain}


@router.post("")
async def publish_artifact(request: Request, current_user: dict = Depends(get_current_user)):
    """Publish an artifact at /p/{project_id}. Optionally save a custom domain."""
    tenant_id = current_user["tenant_id"]
    body = await request.json()
    artifact_id: str = body.get("artifactId", "")
    custom_domain: str = body.get("customDomain", "").strip().lower()
    custom_domain = custom_domain.replace("https://", "").replace("http://", "").rstrip("/")

    # Find artifact
    artifacts = await db.get_artifacts(tenant_id)
    artifact = next((a for a in artifacts if a.get("id") == artifact_id), None)
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")

    project_id = artifact.get("projectId")
    if not project_id:
        raise HTTPException(status_code=400, detail="Artifact is not linked to a project")

    # Save custom domain if provided
    if custom_domain:
        await db.set_project_domain(project_id, tenant_id, custom_domain)

    return {
        "success": True,
        "publicUrl": _public_url(project_id, request),
        "customDomain": custom_domain or None,
        "projectId": project_id,
    }
