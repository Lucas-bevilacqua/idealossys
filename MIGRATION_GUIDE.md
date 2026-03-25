# IdealOS Migration Guide: TypeScript → Python + Agno

## Overview

This document guides you through the migration from the TypeScript/Express backend to the new Python/FastAPI backend powered by the Agno framework.

## What Changed

### Backend Stack
- **Old**: Express.js + LangChain + better-sqlite3
- **New**: FastAPI + Agno framework + aiosqlite

### Architecture
- **Old**: Single Node.js process with session-based auth
- **New**: FastAPI with JWT authentication + Agno Team-based agent coordination

### Key Benefits
- **Performance**: 529× faster than LangGraph (Agno benchmark)
- **Memory**: 24× less memory consumption
- **Native Multi-Agent**: Agno is built from ground up for agent teams
- **Async Native**: FastAPI's async/await is more efficient than Node.js callbacks
- **Type Safety**: Pydantic models + Python type hints

## Setup Instructions

### 1. Install Python Dependencies

```bash
# Navigate to project root
cd systemos-main

# Create virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt
```

### 2. Configure Environment

The `.env` file is already configured with:
- `GEMINI_API_KEY`: Your Gemini API key (already set)
- `SECRET_KEY`: JWT signing secret (change in production)
- `ENVIRONMENT`: Set to "development" or "production"
- `DATABASE_URL`: Path to SQLite database

### 3. Initialize Database

The database is automatically initialized when you start the backend. It will:
- Create all required tables
- Seed admin user (username: `admin`, password: `idealos123`)
- Set up default tenant

### 4. Start Development Servers

```bash
# Option 1: Start both backend and frontend together
npm run dev

# Option 2: Start them separately
# Terminal 1: Backend
npm run backend
# uvicorn backend.main:app --reload --port 8000

# Terminal 2: Frontend
npm run frontend
# vite
```

### 5. Test the Setup

```bash
# Check backend health
curl http://localhost:8000/health

# Check API docs (interactive Swagger UI)
open http://localhost:8000/docs

# Login to frontend
open http://localhost:5173
# Username: admin
# Password: idealos123
```

## API Changes

### Authentication

**Old (Express + Sessions):**
```
POST /api/auth/login
  → Sets express-session cookie
  → Session stored server-side
```

**New (FastAPI + JWT):**
```
POST /api/auth/login
  → Returns JWT token
  → Token stored in httponly cookie
  → Validates token on every request
```

### Agent Streaming

**Old (Express + res.write):**
```javascript
res.write('event: message\ndata: {...}\n\n');
```

**New (FastAPI + SSE):**
```python
yield f'event: agent_message\ndata: {json.dumps({...})}\n\n'
```

Both use Server-Sent Events (SSE), so frontend code doesn't need to change.

### Database

**Old (better-sqlite3 - synchronous):**
```typescript
const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
```

**New (aiosqlite - async):**
```python
async with await db._get_db() as db_conn:
    async with db_conn.execute(...) as cursor:
        user = await cursor.fetchone()
```

All database operations are async, enabling better concurrency.

## Agno Framework

### Agents

The team consists of 6 specialist agents coordinated by Hélio (OS-Core):

1. **Sarah** (PM) - Requirements analysis and prioritization
2. **Alex** (UX/UI) - Design and UX
3. **Bruno** (Dev-FE) - Frontend development
4. **Carla** (Dev-BE) - Backend development
5. **Diego** (QA) - Quality assurance and testing
6. **Elena** (DevOps) - Deployment and infrastructure

### Team Orchestration

```python
team = get_os_core_team(tenant_id=tenant_id)
response = team.run(user_prompt)  # Orchestrates all agents
```

The `TeamMode.coordinate` mode means:
- Hélio is the leader
- Hélio delegates to specialists
- Each specialist executes their tasks
- Hélio coordinates the output

## Database Schema

No schema changes - uses the same `idealos.db` with same tables:
- `users` - User accounts
- `tenants` - Customer workspaces
- `user_tenants` - User-tenant relationships
- `tasks` - Project tasks
- `artifacts` - Generated code/content
- `projects` - User projects
- `messages` - Chat history
- `memory` - Agent memory
- `agent_logs` - Agent interaction logs

## Frontend Changes

Minimal changes required:

1. **Update Vite config** (already done):
   ```typescript
   proxy: {
     '/api': { target: 'http://localhost:8000', ... }
   }
   ```

2. **SSE streaming works the same**:
   ```typescript
   const eventSource = new EventSource('/api/agent/stream');
   eventSource.addEventListener('agent_message', (e) => {...});
   ```

## Deployment

### Development
```bash
npm run dev  # Starts both services
```

### Production
```bash
# Build frontend
npm run build

# Start backend (backend serves static frontend)
# Add to backend/main.py:
from fastapi.staticfiles import StaticFiles
app.mount("/", StaticFiles(directory="dist", html=True), name="frontend")

# Run on port 8000
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

## Troubleshooting

### "ModuleNotFoundError: No module named 'agno'"
```bash
pip install -r backend/requirements.txt
```

### "GEMINI_API_KEY not set"
Check `.env` file has valid API key from https://aistudio.google.com/apikey

### "Port 8000 already in use"
```bash
# Find and kill process on port 8000
lsof -i :8000
kill -9 <PID>
```

### Database locked errors
```bash
# Remove stale database locks
rm -f idealos.db-shm idealos.db-wal
```

## Migration Checklist

- [x] Created backend directory structure
- [x] Implemented database schema (aiosqlite)
- [x] Created CRUD operations
- [x] Implemented JWT authentication
- [x] Created Agno agent specialists
- [x] Implemented team orchestrator
- [x] Created SSE streaming routes
- [x] Implemented all API endpoints
- [x] Updated Vite config (proxy to 8000)
- [x] Updated package.json (scripts, dependencies)
- [x] Updated .env file
- [ ] Test login flow
- [ ] Test agent streaming
- [ ] Test artifact generation
- [ ] Test project deployment
- [ ] Performance benchmarks
- [ ] Production deployment

## Next Steps

1. **Install dependencies**: `pip install -r backend/requirements.txt`
2. **Start development**: `npm run dev`
3. **Test in browser**: `http://localhost:5173`
4. **Check agent orchestration**: `http://localhost:8000/docs`
5. **Run tests**: `pytest backend/tests/` (create test files)

## Support

For issues:
1. Check `.env` configuration
2. Review backend logs: `npm run backend`
3. Check Swagger UI: `http://localhost:8000/docs`
4. Verify database: `sqlite3 idealos.db ".schema"`

---

**Happy migrating! 🚀**
