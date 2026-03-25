"""
Camada de acesso a dados — usa SQLAlchemy async (SQLite em dev, PostgreSQL em prod).
A interface pública da classe Database permanece idêntica para não quebrar as rotas.
"""

import time
from typing import List, Optional, Dict, Any
from uuid import uuid4
from sqlalchemy import text
from .engine import engine
from .schema import get_db_path


class Database:
    def __init__(self):
        # Mantido para compatibilidade com project_infra.py
        self.db_path = get_db_path()

    # ============ Users ============

    async def create_user(self, username: str, password_hash: str, name: str,
                          email: Optional[str] = None) -> Dict[str, Any]:
        user_id = str(uuid4())
        async with engine.begin() as conn:
            await conn.execute(text(
                "INSERT INTO users (id, username, password, name, email) "
                "VALUES (:id, :username, :password, :name, :email)"
            ), {"id": user_id, "username": username, "password": password_hash,
                "name": name, "email": email})
        return {"id": user_id, "username": username, "name": name, "email": email}

    async def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        async with engine.connect() as conn:
            result = await conn.execute(
                text("SELECT id, username, password, name, email FROM users WHERE username = :u"),
                {"u": username}
            )
            row = result.fetchone()
            if row:
                return {"id": row[0], "username": row[1], "password": row[2],
                        "name": row[3], "email": row[4]}
        return None

    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        async with engine.connect() as conn:
            result = await conn.execute(
                text("SELECT id, username, name, email FROM users WHERE id = :id"),
                {"id": user_id}
            )
            row = result.fetchone()
            if row:
                return {"id": row[0], "username": row[1], "name": row[2], "email": row[3]}
        return None

    # ============ Tenants ============

    async def create_tenant(self, name: str, description: str, user_id: str) -> Dict[str, Any]:
        tenant_id = str(uuid4())
        async with engine.begin() as conn:
            await conn.execute(text(
                "INSERT INTO tenants (id, name, description) VALUES (:id, :name, :desc)"
            ), {"id": tenant_id, "name": name, "desc": description})
            await conn.execute(text(
                "INSERT INTO user_tenants (user_id, tenant_id, role) VALUES (:u, :t, :r)"
            ), {"u": user_id, "t": tenant_id, "r": "OWNER"})
        return {"id": tenant_id, "name": name, "description": description}

    async def get_tenant(self, tenant_id: str) -> Optional[Dict[str, Any]]:
        async with engine.connect() as conn:
            result = await conn.execute(text("""
                SELECT id, name, description, industry, goals, target_audience,
                       challenges, website_url, logo_url, brand_colors, brand_tone,
                       credits, plan, custom_domain, published_artifact_id
                FROM tenants WHERE id = :id
            """), {"id": tenant_id})
            row = result.fetchone()
            if row:
                return {
                    "id": row[0], "name": row[1], "description": row[2],
                    "industry": row[3], "goals": row[4], "target_audience": row[5],
                    "challenges": row[6], "website_url": row[7], "logo_url": row[8],
                    "brand_colors": row[9], "brand_tone": row[10], "credits": row[11],
                    "plan": row[12], "custom_domain": row[13], "published_artifact_id": row[14],
                }
        return None

    async def update_tenant(self, tenant_id: str, **kwargs) -> bool:
        allowed_fields = [
            "name", "description", "industry", "goals", "target_audience", "challenges",
            "website_url", "logo_url", "brand_colors", "brand_tone", "credits", "plan",
            "custom_domain", "published_artifact_id",
        ]
        fields = {k: v for k, v in kwargs.items() if k in allowed_fields}
        if not fields:
            return False
        set_clause = ", ".join([f"{k} = :{k}" for k in fields.keys()])
        params = {**fields, "tenant_id": tenant_id}
        async with engine.begin() as conn:
            result = await conn.execute(
                text(f"UPDATE tenants SET {set_clause} WHERE id = :tenant_id"), params
            )
        return result.rowcount > 0

    async def get_user_tenants(self, user_id: str) -> List[Dict[str, Any]]:
        try:
            async with engine.connect() as conn:
                result = await conn.execute(text("""
                    SELECT t.id, t.name, ut.role
                    FROM tenants t
                    JOIN user_tenants ut ON t.id = ut.tenant_id
                    WHERE ut.user_id = :user_id
                """), {"user_id": user_id})
                return [{"id": r[0], "name": r[1], "role": r[2]} for r in result.fetchall()]
        except Exception:
            return []

    # ============ Tasks ============

    async def create_task(self, tenant_id: str, title: str, description: str,
                          assignee_id: str) -> Dict[str, Any]:
        task_id = str(uuid4())
        async with engine.begin() as conn:
            await conn.execute(text("""
                INSERT INTO tasks (id, tenant_id, title, description, status, assigneeId, logs)
                VALUES (:id, :tid, :title, :desc, 'BACKLOG', :assignee, '')
            """), {"id": task_id, "tid": tenant_id, "title": title,
                   "desc": description, "assignee": assignee_id})
        return {"id": task_id, "title": title, "description": description,
                "status": "BACKLOG", "assigneeId": assignee_id}

    async def get_tasks(self, tenant_id: str) -> List[Dict[str, Any]]:
        async with engine.connect() as conn:
            result = await conn.execute(text("""
                SELECT id, title, description, status, assigneeId,
                       needsApproval, approved, logs
                FROM tasks WHERE tenant_id = :tid
            """), {"tid": tenant_id})
            return [
                {
                    "id": r[0], "title": r[1], "description": r[2], "status": r[3],
                    "assigneeId": r[4], "needsApproval": bool(r[5]), "approved": bool(r[6]),
                    "logs": r[7].split("|") if r[7] else [],
                }
                for r in result.fetchall()
            ]

    async def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        async with engine.connect() as conn:
            result = await conn.execute(
                text("SELECT id, status, title FROM tasks WHERE id = :id"), {"id": task_id}
            )
            row = result.fetchone()
            if row:
                return {"id": row[0], "status": row[1], "title": row[2]}
        return None

    async def update_task_status(self, task_id: str, status: str,
                                 logs: Optional[List[str]] = None) -> bool:
        logs_str = "|".join(logs) if logs else ""
        async with engine.begin() as conn:
            await conn.execute(
                text("UPDATE tasks SET status = :status, logs = :logs WHERE id = :id"),
                {"status": status, "logs": logs_str, "id": task_id}
            )
        return True

    # ============ Artifacts ============

    async def create_artifact(self, tenant_id: str, title: str, language: str, code: str,
                              artifact_type: str, project_id: Optional[str] = None,
                              filepath: Optional[str] = None) -> Dict[str, Any]:
        artifact_id = str(uuid4())
        timestamp = int(time.time() * 1000)
        async with engine.begin() as conn:
            await conn.execute(text("""
                INSERT INTO artifacts
                    (id, tenant_id, title, language, code, type, timestamp, project_id, filepath)
                VALUES (:id, :tid, :title, :lang, :code, :type, :ts, :pid, :fp)
            """), {"id": artifact_id, "tid": tenant_id, "title": title, "lang": language,
                   "code": code, "type": artifact_type, "ts": timestamp,
                   "pid": project_id, "fp": filepath})
        return {"id": artifact_id, "title": title, "language": language,
                "type": artifact_type, "timestamp": timestamp}

    async def update_artifact_code(self, artifact_id: str, code: str) -> bool:
        ts = int(time.time() * 1000)
        async with engine.begin() as conn:
            result = await conn.execute(
                text("UPDATE artifacts SET code = :code, timestamp = :ts WHERE id = :id"),
                {"code": code, "ts": ts, "id": artifact_id}
            )
        return result.rowcount > 0

    async def delete_artifact(self, artifact_id: str) -> bool:
        async with engine.begin() as conn:
            result = await conn.execute(
                text("DELETE FROM artifacts WHERE id = :id"), {"id": artifact_id}
            )
        return result.rowcount > 0

    async def get_artifacts(self, tenant_id: str) -> List[Dict[str, Any]]:
        async with engine.connect() as conn:
            result = await conn.execute(text("""
                SELECT id, title, language, code, type, timestamp, project_id, filepath
                FROM artifacts WHERE tenant_id = :tid
            """), {"tid": tenant_id})
            return [
                {"id": r[0], "title": r[1], "language": r[2], "code": r[3],
                 "type": r[4], "timestamp": r[5], "projectId": r[6], "filepath": r[7]}
                for r in result.fetchall()
            ]

    async def get_artifacts_by_project(self, project_id: str) -> List[Dict[str, Any]]:
        """Sem filtro de tenant — usado para servir artefatos publicamente."""
        async with engine.connect() as conn:
            result = await conn.execute(text("""
                SELECT id, title, language, code, type, timestamp, project_id, filepath
                FROM artifacts WHERE project_id = :pid
            """), {"pid": project_id})
            return [
                {"id": r[0], "title": r[1], "language": r[2], "code": r[3],
                 "type": r[4], "timestamp": r[5], "projectId": r[6], "filepath": r[7]}
                for r in result.fetchall()
            ]

    # ============ Projects ============

    async def create_project(self, tenant_id: str, name: str, description: str,
                             project_type: str, stack: str) -> Dict[str, Any]:
        project_id = str(uuid4())
        created_at = int(time.time() * 1000)
        async with engine.begin() as conn:
            await conn.execute(text("""
                INSERT INTO projects
                    (id, tenant_id, name, description, type, stack, status, created_at)
                VALUES (:id, :tid, :name, :desc, :type, :stack, 'ready', :created_at)
            """), {"id": project_id, "tid": tenant_id, "name": name, "desc": description,
                   "type": project_type, "stack": stack, "created_at": created_at})
        return {"id": project_id, "name": name, "description": description,
                "type": project_type, "stack": stack, "status": "ready", "createdAt": created_at}

    async def get_projects(self, tenant_id: str) -> List[Dict[str, Any]]:
        async with engine.connect() as conn:
            result = await conn.execute(text("""
                SELECT id, name, description, type, stack, status, created_at,
                       deployed_port, deployed_pid, deployed_url, custom_domain
                FROM projects WHERE tenant_id = :tid
            """), {"tid": tenant_id})
            return [
                {"id": r[0], "name": r[1], "description": r[2], "type": r[3],
                 "stack": r[4], "status": r[5], "createdAt": r[6], "deployedPort": r[7],
                 "deployedPid": r[8], "deployedUrl": r[9], "customDomain": r[10]}
                for r in result.fetchall()
            ]

    async def get_project(self, project_id: str, tenant_id: str) -> Optional[Dict[str, Any]]:
        async with engine.connect() as conn:
            result = await conn.execute(text("""
                SELECT id, name, description, type, stack, status, created_at, custom_domain
                FROM projects WHERE id = :id AND tenant_id = :tid
            """), {"id": project_id, "tid": tenant_id})
            row = result.fetchone()
            if row:
                return {"id": row[0], "name": row[1], "description": row[2], "type": row[3],
                        "stack": row[4], "status": row[5], "createdAt": row[6], "customDomain": row[7]}
        return None

    async def delete_project(self, project_id: str, tenant_id: str) -> bool:
        async with engine.begin() as conn:
            await conn.execute(
                text("DELETE FROM artifacts WHERE project_id = :pid AND tenant_id = :tid"),
                {"pid": project_id, "tid": tenant_id}
            )
            result = await conn.execute(
                text("DELETE FROM projects WHERE id = :pid AND tenant_id = :tid"),
                {"pid": project_id, "tid": tenant_id}
            )
        return result.rowcount > 0

    async def set_project_domain(self, project_id: str, tenant_id: str, domain: str) -> bool:
        async with engine.begin() as conn:
            result = await conn.execute(
                text("UPDATE projects SET custom_domain = :domain WHERE id = :pid AND tenant_id = :tid"),
                {"domain": domain.strip().lower() or None, "pid": project_id, "tid": tenant_id}
            )
        return result.rowcount > 0

    async def get_project_by_domain(self, domain: str) -> Optional[Dict[str, Any]]:
        async with engine.connect() as conn:
            result = await conn.execute(
                text("SELECT id, tenant_id, name FROM projects WHERE custom_domain = :domain"),
                {"domain": domain.strip().lower()}
            )
            row = result.fetchone()
            if row:
                return {"id": row[0], "tenant_id": row[1], "name": row[2]}
        return None

    # ============ Messages ============

    async def create_message(self, tenant_id: str, area_id: str, sender_id: str,
                             sender_name: str, text_content: str, role: str = "user",
                             artifact_id: Optional[str] = None) -> Dict[str, Any]:
        message_id = str(uuid4())
        timestamp = int(time.time() * 1000)
        async with engine.begin() as conn:
            await conn.execute(text("""
                INSERT INTO messages
                    (id, tenant_id, areaId, senderId, senderName, text, timestamp, role, artifactId)
                VALUES (:id, :tid, :area, :sender_id, :sender_name, :text, :ts, :role, :artifact)
            """), {"id": message_id, "tid": tenant_id, "area": area_id,
                   "sender_id": sender_id, "sender_name": sender_name,
                   "text": text_content, "ts": timestamp, "role": role, "artifact": artifact_id})
        return {"id": message_id, "senderId": sender_id, "senderName": sender_name,
                "text": text_content, "timestamp": timestamp, "role": role,
                "areaId": area_id, "artifactId": artifact_id}

    async def get_messages(self, tenant_id: str, area_id: str) -> List[Dict[str, Any]]:
        async with engine.connect() as conn:
            result = await conn.execute(text("""
                SELECT id, senderId, senderName, text, timestamp, role, artifactId
                FROM messages
                WHERE tenant_id = :tid AND areaId = :area
                ORDER BY timestamp ASC
            """), {"tid": tenant_id, "area": area_id})
            return [
                {"id": r[0], "senderId": r[1], "senderName": r[2], "text": r[3],
                 "timestamp": r[4], "role": r[5], "artifactId": r[6], "areaId": area_id}
                for r in result.fetchall()
            ]

    # ============ Memory ============

    async def save_memory(self, tenant_id: str, key: str, value: str) -> Dict[str, Any]:
        """Upsert atômico de memória key-value por tenant."""
        mem_id = str(uuid4())
        timestamp = int(time.time() * 1000)
        async with engine.begin() as conn:
            await conn.execute(
                text("DELETE FROM memory WHERE tenant_id = :tid AND agent_id = :key AND role = 'kv'"),
                {"tid": tenant_id, "key": key}
            )
            await conn.execute(text("""
                INSERT INTO memory (id, tenant_id, agent_id, role, content, timestamp)
                VALUES (:id, :tid, :key, 'kv', :value, :ts)
            """), {"id": mem_id, "tid": tenant_id, "key": key, "value": value, "ts": timestamp})
        return {"id": mem_id, "key": key, "value": value}

    async def get_memories(self, tenant_id: str) -> List[Dict[str, Any]]:
        async with engine.connect() as conn:
            result = await conn.execute(text("""
                SELECT agent_id, content, timestamp FROM memory
                WHERE tenant_id = :tid AND role = 'kv'
                ORDER BY timestamp ASC
            """), {"tid": tenant_id})
            return [{"key": r[0], "value": r[1], "timestamp": r[2]} for r in result.fetchall()]

    # ============ Agent Logs ============

    async def create_agent_log(self, tenant_id: str, from_agent: str, to_agent: str,
                               event_type: str, payload: str, tokens_consumed: int = 0,
                               credits_consumed: int = 0, duration_ms: int = 0,
                               status: str = "completed",
                               project_id: Optional[str] = None) -> Dict[str, Any]:
        log_id = str(uuid4())
        created_at = int(time.time() * 1000)
        async with engine.begin() as conn:
            await conn.execute(text("""
                INSERT INTO agent_logs
                    (id, tenant_id, project_id, from_agent, to_agent, event_type, payload,
                     tokens_consumed, credits_consumed, duration_ms, status, created_at)
                VALUES (:id, :tid, :pid, :from_a, :to_a, :etype, :payload,
                        :tokens, :credits, :duration, :status, :created_at)
            """), {"id": log_id, "tid": tenant_id, "pid": project_id, "from_a": from_agent,
                   "to_a": to_agent, "etype": event_type, "payload": payload,
                   "tokens": tokens_consumed, "credits": credits_consumed,
                   "duration": duration_ms, "status": status, "created_at": created_at})
        return {"id": log_id, "status": status}

    # ============ Leads ============

    async def create_lead(self, project_id: str, tenant_id: str, name: str, email: str,
                          phone: str = "", company: str = "", source: str = "",
                          message: str = "") -> Dict[str, Any]:
        lead_id = str(uuid4())
        ts = int(time.time() * 1000)
        async with engine.begin() as conn:
            await conn.execute(text("""
                INSERT INTO leads
                    (id, project_id, tenant_id, name, email, phone, company, source, message, timestamp)
                VALUES (:id, :pid, :tid, :name, :email, :phone, :company, :source, :message, :ts)
            """), {"id": lead_id, "pid": project_id, "tid": tenant_id, "name": name,
                   "email": email, "phone": phone, "company": company,
                   "source": source, "message": message, "ts": ts})
        return {"id": lead_id, "project_id": project_id, "name": name, "email": email,
                "phone": phone, "company": company, "source": source, "message": message, "timestamp": ts}

    async def get_leads(self, tenant_id: str, project_id: Optional[str] = None) -> List[Dict[str, Any]]:
        async with engine.connect() as conn:
            if project_id:
                result = await conn.execute(text("""
                    SELECT id, project_id, name, email, phone, company, source, message, timestamp
                    FROM leads WHERE tenant_id = :tid AND project_id = :pid
                    ORDER BY timestamp DESC
                """), {"tid": tenant_id, "pid": project_id})
            else:
                result = await conn.execute(text("""
                    SELECT id, project_id, name, email, phone, company, source, message, timestamp
                    FROM leads WHERE tenant_id = :tid
                    ORDER BY timestamp DESC
                """), {"tid": tenant_id})
            return [
                {"id": r[0], "projectId": r[1], "name": r[2], "email": r[3], "phone": r[4],
                 "company": r[5], "source": r[6], "message": r[7], "timestamp": r[8]}
                for r in result.fetchall()
            ]

    # ============ Project Infra (registro no banco principal) ============

    async def upsert_project_infra(self, project_id: str, tenant_id: str, db_path: str,
                                   tables: str, schema_sql: str, provisioned_at: str) -> None:
        """Registra ou atualiza metadados de infra de um projeto gerado."""
        async with engine.begin() as conn:
            # Tenta INSERT; se já existir, faz UPDATE
            try:
                await conn.execute(text("""
                    INSERT INTO project_infra
                        (project_id, tenant_id, db_path, tables, schema_sql, provisioned_at)
                    VALUES (:pid, :tid, :db_path, :tables, :schema_sql, :provisioned_at)
                """), {"pid": project_id, "tid": tenant_id, "db_path": db_path,
                       "tables": tables, "schema_sql": schema_sql, "provisioned_at": provisioned_at})
            except Exception:
                await conn.execute(text("""
                    UPDATE project_infra
                    SET tenant_id = :tid, db_path = :db_path, tables = :tables,
                        schema_sql = :schema_sql, provisioned_at = :provisioned_at
                    WHERE project_id = :pid
                """), {"pid": project_id, "tid": tenant_id, "db_path": db_path,
                       "tables": tables, "schema_sql": schema_sql, "provisioned_at": provisioned_at})
