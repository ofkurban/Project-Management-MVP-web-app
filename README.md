# Project Management MVP

Local Kanban app (Next.js + FastAPI) packaged in Docker.

## Requirements

- Docker Desktop (or Docker Engine)
- `.env` in the project root (copy from `.env.example`) with `OPENROUTER_API_KEY` when using AI features

## Start / stop

**Windows (PowerShell):**

```powershell
.\scripts\start.ps1
.\scripts\stop.ps1
```

**Windows (cmd):**

```bat
scripts\start.bat
scripts\stop.bat
```

**Mac / Linux:**

```bash
chmod +x scripts/start.sh scripts/stop.sh
./scripts/start.sh
./scripts/stop.sh
```

App: http://localhost:8000 (login required)  
Health: http://localhost:8000/api/health  

Demo login: `user` / `password`

After login you get the Kanban board plus an AI chat sidebar (OpenRouter free model).

## Layout

- `frontend/` — Next.js Kanban demo
- `backend/` — FastAPI
- `scripts/` — start/stop helpers
- `docs/PLAN.md` — build plan
- `data/` — SQLite volume mount (created on start)
