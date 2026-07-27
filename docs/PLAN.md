# Project Plan

Status: **MVP complete (Parts 1-10).**

Agents must stop after each part, summarize what was done, and wait for explicit user approval before starting the next part.

---

## Decisions (locked)

These choices apply for the rest of the MVP unless the user overrides them.

| Topic | Decision |
|-------|----------|
| App packaging | Single Docker container; FastAPI serves API + static Next.js export |
| Host URL | `http://localhost:8000` |
| SQLite path | `/data/app.db` inside the container; scripts mount a local `./data` volume |
| Auth | Hardcoded credentials `user` / `password`; backend issues an HTTP-only session cookie |
| Users | `users` table exists now with one seeded user (`user`) for future multi-user support |
| Board storage | One board per user stored as a **JSON blob** column in SQLite (same shape as frontend `BoardData`) |
| Columns | Fixed set (5); rename allowed; no add/remove columns in MVP |
| Cards | Create, edit title/details, delete, drag-and-drop move/reorder |
| AI model | OpenRouter **free** models only (no credit card). Default: `openai/gpt-oss-20b:free`. Do not use paid models. |
| AI board updates | Model may optionally return a **full replacement** `BoardData` JSON (not a patch/ops list) |
| Chat history | Client-only for MVP; frontend sends recent history with each chat request; not persisted in DB |
| Secrets | `.env` at repo root (gitignored); commit `.env.example` with `OPENROUTER_API_KEY=` |
| Python tooling | `uv` for deps inside Docker |
| Simplicity | No JWT, no Redis, no ORM complexity beyond sqlite3 or a thin SQL layer; no extra features |

### Known frontend gap

~~In-place card edit~~ — **done** (Edit on each card).

---

## Part 1: Plan

### Checklist

- [x] Lock technical decisions (above)
- [x] Enrich this document with per-part checklists, tests, and success criteria
- [x] Create `frontend/AGENTS.md` describing the existing frontend
- [x] User reviews and approves this plan

### Tests

- None (documentation only)

### Success criteria

- Plan is detailed enough that an agent can execute Parts 2–10 without re-asking the locked decisions
- `frontend/AGENTS.md` exists and accurately describes the demo app
- User has explicitly approved before Part 2 starts

---

## Part 2: Scaffolding

### Checklist

- [x] Add root `Dockerfile` using `uv` for Python; install FastAPI/uvicorn
- [x] Create `backend/` FastAPI app with:
  - [x] `GET /` serving a simple static HTML “hello world” page
  - [x] `GET /api/health` returning JSON `{"status":"ok"}`
- [x] Add `backend` dependency file managed by `uv` (e.g. `pyproject.toml`)
- [x] Add start/stop scripts in `scripts/` for Mac, PC (PowerShell/batch), and Linux that build/run/stop the container
- [x] Ensure SQLite data dir mount path is ready (`./data`) even if unused yet
- [x] Add `.env.example` with `OPENROUTER_API_KEY=`
- [x] Update `backend/AGENTS.md` and `scripts/AGENTS.md` to match reality
- [x] Document how to start/stop in a minimal root `README.md` if missing

### Tests

- [x] Manual or scripted: start container, `GET /` returns HTML hello world
- [x] `GET /api/health` returns 200 and `{"status":"ok"}`
- [x] Stop script stops the container cleanly

### Success criteria

- From a clean machine with Docker, start scripts bring up the app at `http://localhost:8000`
- Hello world page and health API both work
- Stop scripts tear down the container

---

## Part 3: Add in Frontend

### Checklist

- [x] Configure Next.js for static export (`output: "export"`) so build artifacts can be served by FastAPI
- [x] Update Docker build to `npm ci` + `npm run build` the frontend, copy `out/` into the image
- [x] FastAPI serves the static export at `/` (replace Part 2 hello world HTML)
- [x] SPA/static routing: unknown non-API paths still serve the app sensibly (at minimum `/` works)
- [x] Keep frontend unit tests (Vitest) and e2e (Playwright) runnable; point e2e at the Docker-served app or document the target URL
- [x] Update `frontend/AGENTS.md` if build/serve flow changes

### Tests

- [x] `npm run test:unit` in `frontend/` passes
- [x] Playwright (or equivalent) confirms Kanban board renders at `/` via the container
- [x] Drag/rename/add/delete still work in the served static app (client-only state OK)

### Success criteria

- Visiting `http://localhost:8000/` shows the Kanban Studio demo board
- No separate Next.js dev server required for the Docker path

---

## Part 4: Fake user sign-in

### Checklist

- [x] Login UI shown when unauthenticated; Kanban hidden until login
- [x] Accept only `user` / `password`
- [x] Backend: `POST /api/login`, `POST /api/logout`, `GET /api/me` (or equivalent)
- [x] Session via HTTP-only cookie set by backend
- [x] Logout clears session and returns to login
- [x] Protect Kanban-related API routes (added in later parts) behind the session — for now protect `/api/me` and any board stubs if present

### Tests

- [x] Wrong credentials → 401, no session cookie
- [x] Correct credentials → 200, session cookie set, Kanban visible
- [x] Logout → cookie cleared, login screen again
- [x] Frontend tests cover login/logout happy path
- [x] Backend unit tests for login/logout/me

### Success criteria

- Fresh visit to `/` requires login before the board is usable
- Only the hardcoded credentials work

---

## Part 5: Database modeling

### Checklist

- [x] Propose schema in `docs/DATABASE.md` (or similar under `docs/`)
- [x] Include at least:
  - [x] `users` (id, username, password_hash or plaintext-for-MVP note, …)
  - [x] `boards` (user_id unique, `data_json` text/blob, updated_at)
- [x] Document seed: user `user` / `password`, default board JSON matching frontend `initialData`
- [x] Document create-DB-if-missing behavior
- [x] Get user sign-off on `docs/DATABASE.md` before Part 6

### Tests

- None beyond document review

### Success criteria

- Schema is simple, JSON-board approach is explicit
- User has approved `docs/DATABASE.md`

---

## Part 6: Backend board API

### Checklist

- [x] On startup: create SQLite DB/tables if missing; seed user + default board if empty
- [x] `GET /api/board` — return current user’s board JSON (auth required)
- [x] `PUT /api/board` — replace board JSON for current user (auth required)
- [x] Validate payload is well-formed `BoardData` (columns + cards); keep validation minimal
- [x] Backend unit tests with temp SQLite

### Tests

- [x] Unauthenticated board routes → 401
- [x] Authenticated GET returns seeded board
- [x] PUT then GET round-trips updated JSON
- [x] DB file created automatically when absent

### Success criteria

- Board read/write works via API with session auth
- Empty environment self-initializes DB + seed data

---

## Part 7: Frontend + Backend persistence

### Checklist

- [x] Frontend loads board from `GET /api/board` after login
- [x] Persist on changes via `PUT /api/board` (debounce OK if kept simple)
- [x] Add **card edit** UI (title + details) — done ahead of Part 7
- [x] Column rename, add/edit/delete/move cards all persist across refresh
- [x] Handle loading and basic error display without over-engineering
- [x] Expand unit/e2e tests for persistence and edit

### Tests

- [x] E2E: login → change board → refresh → changes remain
- [x] E2E: edit card title/details persists
- [x] Unit tests for any new client API helpers
- [x] Existing board interaction tests still pass

### Success criteria

- App is a real persistent Kanban for the signed-in user
- Card edit works end-to-end

---

## Part 8: AI connectivity

### Checklist

- [x] Backend reads `OPENROUTER_API_KEY` from environment
- [x] Minimal OpenRouter chat completion client using `openai/gpt-oss-20b:free` (free tier; no paid model)
- [x] Test-only or internal endpoint/script that asks `2+2` and checks a sane numeric answer
- [x] Fail clearly if API key missing
- [x] Document free-tier rate limits (~50 requests/day without purchased credits)

### Tests

- [x] Connectivity test passes with a real key in `.env`
- [x] Missing key fails with a clear error (no silent success)

### Success criteria

- Proven live call to OpenRouter using `openai/gpt-oss-20b:free` (or another `:free` model if that one is unavailable)

---

## Part 9: AI + board structured output

### Checklist

- [x] Chat endpoint (e.g. `POST /api/chat`) accepts: user message, conversation history, current board JSON
- [x] System prompt instructs the model to answer the user and optionally update the board
- [x] Use Structured Outputs / JSON schema: `{ "reply": string, "board": BoardData | null }`
- [x] If `board` is non-null, save it as the user’s board (same as PUT)
- [x] Auth required
- [x] Backend unit tests with mocked OpenRouter responses

### Tests

- [x] Mocked response with `board: null` → reply only, DB unchanged
- [x] Mocked response with new board → DB updated
- [x] Unauthenticated → 401

### Success criteria

- Backend can turn a user question + board + history into reply + optional full board replace

---

## Part 10: AI chat sidebar UI

### Checklist

- [x] Beautiful sidebar chat using existing color scheme
- [x] Send messages through `POST /api/chat`
- [x] Show assistant replies; keep history in React state
- [x] If response includes an updated board, refresh board UI immediately (use returned board or re-fetch)
- [x] Loading and error states kept simple
- [x] E2E or component tests for “reply only” vs “board updated” paths (mock API as needed)

### Tests

- [x] UI shows user + assistant messages
- [x] Mocked board update refreshes Kanban without full page reload
- [x] Unauthenticated users cannot use chat

### Success criteria

- Chat sidebar is usable in the running Docker app
- AI-driven board changes appear on the board automatically

---

## Execution rules for agents

1. Follow root `AGENTS.md` coding standards (simple, no emojis, prove root cause before fixing).
2. Do not start the next part until the user approves the current part.
3. Prefer updating existing docs over creating extra markdown files (exception: `docs/DATABASE.md` in Part 5, `.env.example`, minimal README).
4. After each part: list checklist items completed and how success criteria were verified.
