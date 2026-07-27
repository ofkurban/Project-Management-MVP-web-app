# Backend

FastAPI app for the Project Management MVP (auth, board persistence, OpenRouter AI, static frontend).

## Layout

| Path | Role |
|------|------|
| `app/main.py` | Routes: health, auth, board, AI ping, chat; mounts static UI |
| `app/db.py` | SQLite init/seed, auth lookup, board get/put |
| `app/openrouter.py` | Free-model client, math ping, structured board chat |
| `pyproject.toml` | Dependencies managed with `uv` (`package = false`) |
| `tests/` | Pytest (temp SQLite; mocked chat; live OpenRouter when key set) |

## Run (local, without Docker)

```bash
cd backend
uv sync --all-groups
set DATABASE_PATH=../data/app.db
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
uv run pytest
```

## Run (Docker)

Use scripts in `../scripts/` (see root README). DB file: `/data/app.db` (host `./data`).

## API

- `GET /api/health`
- `POST /api/login`, `POST /api/logout`, `GET /api/me` — session cookie `pm_session`
- `GET /api/board`, `PUT /api/board` — auth required; body is `BoardData` JSON
- `GET /api/ai/ping` — auth required; OpenRouter free-model connectivity check (`2+2`)
- `POST /api/chat` — auth required; `{ message, history, board }` → `{ reply, board|null }`; saves board when non-null

Credentials come from the seeded `users` row (`user` / `password`).

AI uses `OPENROUTER_API_KEY` and model `openai/gpt-oss-20b:free` only. Free tier ~50 requests/day without credits. Structured chat returns `reply` plus optional full board replacement.
