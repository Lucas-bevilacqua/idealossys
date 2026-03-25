"""
Inicialização do schema do banco de dados.
Suporta SQLite (desenvolvimento) e PostgreSQL (produção) via SQLAlchemy async.
"""

import os
from uuid import uuid4
from sqlalchemy import text
from .engine import engine, IS_SQLITE

# Mantido para compatibilidade com project_infra.py (bancos SQLite por projeto)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./idealos.db")


def get_db_path() -> str:
    """Retorna o caminho do arquivo SQLite (usado apenas por project_infra.py)."""
    url = DATABASE_URL
    if url.startswith("sqlite:///"):
        return url.replace("sqlite:///", "")
    elif url.startswith("sqlite://"):
        return url.replace("sqlite://", "")
    return "idealos.db"


async def init_db() -> None:
    """Inicializa o schema do banco de dados de forma async."""
    async with engine.begin() as conn:

        # WAL mode para SQLite (melhor concorrência) — ignorado silenciosamente no PostgreSQL
        if IS_SQLITE:
            try:
                await conn.execute(text("PRAGMA journal_mode=WAL"))
                await conn.execute(text("PRAGMA synchronous=NORMAL"))
            except Exception:
                pass  # WAL indisponível (NFS, read-only) — continua com modo padrão

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE,
                password TEXT,
                name TEXT,
                email TEXT
            )
        """))

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS tenants (
                id TEXT PRIMARY KEY,
                name TEXT,
                description TEXT,
                industry TEXT,
                goals TEXT,
                target_audience TEXT,
                challenges TEXT,
                website_url TEXT,
                logo_url TEXT,
                brand_colors TEXT,
                brand_tone TEXT,
                credits INTEGER DEFAULT 5000,
                plan TEXT DEFAULT 'starter',
                custom_domain TEXT,
                published_artifact_id TEXT
            )
        """))

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS user_tenants (
                user_id TEXT,
                tenant_id TEXT,
                role TEXT,
                PRIMARY KEY(user_id, tenant_id),
                FOREIGN KEY(user_id) REFERENCES users(id),
                FOREIGN KEY(tenant_id) REFERENCES tenants(id)
            )
        """))

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                tenant_id TEXT,
                title TEXT,
                description TEXT,
                status TEXT,
                assigneeId TEXT,
                needsApproval INTEGER DEFAULT 0,
                approved INTEGER DEFAULT 0,
                logs TEXT,
                FOREIGN KEY(tenant_id) REFERENCES tenants(id)
            )
        """))

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS artifacts (
                id TEXT PRIMARY KEY,
                tenant_id TEXT,
                title TEXT,
                language TEXT,
                code TEXT,
                type TEXT,
                timestamp INTEGER,
                project_id TEXT,
                filepath TEXT,
                FOREIGN KEY(tenant_id) REFERENCES tenants(id)
            )
        """))

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                tenant_id TEXT,
                areaId TEXT,
                senderId TEXT,
                senderName TEXT,
                text TEXT,
                timestamp INTEGER,
                role TEXT,
                artifactId TEXT,
                attachment TEXT,
                FOREIGN KEY(tenant_id) REFERENCES tenants(id)
            )
        """))

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS memory (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                agent_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                FOREIGN KEY(tenant_id) REFERENCES tenants(id)
            )
        """))

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS agent_logs (
                id TEXT PRIMARY KEY,
                tenant_id TEXT,
                project_id TEXT,
                vertical_id TEXT,
                from_agent TEXT,
                to_agent TEXT,
                event_type TEXT,
                payload TEXT,
                tokens_consumed INTEGER,
                credits_consumed INTEGER,
                duration_ms INTEGER,
                status TEXT,
                created_at INTEGER,
                FOREIGN KEY(tenant_id) REFERENCES tenants(id)
            )
        """))

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                tenant_id TEXT,
                name TEXT,
                description TEXT,
                type TEXT DEFAULT 'web',
                stack TEXT,
                status TEXT DEFAULT 'ready',
                created_at INTEGER,
                deployed_port INTEGER,
                deployed_pid INTEGER,
                deployed_url TEXT,
                custom_domain TEXT,
                FOREIGN KEY(tenant_id) REFERENCES tenants(id)
            )
        """))

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS leads (
                id TEXT PRIMARY KEY,
                project_id TEXT,
                tenant_id TEXT,
                name TEXT,
                email TEXT,
                phone TEXT,
                company TEXT,
                source TEXT,
                message TEXT,
                timestamp INTEGER,
                FOREIGN KEY(project_id) REFERENCES projects(id)
            )
        """))

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS project_infra (
                project_id TEXT PRIMARY KEY,
                tenant_id TEXT,
                db_path TEXT,
                tables TEXT,
                schema_sql TEXT,
                provisioned_at TEXT
            )
        """))

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS inter_bu_tasks (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                from_bu TEXT NOT NULL,
                to_bu TEXT NOT NULL,
                task_type TEXT NOT NULL,
                briefing TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                result TEXT,
                created_at INTEGER,
                completed_at INTEGER
            )
        """))

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS bu_memory (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                bu_origin TEXT,
                category TEXT NOT NULL,
                key_name TEXT NOT NULL,
                value TEXT NOT NULL,
                confidence REAL DEFAULT 1.0,
                created_at INTEGER,
                updated_at INTEGER
            )
        """))

        # Migração: adiciona custom_domain se não existir (compatibilidade com DBs antigos)
        if IS_SQLITE:
            try:
                await conn.execute(text("ALTER TABLE projects ADD COLUMN custom_domain TEXT"))
            except Exception:
                pass  # Coluna já existe — ignorar

        # Índices de performance
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_artifacts_tenant ON artifacts(tenant_id)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_artifacts_project ON artifacts(project_id)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_tasks_tenant ON tasks(tenant_id)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_messages_area ON messages(tenant_id, areaId)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects(tenant_id)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_memory_tenant ON memory(tenant_id)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_leads_project ON leads(project_id)"))
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS sales_pipeline (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                name TEXT,
                email TEXT,
                phone TEXT,
                company TEXT,
                role TEXT,
                linkedin_url TEXT,
                source TEXT DEFAULT 'manual',
                fit_score INTEGER DEFAULT 0,
                stage TEXT DEFAULT 'prospectado',
                notes TEXT,
                last_contact INTEGER,
                next_action TEXT,
                created_at INTEGER,
                updated_at INTEGER
            )
        """))

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS email_sequences (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                name TEXT,
                target_segment TEXT,
                status TEXT DEFAULT 'draft',
                emails_json TEXT,
                stats_json TEXT,
                created_at INTEGER,
                updated_at INTEGER
            )
        """))

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS whatsapp_conversations (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                contact_phone TEXT NOT NULL,
                contact_name TEXT,
                last_message TEXT,
                last_message_at INTEGER,
                status TEXT DEFAULT 'auto',
                messages_json TEXT,
                created_at INTEGER,
                updated_at INTEGER
            )
        """))

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS artifact_versions (
                id TEXT PRIMARY KEY,
                artifact_id TEXT NOT NULL,
                tenant_id TEXT NOT NULL,
                code TEXT NOT NULL,
                created_at INTEGER,
                label TEXT
            )
        """))

        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_inter_bu_tasks_tenant ON inter_bu_tasks(tenant_id)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_inter_bu_tasks_status ON inter_bu_tasks(tenant_id, status)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_bu_memory_tenant ON bu_memory(tenant_id, category)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_sales_pipeline_tenant ON sales_pipeline(tenant_id, stage)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_email_sequences_tenant ON email_sequences(tenant_id)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_whatsapp_tenant ON whatsapp_conversations(tenant_id)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_artifact_versions ON artifact_versions(artifact_id, created_at)"))

    # Seed: cria admin padrão se não existir
    await _seed_admin()
    print("Schema do banco de dados inicializado com sucesso")


async def _seed_admin() -> None:
    """Cria o usuário admin padrão na primeira execução."""
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT id FROM users WHERE username = 'admin'"))
        if result.fetchone():
            return  # Admin já existe

    try:
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
        password_hash = pwd_context.hash("idealos123")
    except ImportError as e:
        raise RuntimeError(
            f"passlib[argon2] é necessário para inicializar o banco. "
            f"Instale com: pip install 'passlib[argon2]'. Erro original: {e}"
        )

    user_id = str(uuid4())
    tenant_id = str(uuid4())

    async with engine.begin() as conn:
        await conn.execute(text(
            "INSERT INTO users (id, username, password, name, email) VALUES (:id, :u, :p, :n, :e)"
        ), {"id": user_id, "u": "admin", "p": password_hash, "n": "Administrador", "e": "admin@idealos.com"})

        await conn.execute(text(
            "INSERT INTO tenants (id, name, description) VALUES (:id, :n, :d)"
        ), {"id": tenant_id, "n": "Minha Empresa", "d": "Ambiente padrão do IdealOS"})

        await conn.execute(text(
            "INSERT INTO user_tenants (user_id, tenant_id, role) VALUES (:u, :t, :r)"
        ), {"u": user_id, "t": tenant_id, "r": "OWNER"})

    print("Usuário admin criado com senha argon2")
