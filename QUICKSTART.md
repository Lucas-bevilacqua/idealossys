# IdealOS Python Backend - Quick Start

## ⚡ 5-Minute Setup

### 1. Install Python Dependencies (2 min)
```bash
pip install -r backend/requirements.txt
```

### 2. Start Development (1 min)
```bash
npm run dev
```
This starts both the Python backend (port 8000) and React frontend (port 5173) concurrently.

### 3. Test in Browser (2 min)
```
Open: http://localhost:5173
Login: admin / idealos123
```

---

## 📚 Key URLs

| URL | Purpose |
|-----|---------|
| `http://localhost:5173` | React frontend |
| `http://localhost:8000` | Python backend API |
| `http://localhost:8000/docs` | Interactive API docs (Swagger) |
| `http://localhost:8000/redoc` | ReDoc API documentation |
| `http://localhost:8000/health` | Backend health check |

---

## 🛠️ Useful Commands

```bash
# Start both services together
npm run dev

# Start backend only
npm run backend

# Start frontend only
npm run frontend

# Production build
npm run build

# Run backend tests
pytest backend/

# Check Python syntax
python -m py_compile backend/main.py

# Database inspection
sqlite3 idealos.db ".schema"
sqlite3 idealos.db "SELECT * FROM users;"
```

---

## 📁 Important Files

- **`backend/main.py`** - FastAPI entry point
- **`backend/agents/orchestrator.py`** - Agno team configuration
- **`.env`** - Configuration (API keys, etc)
- **`MIGRATION_GUIDE.md`** - Detailed migration instructions
- **`IMPLEMENTATION_SUMMARY.md`** - Complete technical documentation

---

## 🔐 Default Credentials

```
Username: admin
Password: idealos123
```

⚠️ Change these in production!

---

## 🐛 Troubleshooting

### Python not found
```bash
# Ensure Python 3.8+ is installed
python --version

# Or use python3
python3 -c "import sys; print(sys.version)"
```

### Port 8000 already in use
```bash
# Find process on port 8000
lsof -i :8000

# Kill it
kill -9 <PID>
```

### ModuleNotFoundError: No module named 'agno'
```bash
# Reinstall dependencies
pip install --upgrade -r backend/requirements.txt
```

### Database locked
```bash
# Remove lock files
rm -f idealos.db-shm idealos.db-wal
```

---

## 📊 Architecture at a Glance

```
Frontend (React)          Backend (FastAPI)           LLM (Gemini)
─────────────────          ───────────────             ────────────
  5173                         8000
    ↓                            ↓                           ↓
  Vite ─────────────────→ FastAPI App ────────────→ Agno Team
    ↓                            ↓
 UI Components              JWT Auth ───────────→ SQLite DB
                                ↓
                            Agent Orchestration
                            (6 Specialists)
```

---

## 🚀 Next Steps

1. **Install**: `pip install -r backend/requirements.txt`
2. **Run**: `npm run dev`
3. **Test**: Open `http://localhost:5173`
4. **Explore**: Visit `http://localhost:8000/docs`
5. **Chat**: Talk to the agents!

---

## 📖 Learn More

- **MIGRATION_GUIDE.md** - How the migration works
- **IMPLEMENTATION_SUMMARY.md** - Technical deep dive
- **http://localhost:8000/docs** - Live API documentation
- **Agno Framework**: https://www.agno.com/
- **FastAPI**: https://fastapi.tiangolo.com/

---

**Happy coding!** 🚀
