# The Project Management MVP web app

## Status

MVP complete (Parts 1-10 in `docs/PLAN.md`). Runs locally in Docker at `http://localhost:8000`.

## Business Requirements

Key features (implemented):
- A user can sign in (`user` / `password`) and log out
- When signed in, the user sees a Kanban board representing their project
- The Kanban board has fixed columns that can be renamed
- Cards can be created, edited, deleted, and moved with drag and drop (drag handle on each card)
- AI chat sidebar can answer questions and create / edit / move cards via structured board updates
- Board state persists in SQLite across refresh

## Limitations

- Demo auth only (`user` / `password`); DB has a `users` table for future multi-user support
- One Kanban board per signed-in user
- Runs locally in a Docker container
- OpenRouter free models only (~50 requests/day without credits)

## Technical Decisions

- Next.js frontend (static export), served by FastAPI at `/`
- Python FastAPI backend (`uv` for deps)
- Single Docker image; start/stop scripts in `scripts/` (Mac, PC, Linux)
- SQLite at `./data/app.db` (container `/data/app.db`), create + seed if missing
- Board stored as JSON blob (`BoardData` shape) — see `docs/DATABASE.md`
- OpenRouter AI: `OPENROUTER_API_KEY` in root `.env`; model `openai/gpt-oss-20b:free`
- Session cookie auth (`pm_session`); host URL `http://localhost:8000`

## What was built

| Area | Details |
|------|---------|
| Docker | Root `Dockerfile` builds frontend `out/` + FastAPI; `scripts/start.*` / `stop.*` |
| Backend | Auth, board GET/PUT, AI ping, chat with structured `{ reply, board }` |
| Frontend | Login gate, persistent Kanban, card edit, AI sidebar |
| Docs | `docs/PLAN.md` (executed), `docs/DATABASE.md` (approved schema) |
| Tests | Frontend Vitest + Playwright; backend Pytest |

## Layout

- `frontend/` — Next.js UI (see `frontend/AGENTS.md`)
- `backend/` — FastAPI + SQLite + OpenRouter (see `backend/AGENTS.md`)
- `scripts/` — start/stop helpers (see `scripts/AGENTS.md`)
- `docs/` — plan and database design
- `data/` — SQLite volume (gitignored except `.gitignore`)
- `.env` — secrets (gitignored); copy from `.env.example`

## Color Scheme

- Accent Yellow: `#ecad0a` - accent lines, highlights
- Blue Primary: `#209dd7` - links, key sections
- Purple Secondary: `#753991` - submit buttons, important actions
- Dark Navy: `#032147` - main headings
- Gray Text: `#888888` - supporting text, labels

## Coding standards

1. Use latest versions of libraries and idiomatic approaches as of today
2. Keep it simple - NEVER over-engineer, ALWAYS simplify, NO unnecessary defensive programming. No extra features - focus on simplicity.
3. Be concise. Keep README minimal. IMPORTANT: no emojis ever
4. When hitting issues, always identify root cause before trying a fix. Do not guess. Prove with evidence, then fix the root cause.

## Working documentation

Planning and design docs live in `docs/`. Start with `docs/PLAN.md` and `docs/DATABASE.md` before changing architecture.
