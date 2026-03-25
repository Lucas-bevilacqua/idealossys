"""Projects management routes"""

from fastapi import APIRouter, HTTPException, Depends, Request
from ..auth.routes import get_current_user
from ..database.crud import Database
from ..models.schemas import ProjectCreate, ProjectResponse

router = APIRouter(prefix="/api/projects", tags=["projects"])
db = Database()


@router.post("", response_model=ProjectResponse)
async def create_project(
    project: ProjectCreate, current_user: dict = Depends(get_current_user)
):
    """Create a new project"""
    tenant_id = current_user["tenant_id"]
    created = await db.create_project(
        tenant_id=tenant_id,
        name=project.name,
        description=project.description,
        project_type=project.type,
        stack=project.stack,
    )
    return ProjectResponse(**created)


@router.get("", response_model=list[ProjectResponse])
async def get_projects(current_user: dict = Depends(get_current_user)):
    """Get all projects for current tenant"""
    tenant_id = current_user["tenant_id"]
    projects = await db.get_projects(tenant_id)
    return [ProjectResponse(**project) for project in projects]


@router.get("/{project_id}/files")
async def get_project_files(
    project_id: str, current_user: dict = Depends(get_current_user)
):
    """Get all artifacts (files) belonging to a project"""
    tenant_id = current_user["tenant_id"]
    artifacts = await db.get_artifacts(tenant_id)
    project_files = [a for a in artifacts if a.get("projectId") == project_id]
    return project_files


@router.delete("/{project_id}")
async def delete_project(
    project_id: str, current_user: dict = Depends(get_current_user)
):
    """Delete a project and its artifacts"""
    tenant_id = current_user["tenant_id"]
    success = await db.delete_project(project_id, tenant_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"deleted": True}


@router.post("/{project_id}/deploy")
async def deploy_project(
    project_id: str, current_user: dict = Depends(get_current_user)
):
    """Deploy project — serves HTML via /p/{project_id} on port 8000."""
    tenant_id = current_user["tenant_id"]

    # Check that an HTML artifact exists for this project
    artifacts = await db.get_artifacts(tenant_id)
    html_art = next(
        (a for a in artifacts if a.get("projectId") == project_id and a.get("language") == "html"),
        None,
    )

    if not html_art:
        return {
            "success": False,
            "error": "Nenhum arquivo HTML encontrado neste projeto. Peça aos agentes para gerar a landing page primeiro.",
            "logs": ["[ERROR] Nenhum artefato HTML encontrado para o projeto."],
        }

    deployed_url = f"http://localhost:8000/p/{project_id}"

    return {
        "success": True,
        "project_id": project_id,
        "deployedUrl": deployed_url,
        "port": 8000,
        "logs": [
            f"[OK] Projeto encontrado — {html_art.get('title', 'index.html')}",
            f"[OK] Servindo em {deployed_url}",
            "[OK] Deploy concluído! Aponte seu domínio para este servidor.",
        ],
    }


@router.get("/{project_id}/deploy/status")
async def deploy_status(
    project_id: str, current_user: dict = Depends(get_current_user)
):
    """Check if a project has a deployable HTML artifact."""
    tenant_id = current_user["tenant_id"]
    artifacts = await db.get_artifacts(tenant_id)
    html_art = next(
        (a for a in artifacts if a.get("projectId") == project_id and a.get("language") == "html"),
        None,
    )
    if html_art:
        return {
            "running": True,
            "deployedUrl": f"http://localhost:8000/p/{project_id}",
            "port": 8000,
        }
    return {"running": False, "deployedUrl": None, "port": None}


@router.delete("/{project_id}/deploy")
async def undeploy_project(project_id: str, current_user: dict = Depends(get_current_user)):
    """No-op — FastAPI always serves /p/{project_id}."""
    return {"stopped": True}


@router.put("/{project_id}/domain")
async def set_domain(
    project_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Save a custom domain for a project (e.g. 'meusite.com.br')."""
    body = await request.json()
    domain: str = body.get("domain", "").strip().lower()
    # Strip protocol if user pasted full URL
    domain = domain.replace("https://", "").replace("http://", "").rstrip("/")
    tenant_id = current_user["tenant_id"]
    ok = await db.set_project_domain(project_id, tenant_id, domain)
    if not ok:
        raise HTTPException(404, "Project not found")
    return {"project_id": project_id, "custom_domain": domain or None}


@router.get("/{project_id}/domain")
async def get_domain(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get the custom domain saved for a project."""
    tenant_id = current_user["tenant_id"]
    project = await db.get_project(project_id, tenant_id)
    if not project:
        raise HTTPException(404, "Project not found")
    return {"project_id": project_id, "custom_domain": project.get("customDomain")}
