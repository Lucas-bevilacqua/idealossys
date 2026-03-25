"""
Per-project infrastructure: each project gets its own SQLite DB + auto-generated REST API.
Routes:
  POST /api/projects/{project_id}/provision  — create project DB with custom schema
  GET  /p/{project_id}/api/schema            — list tables + columns
  GET  /p/{project_id}/api/{table}           — list records (with ?filter=value&limit=N)
  POST /p/{project_id}/api/{table}           — create record
  GET  /p/{project_id}/api/{table}/{id}      — get single record
  PUT  /p/{project_id}/api/{table}/{id}      — update record
  DELETE /p/{project_id}/api/{table}/{id}    — delete record
"""

import os
import json
import time
import uuid
import aiosqlite
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import JSONResponse

from ..auth.routes import get_current_user
from ..database.crud import Database

main_db = Database()

# ── Storage: each project DB lives in deployed_apps/{project_id}/db.sqlite ──
APPS_DIR = Path(__file__).parent.parent.parent / "deployed_apps"


def _project_db_path(project_id: str) -> Path:
    return APPS_DIR / project_id / "db.sqlite"


async def _ensure_project_db(project_id: str) -> Path:
    """Create the project DB directory if it doesn't exist."""
    db_path = _project_db_path(project_id)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    return db_path


# ── Reserved table names (cannot be used by project schemas) ─────────────────
_RESERVED_TABLES = {"sqlite_master", "sqlite_sequence", "_meta"}

# ── Auto-added system columns ─────────────────────────────────────────────────
_SYSTEM_COLS_SQL = "id TEXT PRIMARY KEY, created_at TEXT, updated_at TEXT"


# ── Router for /api/projects/{project_id}/provision ──────────────────────────
provision_router = APIRouter(prefix="/api/projects", tags=["infrastructure"])


@provision_router.post("/{project_id}/provision")
async def provision_project_db(
    project_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """
    Provision a SQLite database for a project with a custom schema.
    Body: { "schema": "CREATE TABLE ...;" }
    Returns: { "db_url": "/p/{project_id}/api", "tables": [...] }
    """
    body = await request.json()
    schema_sql: str = body.get("schema", "") or ""

    # Empty schema is valid — the DB will still be provisioned with the default leads table

    db_path = await _ensure_project_db(project_id)

    async with aiosqlite.connect(str(db_path)) as db:
        # Create _meta table to track provisioning
        await db.execute("""
            CREATE TABLE IF NOT EXISTS _meta (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        """)
        await db.execute(
            "INSERT OR REPLACE INTO _meta VALUES (?, ?)",
            ("provisioned_at", str(time.time())),
        )
        await db.execute(
            "INSERT OR REPLACE INTO _meta VALUES (?, ?)",
            ("project_id", project_id),
        )
        await db.execute(
            "INSERT OR REPLACE INTO _meta VALUES (?, ?)",
            ("tenant_id", current_user["tenant_id"]),
        )

        # Always create default leads table in every project DB
        await db.execute("""
            CREATE TABLE IF NOT EXISTS leads (
                id TEXT PRIMARY KEY,
                created_at TEXT,
                updated_at TEXT,
                name TEXT,
                email TEXT,
                phone TEXT,
                company TEXT,
                source TEXT,
                message TEXT
            )
        """)

        # Execute user schema — split on ; and run each statement
        statements = [s.strip() for s in schema_sql.split(";") if s.strip()]
        errors = []
        created_tables = []
        for stmt in statements:
            try:
                # Inject system columns into CREATE TABLE statements
                if stmt.upper().startswith("CREATE TABLE"):
                    # Find opening paren and inject system cols
                    paren_idx = stmt.index("(")
                    table_name = stmt[len("CREATE TABLE"):paren_idx].strip().strip("IF NOT EXISTS").strip()
                    table_name = table_name.replace("IF NOT EXISTS", "").strip()
                    cols_body = stmt[paren_idx + 1 :].rstrip(")")
                    # Prepend system cols if not already present
                    if "id TEXT PRIMARY KEY" not in cols_body:
                        new_stmt = f"{stmt[:paren_idx]}({_SYSTEM_COLS_SQL}, {cols_body})"
                    else:
                        new_stmt = stmt
                    await db.execute(new_stmt)
                    created_tables.append(table_name)
                else:
                    await db.execute(stmt)
            except Exception as e:
                errors.append(str(e))

        await db.commit()

        # List all user tables
        async with db.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_meta'"
        ) as cursor:
            tables = [row[0] async for row in cursor]

    # Registra metadados de infra no banco principal via Database class
    try:
        await main_db.upsert_project_infra(
            project_id=project_id,
            tenant_id=current_user["tenant_id"],
            db_path=str(db_path),
            tables=json.dumps(tables),
            schema_sql=schema_sql,
            provisioned_at=str(time.time()),
        )
    except Exception:
        pass

    return {
        "status": "provisioned",
        "project_id": project_id,
        "db_url": f"/p/{project_id}/api",
        "tables": tables,
        "errors": errors,
    }


@provision_router.get("/{project_id}/infra")
async def get_project_infra(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get infrastructure info for a project."""
    db_path = _project_db_path(project_id)
    if not db_path.exists():
        return {"provisioned": False, "tables": []}

    async with aiosqlite.connect(str(db_path)) as db:
        async with db.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_meta'"
        ) as cursor:
            tables = [row[0] async for row in cursor]

    table_schemas = {}
    async with aiosqlite.connect(str(db_path)) as db:
        for table in tables:
            async with db.execute(f"PRAGMA table_info({table})") as cursor:
                cols = [{"name": row[1], "type": row[2]} async for row in cursor]
            async with db.execute(f"SELECT COUNT(*) FROM {table}") as cursor:
                count = (await cursor.fetchone())[0]
            table_schemas[table] = {"columns": cols, "row_count": count}

    return {
        "provisioned": True,
        "project_id": project_id,
        "db_url": f"/p/{project_id}/api",
        "tables": tables,
        "schemas": table_schemas,
    }


# ── Router for /p/{project_id}/api/* (public project data API) ───────────────
project_api_router = APIRouter(prefix="/p/{project_id}/api", tags=["project-api"])


async def _get_project_db(project_id: str) -> Path:
    """Ensure project DB exists, return path."""
    db_path = _project_db_path(project_id)
    if not db_path.exists():
        raise HTTPException(404, f"Project {project_id} has no database provisioned. Ask the agents to provision it first.")
    return db_path


def _allowed_table(table: str, tables: list) -> None:
    if table in _RESERVED_TABLES or table not in tables:
        raise HTTPException(404, f"Table '{table}' not found")


async def _list_tables(db_path: Path) -> List[str]:
    async with aiosqlite.connect(str(db_path)) as db:
        async with db.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_meta'"
        ) as cursor:
            return [row[0] async for row in cursor]


@project_api_router.get("/schema")
async def get_schema(project_id: str):
    """List all tables and their columns."""
    db_path = await _get_project_db(project_id)
    tables = await _list_tables(db_path)
    schemas = {}
    async with aiosqlite.connect(str(db_path)) as db:
        for table in tables:
            async with db.execute(f"PRAGMA table_info({table})") as cursor:
                cols = [{"name": row[1], "type": row[2]} async for row in cursor]
            schemas[table] = cols
    return {"project_id": project_id, "tables": tables, "schemas": schemas}


@project_api_router.get("/{table}")
async def list_records(
    project_id: str,
    table: str,
    request: Request,
    limit: int = 100,
    offset: int = 0,
):
    """List records in a table. Supports ?field=value filters."""
    db_path = await _get_project_db(project_id)
    tables = await _list_tables(db_path)
    _allowed_table(table, tables)

    # Build WHERE clause from query params (exclude limit/offset)
    filters = {
        k: v
        for k, v in request.query_params.items()
        if k not in ("limit", "offset")
    }

    where_sql = ""
    params: List[Any] = []
    if filters:
        clauses = [f"{k} = ?" for k in filters.keys()]
        where_sql = "WHERE " + " AND ".join(clauses)
        params = list(filters.values())

    async with aiosqlite.connect(str(db_path)) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            f"SELECT * FROM {table} {where_sql} LIMIT ? OFFSET ?",
            params + [limit, offset],
        ) as cursor:
            rows = [dict(row) async for row in cursor]

        async with db.execute(f"SELECT COUNT(*) FROM {table} {where_sql}", params) as cursor:
            total = (await cursor.fetchone())[0]

    return {"data": rows, "total": total, "limit": limit, "offset": offset}


@project_api_router.post("/{table}")
async def create_record(project_id: str, table: str, request: Request):
    """Create a record in a table."""
    db_path = await _get_project_db(project_id)
    tables = await _list_tables(db_path)
    _allowed_table(table, tables)

    body = await request.json()
    record_id = str(uuid.uuid4())
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    # Get table columns
    async with aiosqlite.connect(str(db_path)) as db:
        async with db.execute(f"PRAGMA table_info({table})") as cursor:
            cols = {row[1] async for row in cursor}

    # Filter only known columns, inject system cols
    data = {k: v for k, v in body.items() if k in cols and k not in ("id", "created_at", "updated_at")}
    data["id"] = record_id
    data["created_at"] = now
    data["updated_at"] = now

    columns = list(data.keys())
    placeholders = ", ".join("?" * len(columns))
    values = [data[c] for c in columns]

    async with aiosqlite.connect(str(db_path)) as db:
        await db.execute(
            f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({placeholders})",
            values,
        )
        await db.commit()
        db.row_factory = aiosqlite.Row
        async with db.execute(f"SELECT * FROM {table} WHERE id = ?", (record_id,)) as cursor:
            row = dict(await cursor.fetchone())

    return JSONResponse(content=row, status_code=201)


@project_api_router.get("/{table}/{record_id}")
async def get_record(project_id: str, table: str, record_id: str):
    """Get a single record by ID."""
    db_path = await _get_project_db(project_id)
    tables = await _list_tables(db_path)
    _allowed_table(table, tables)

    async with aiosqlite.connect(str(db_path)) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(f"SELECT * FROM {table} WHERE id = ?", (record_id,)) as cursor:
            row = await cursor.fetchone()

    if not row:
        raise HTTPException(404, "Record not found")
    return dict(row)


@project_api_router.put("/{table}/{record_id}")
async def update_record(project_id: str, table: str, record_id: str, request: Request):
    """Update a record by ID."""
    db_path = await _get_project_db(project_id)
    tables = await _list_tables(db_path)
    _allowed_table(table, tables)

    body = await request.json()
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    async with aiosqlite.connect(str(db_path)) as db:
        async with db.execute(f"PRAGMA table_info({table})") as cursor:
            cols = {row[1] async for row in cursor}

    updates = {k: v for k, v in body.items() if k in cols and k not in ("id", "created_at")}
    updates["updated_at"] = now

    set_sql = ", ".join(f"{k} = ?" for k in updates.keys())
    values = list(updates.values()) + [record_id]

    async with aiosqlite.connect(str(db_path)) as db:
        await db.execute(f"UPDATE {table} SET {set_sql} WHERE id = ?", values)
        await db.commit()
        db.row_factory = aiosqlite.Row
        async with db.execute(f"SELECT * FROM {table} WHERE id = ?", (record_id,)) as cursor:
            row = await cursor.fetchone()

    if not row:
        raise HTTPException(404, "Record not found")
    return dict(row)


@project_api_router.delete("/{table}/{record_id}")
async def delete_record(project_id: str, table: str, record_id: str):
    """Delete a record by ID."""
    db_path = await _get_project_db(project_id)
    tables = await _list_tables(db_path)
    _allowed_table(table, tables)

    async with aiosqlite.connect(str(db_path)) as db:
        async with db.execute(f"SELECT id FROM {table} WHERE id = ?", (record_id,)) as cursor:
            row = await cursor.fetchone()
        if not row:
            raise HTTPException(404, "Record not found")
        await db.execute(f"DELETE FROM {table} WHERE id = ?", (record_id,))
        await db.commit()

    return {"deleted": True, "id": record_id}
