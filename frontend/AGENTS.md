# Frontend (Kanban Studio)

## What this is

Next.js (App Router) Kanban UI for the PM MVP. Built as a **static export** (`output: "export"`) and served by FastAPI in Docker at `http://localhost:8000/`.

Talks to the backend for auth, board persistence, and AI chat. Drag-and-drop uses `@dnd-kit` (drag handle on each card).

## Stack

- Next.js 16, React 19, TypeScript
- Tailwind CSS v4 (`globals.css` + PostCSS)
- Vitest + Testing Library (unit)
- Playwright (e2e under `tests/`)
- Fonts: Space Grotesk (display), Manrope (body)

## Run / test

```bash
npm install
npm run dev          # http://localhost:3000 (dev only; API needs Docker/backend)
npm run build        # writes static site to out/
npm run test:unit
npm run test:e2e     # starts Next dev server unless E2E_BASE_URL is set
npm run test:all
```

E2E against the Docker app (container must already be running):

```bash
$env:E2E_BASE_URL="http://127.0.0.1:8000"   # PowerShell
npm run test:e2e
```

## Layout

| Path | Role |
|------|------|
| `src/app/page.tsx` | Renders `App` |
| `src/app/layout.tsx` | Root layout, fonts, metadata |
| `src/app/globals.css` | CSS variables / brand colors |
| `src/components/App.tsx` | Auth gate + board load |
| `src/components/LoginForm.tsx` | Demo sign-in |
| `src/components/KanbanBoard.tsx` | Board state, DnD, save debounce, chat wiring |
| `src/components/KanbanColumn.tsx` | Column, rename, cards |
| `src/components/KanbanCard.tsx` | Card view/edit/delete + drag handle |
| `src/components/KanbanCardPreview.tsx` | Drag overlay |
| `src/components/NewCardForm.tsx` | Add card |
| `src/components/ChatSidebar.tsx` | AI chat sidebar |
| `src/lib/kanban.ts` | Types, `initialData`, `moveCard`, `createId` |
| `src/lib/auth.ts` | `/api/me`, login, logout |
| `src/lib/boardApi.ts` | `GET`/`PUT /api/board` |
| `src/lib/chatApi.ts` | `POST /api/chat` |
| `tests/kanban.spec.ts` | Playwright e2e |

## Domain model (`BoardData`)

```ts
type Card = { id: string; title: string; details: string };
type Column = { id: string; title: string; cardIds: string[] };
type BoardData = { columns: Column[]; cards: Record<string, Card> };
```

Five fixed columns; titles may change. Backend stores this JSON as-is.

## Supported UX

- Sign in / log out (`user` / `password`)
- Rename column; add / edit / delete cards; drag via **Drag** handle
- Board load/save via API (debounced PUT ~300ms)
- AI sidebar: history in React state; applies returned board immediately

## Brand colors (CSS variables)

Match root `AGENTS.md`: accent yellow `#ecad0a`, primary blue `#209dd7`, purple `#753991`, navy `#032147`, gray `#888888`.

## Agent notes

- Keep `BoardData` shape stable.
- Prefer extending `KanbanBoard` / `kanban.ts` over new state libraries.
- Columns are fixed in count — no add/remove column UI.
- Do not remove `output: "export"` — Docker depends on `out/`.
- Drag listeners belong on the Drag handle only so Edit/Remove stay clickable.
