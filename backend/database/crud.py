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

    # ============ Sales Pipeline ============

    async def create_sales_lead(self, tenant_id: str, name: str, email: str = "",
                                phone: str = "", company: str = "", role: str = "",
                                linkedin_url: str = "", source: str = "manual",
                                fit_score: int = 0, notes: str = "") -> Dict[str, Any]:
        lead_id = str(uuid4())
        now = int(time.time() * 1000)
        async with engine.begin() as conn:
            await conn.execute(text("""
                INSERT INTO sales_pipeline
                    (id, tenant_id, name, email, phone, company, role, linkedin_url,
                     source, fit_score, stage, notes, created_at, updated_at)
                VALUES (:id, :tid, :name, :email, :phone, :company, :role, :linkedin,
                        :source, :fit, 'prospectado', :notes, :now, :now)
            """), {"id": lead_id, "tid": tenant_id, "name": name, "email": email,
                   "phone": phone, "company": company, "role": role,
                   "linkedin": linkedin_url, "source": source, "fit": fit_score,
                   "notes": notes, "now": now})
        return {"id": lead_id, "name": name, "email": email, "company": company,
                "stage": "prospectado", "fit_score": fit_score}

    async def update_sales_lead_stage(self, lead_id: str, tenant_id: str,
                                      stage: str, notes: str = "") -> bool:
        now = int(time.time() * 1000)
        async with engine.begin() as conn:
            await conn.execute(text("""
                UPDATE sales_pipeline
                SET stage = :stage, last_contact = :now, updated_at = :now,
                    notes = CASE WHEN :notes != '' THEN :notes ELSE notes END
                WHERE id = :id AND tenant_id = :tid
            """), {"stage": stage, "now": now, "notes": notes, "id": lead_id, "tid": tenant_id})
        return True

    async def get_sales_pipeline(self, tenant_id: str,
                                 stage: Optional[str] = None) -> List[Dict[str, Any]]:
        async with engine.connect() as conn:
            if stage:
                result = await conn.execute(text("""
                    SELECT id, name, email, phone, company, role, linkedin_url,
                           source, fit_score, stage, notes, last_contact, next_action,
                           created_at, updated_at
                    FROM sales_pipeline WHERE tenant_id = :tid AND stage = :stage
                    ORDER BY updated_at DESC
                """), {"tid": tenant_id, "stage": stage})
            else:
                result = await conn.execute(text("""
                    SELECT id, name, email, phone, company, role, linkedin_url,
                           source, fit_score, stage, notes, last_contact, next_action,
                           created_at, updated_at
                    FROM sales_pipeline WHERE tenant_id = :tid
                    ORDER BY updated_at DESC
                """), {"tid": tenant_id})
            return [
                {"id": r[0], "name": r[1], "email": r[2], "phone": r[3], "company": r[4],
                 "role": r[5], "linkedinUrl": r[6], "source": r[7], "fitScore": r[8],
                 "stage": r[9], "notes": r[10], "lastContact": r[11], "nextAction": r[12],
                 "createdAt": r[13], "updatedAt": r[14]}
                for r in result.fetchall()
            ]

    # ============ Email Sequences ============

    async def create_email_sequence(self, tenant_id: str, name: str,
                                    target_segment: str, emails_json: str) -> Dict[str, Any]:
        seq_id = str(uuid4())
        now = int(time.time() * 1000)
        async with engine.begin() as conn:
            await conn.execute(text("""
                INSERT INTO email_sequences
                    (id, tenant_id, name, target_segment, status, emails_json, stats_json, created_at, updated_at)
                VALUES (:id, :tid, :name, :seg, 'draft', :emails, '{}', :now, :now)
            """), {"id": seq_id, "tid": tenant_id, "name": name,
                   "seg": target_segment, "emails": emails_json, "now": now})
        return {"id": seq_id, "name": name, "status": "draft"}

    async def get_email_sequences(self, tenant_id: str) -> List[Dict[str, Any]]:
        async with engine.connect() as conn:
            result = await conn.execute(text("""
                SELECT id, name, target_segment, status, emails_json, stats_json, created_at
                FROM email_sequences WHERE tenant_id = :tid ORDER BY created_at DESC
            """), {"tid": tenant_id})
            return [
                {"id": r[0], "name": r[1], "targetSegment": r[2], "status": r[3],
                 "emails": r[4], "stats": r[5], "createdAt": r[6]}
                for r in result.fetchall()
            ]

    # ============ WhatsApp Conversations ============

    async def upsert_whatsapp_conversation(self, tenant_id: str, contact_phone: str,
                                           contact_name: str, last_message: str,
                                           messages_json: str,
                                           status: str = "auto") -> Dict[str, Any]:
        now = int(time.time() * 1000)
        async with engine.begin() as conn:
            existing = await conn.execute(text("""
                SELECT id FROM whatsapp_conversations
                WHERE tenant_id = :tid AND contact_phone = :phone
            """), {"tid": tenant_id, "phone": contact_phone})
            row = existing.fetchone()
            if row:
                await conn.execute(text("""
                    UPDATE whatsapp_conversations
                    SET contact_name = :name, last_message = :msg, last_message_at = :now,
                        status = :status, messages_json = :msgs, updated_at = :now
                    WHERE id = :id
                """), {"name": contact_name, "msg": last_message, "now": now,
                       "status": status, "msgs": messages_json, "id": row[0]})
                return {"id": row[0], "updated": True}
            else:
                conv_id = str(uuid4())
                await conn.execute(text("""
                    INSERT INTO whatsapp_conversations
                        (id, tenant_id, contact_phone, contact_name, last_message,
                         last_message_at, status, messages_json, created_at, updated_at)
                    VALUES (:id, :tid, :phone, :name, :msg, :now, :status, :msgs, :now, :now)
                """), {"id": conv_id, "tid": tenant_id, "phone": contact_phone,
                       "name": contact_name, "msg": last_message, "now": now,
                       "status": status, "msgs": messages_json})
                return {"id": conv_id, "updated": False}

    async def get_whatsapp_conversations(self, tenant_id: str) -> List[Dict[str, Any]]:
        async with engine.connect() as conn:
            result = await conn.execute(text("""
                SELECT id, contact_phone, contact_name, last_message, last_message_at, status, messages_json
                FROM whatsapp_conversations WHERE tenant_id = :tid
                ORDER BY last_message_at DESC
            """), {"tid": tenant_id})
            return [
                {"id": r[0], "contactPhone": r[1], "contactName": r[2],
                 "lastMessage": r[3], "lastMessageAt": r[4], "status": r[5], "messages": r[6]}
                for r in result.fetchall()
            ]

    # ============ Inter-BU Tasks ============

    async def create_inter_bu_task(self, tenant_id: str, from_bu: str, to_bu: str,
                                   task_type: str, briefing: str) -> Dict[str, Any]:
        task_id = str(uuid4())
        created_at = int(time.time() * 1000)
        async with engine.begin() as conn:
            await conn.execute(text("""
                INSERT INTO inter_bu_tasks
                    (id, tenant_id, from_bu, to_bu, task_type, briefing, status, created_at)
                VALUES (:id, :tid, :from_bu, :to_bu, :task_type, :briefing, 'pending', :created_at)
            """), {"id": task_id, "tid": tenant_id, "from_bu": from_bu, "to_bu": to_bu,
                   "task_type": task_type, "briefing": briefing, "created_at": created_at})
        return {"id": task_id, "from_bu": from_bu, "to_bu": to_bu,
                "task_type": task_type, "status": "pending", "created_at": created_at}

    async def get_inter_bu_task(self, task_id: str, tenant_id: str) -> Optional[Dict[str, Any]]:
        async with engine.connect() as conn:
            result = await conn.execute(text("""
                SELECT id, tenant_id, from_bu, to_bu, task_type, briefing, status, result, created_at, completed_at
                FROM inter_bu_tasks WHERE id = :id AND tenant_id = :tid
            """), {"id": task_id, "tid": tenant_id})
            row = result.fetchone()
            if row:
                return {"id": row[0], "tenant_id": row[1], "from_bu": row[2], "to_bu": row[3],
                        "task_type": row[4], "briefing": row[5], "status": row[6],
                        "result": row[7], "created_at": row[8], "completed_at": row[9]}
        return None

    async def update_inter_bu_task(self, task_id: str, status: str,
                                   result: Optional[str] = None) -> bool:
        completed_at = int(time.time() * 1000) if status in ("done", "failed") else None
        async with engine.begin() as conn:
            if completed_at:
                await conn.execute(text("""
                    UPDATE inter_bu_tasks
                    SET status = :status, result = :result, completed_at = :completed_at
                    WHERE id = :id
                """), {"status": status, "result": result, "completed_at": completed_at, "id": task_id})
            else:
                await conn.execute(text("""
                    UPDATE inter_bu_tasks SET status = :status WHERE id = :id
                """), {"status": status, "id": task_id})
        return True

    async def get_pending_inter_bu_tasks(self, tenant_id: str, to_bu: str) -> List[Dict[str, Any]]:
        async with engine.connect() as conn:
            result = await conn.execute(text("""
                SELECT id, from_bu, task_type, briefing, created_at
                FROM inter_bu_tasks
                WHERE tenant_id = :tid AND to_bu = :to_bu AND status = 'pending'
                ORDER BY created_at ASC
            """), {"tid": tenant_id, "to_bu": to_bu})
            return [{"id": r[0], "from_bu": r[1], "task_type": r[2],
                     "briefing": r[3], "created_at": r[4]} for r in result.fetchall()]

    # ============ BU Memory ============

    async def save_bu_memory(self, tenant_id: str, category: str, key_name: str,
                             value: str, bu_origin: Optional[str] = None,
                             confidence: float = 1.0) -> Dict[str, Any]:
        """Upsert: se já existe (tenant+category+key_name), atualiza. Senão, insere."""
        now = int(time.time() * 1000)
        async with engine.begin() as conn:
            existing = await conn.execute(text("""
                SELECT id FROM bu_memory
                WHERE tenant_id = :tid AND category = :cat AND key_name = :key
            """), {"tid": tenant_id, "cat": category, "key": key_name})
            row = existing.fetchone()
            if row:
                await conn.execute(text("""
                    UPDATE bu_memory
                    SET value = :value, confidence = :conf, bu_origin = :bu_origin, updated_at = :now
                    WHERE id = :id
                """), {"value": value, "conf": confidence, "bu_origin": bu_origin,
                       "now": now, "id": row[0]})
                return {"id": row[0], "category": category, "key_name": key_name, "updated": True}
            else:
                mem_id = str(uuid4())
                await conn.execute(text("""
                    INSERT INTO bu_memory
                        (id, tenant_id, bu_origin, category, key_name, value, confidence, created_at, updated_at)
                    VALUES (:id, :tid, :bu_origin, :cat, :key, :value, :conf, :now, :now)
                """), {"id": mem_id, "tid": tenant_id, "bu_origin": bu_origin,
                       "cat": category, "key": key_name, "value": value,
                       "conf": confidence, "now": now})
                return {"id": mem_id, "category": category, "key_name": key_name, "updated": False}

    async def get_bu_memories(self, tenant_id: str,
                              category: Optional[str] = None,
                              limit: int = 20) -> List[Dict[str, Any]]:
        async with engine.connect() as conn:
            if category:
                result = await conn.execute(text("""
                    SELECT id, bu_origin, category, key_name, value, confidence, updated_at
                    FROM bu_memory
                    WHERE tenant_id = :tid AND category = :cat
                    ORDER BY updated_at DESC LIMIT :limit
                """), {"tid": tenant_id, "cat": category, "limit": limit})
            else:
                result = await conn.execute(text("""
                    SELECT id, bu_origin, category, key_name, value, confidence, updated_at
                    FROM bu_memory
                    WHERE tenant_id = :tid
                    ORDER BY updated_at DESC LIMIT :limit
                """), {"tid": tenant_id, "limit": limit})
            return [{"id": r[0], "bu_origin": r[1], "category": r[2], "key_name": r[3],
                     "value": r[4], "confidence": r[5], "updated_at": r[6]}
                    for r in result.fetchall()]

    # ============ Artifact Versions (histórico de versões) ============

    async def save_artifact_version(self, artifact_id: str, tenant_id: str,
                                    code: str, label: str = "") -> dict:
        """Salva snapshot do código atual antes de editar."""
        import time
        vid = str(__import__("uuid").uuid4())
        now = int(time.time() * 1000)
        async with engine.begin() as conn:
            await conn.execute(text("""
                INSERT INTO artifact_versions (id, artifact_id, tenant_id, code, created_at, label)
                VALUES (:id, :aid, :tid, :code, :now, :label)
            """), {"id": vid, "aid": artifact_id, "tid": tenant_id,
                   "code": code, "now": now, "label": label or f"v{now}"})
        return {"id": vid, "artifact_id": artifact_id, "created_at": now, "label": label}

    async def get_artifact_versions(self, artifact_id: str, tenant_id: str,
                                    limit: int = 20) -> list:
        """Lista versões anteriores de um artefato (mais recentes primeiro)."""
        async with engine.connect() as conn:
            result = await conn.execute(text("""
                SELECT id, artifact_id, created_at, label, LENGTH(code) as code_len
                FROM artifact_versions
                WHERE artifact_id = :aid AND tenant_id = :tid
                ORDER BY created_at DESC LIMIT :limit
            """), {"aid": artifact_id, "tid": tenant_id, "limit": limit})
            return [{"id": r[0], "artifact_id": r[1], "created_at": r[2],
                     "label": r[3], "code_length": r[4]} for r in result.fetchall()]

    async def get_artifact_version_code(self, version_id: str, tenant_id: str) -> str | None:
        """Retorna o código de uma versão específica."""
        async with engine.connect() as conn:
            result = await conn.execute(text("""
                SELECT code FROM artifact_versions WHERE id = :id AND tenant_id = :tid
            """), {"id": version_id, "tid": tenant_id})
            row = result.fetchone()
            return row[0] if row else None

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
