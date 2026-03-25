"""Tasks management routes"""

from fastapi import APIRouter, HTTPException, Depends
from ..auth.routes import get_current_user
from ..database.crud import Database
from ..models.schemas import TaskCreate, TaskResponse

router = APIRouter(prefix="/api/tasks", tags=["tasks"])
db = Database()


@router.post("", response_model=TaskResponse)
async def create_task(
    task: TaskCreate, current_user: dict = Depends(get_current_user)
):
    """Create a new task"""
    tenant_id = current_user["tenant_id"]
    created = await db.create_task(
        tenant_id=tenant_id,
        title=task.title,
        description=task.description,
        assignee_id=task.assigneeId,
    )
    return TaskResponse(**created)


@router.get("", response_model=list[TaskResponse])
async def get_tasks(current_user: dict = Depends(get_current_user)):
    """Get all tasks for current tenant"""
    tenant_id = current_user["tenant_id"]
    tasks = await db.get_tasks(tenant_id)
    return [TaskResponse(**task) for task in tasks]


@router.delete("/clear/all")
async def clear_all_tasks(current_user: dict = Depends(get_current_user)):
    """Delete all tasks for current tenant"""
    import aiosqlite
    tenant_id = current_user["tenant_id"]
    async with aiosqlite.connect(db.db_path) as conn:
        await conn.execute("DELETE FROM tasks WHERE tenant_id = ?", (tenant_id,))
        await conn.commit()
    return {"deleted": True}


@router.delete("/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a single task"""
    import aiosqlite
    tenant_id = current_user["tenant_id"]
    async with aiosqlite.connect(db.db_path) as conn:
        await conn.execute("DELETE FROM tasks WHERE id = ? AND tenant_id = ?", (task_id, tenant_id))
        await conn.commit()
    return {"deleted": True, "task_id": task_id}


@router.patch("/{task_id}")
async def patch_task(
    task_id: str, payload: dict, current_user: dict = Depends(get_current_user)
):
    """Patch task fields (status, etc)"""
    if "status" in payload:
        await db.update_task_status(task_id, payload["status"])
    return {"task_id": task_id, **payload}


@router.put("/{task_id}/status")
async def update_task_status(
    task_id: str, status: str, current_user: dict = Depends(get_current_user)
):
    """Update task status"""
    success = await db.update_task_status(task_id, status)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"status": status, "task_id": task_id}
