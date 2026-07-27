# Database approach

Status: **Approved.** Implemented in Part 6.

## Overview

- Engine: **SQLite** file at `/data/app.db` in the container (host: `./data/app.db` via volume)
- One board per user for MVP; schema supports multiple users later
- Board content stored as a single **JSON** document (same shape as frontend `BoardData`)

## Schema

### `users`

| Column | Type | Notes |
|--------|------|--------|
| `id` | INTEGER PRIMARY KEY | Auto-increment |
| `username` | TEXT NOT NULL UNIQUE | Login name |
| `password` | TEXT NOT NULL | MVP stores plaintext `password` for the demo user (matches hardcoded auth). Not for production. |
| `created_at` | TEXT NOT NULL | ISO-8601 UTC |

### `boards`

| Column | Type | Notes |
|--------|------|--------|
| `id` | INTEGER PRIMARY KEY | Auto-increment |
| `user_id` | INTEGER NOT NULL UNIQUE | FK → `users.id`; one board per user |
| `data_json` | TEXT NOT NULL | Full `BoardData` JSON |
| `updated_at` | TEXT NOT NULL | ISO-8601 UTC |

## Board JSON shape (`data_json`)

Matches `frontend/src/lib/kanban.ts`:

```ts
type Card = { id: string; title: string; details: string };
type Column = { id: string; title: string; cardIds: string[] };
type BoardData = { columns: Column[]; cards: Record<string, Card> };
```

Columns stay a fixed set of five; titles may change. Cards are create/edit/delete/move only inside this JSON — no separate cards table.

## Seed data

On first startup (empty DB):

1. Create tables if they do not exist
2. Insert user: `username=user`, `password=password`
3. Insert one board for that user whose `data_json` equals frontend `initialData` (five columns, sample cards `card-1` … `card-8`)

Login for the app remains session-based (`user` / `password`). Part 6 may keep checking those hardcoded credentials **or** verify against the `users` row — either is fine as long as behavior stays the same; prefer reading the seeded `users` row for consistency.

## Create-if-missing behavior

1. Ensure `/data` exists (scripts already mount it)
2. Open SQLite at `/data/app.db` (create file if absent)
3. `CREATE TABLE IF NOT EXISTS` for `users` and `boards`
4. If no users exist, run seed (user + default board)

No migrations framework for MVP. Schema changes later can be handled manually or with a tiny bump script if needed.

## What we are not doing (MVP)

- Normalized columns/cards tables
- Password hashing (demo only)
- Multiple boards per user
- Storing chat history in the DB

## Approval

Reply **approved** (or note changes) on this document before Part 6 implements the board API against this schema.

**Signed off by user** — Part 6 implements this schema.
