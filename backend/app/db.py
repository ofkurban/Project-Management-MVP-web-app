import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DEFAULT_BOARD: dict[str, Any] = {
    "columns": [
        {"id": "col-backlog", "title": "Backlog", "cardIds": ["card-1", "card-2"]},
        {"id": "col-discovery", "title": "Discovery", "cardIds": ["card-3"]},
        {
            "id": "col-progress",
            "title": "In Progress",
            "cardIds": ["card-4", "card-5"],
        },
        {"id": "col-review", "title": "Review", "cardIds": ["card-6"]},
        {"id": "col-done", "title": "Done", "cardIds": ["card-7", "card-8"]},
    ],
    "cards": {
        "card-1": {
            "id": "card-1",
            "title": "Align roadmap themes",
            "details": "Draft quarterly themes with impact statements and metrics.",
        },
        "card-2": {
            "id": "card-2",
            "title": "Gather customer signals",
            "details": "Review support tags, sales notes, and churn feedback.",
        },
        "card-3": {
            "id": "card-3",
            "title": "Prototype analytics view",
            "details": "Sketch initial dashboard layout and key drill-downs.",
        },
        "card-4": {
            "id": "card-4",
            "title": "Refine status language",
            "details": "Standardize column labels and tone across the board.",
        },
        "card-5": {
            "id": "card-5",
            "title": "Design card layout",
            "details": "Add hierarchy and spacing for scanning dense lists.",
        },
        "card-6": {
            "id": "card-6",
            "title": "QA micro-interactions",
            "details": "Verify hover, focus, and loading states.",
        },
        "card-7": {
            "id": "card-7",
            "title": "Ship marketing page",
            "details": "Final copy approved and asset pack delivered.",
        },
        "card-8": {
            "id": "card-8",
            "title": "Close onboarding sprint",
            "details": "Document release notes and share internally.",
        },
    },
}


def db_path() -> Path:
    return Path(os.environ.get("DATABASE_PATH", "/data/app.db"))


def connect() -> sqlite3.Connection:
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _utcnow() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def init_db() -> None:
    with connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS boards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL UNIQUE,
                data_json TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
            """
        )
        row = conn.execute("SELECT COUNT(*) AS count FROM users").fetchone()
        if row["count"] == 0:
            now = _utcnow()
            cursor = conn.execute(
                "INSERT INTO users (username, password, created_at) VALUES (?, ?, ?)",
                ("user", "password", now),
            )
            user_id = cursor.lastrowid
            conn.execute(
                "INSERT INTO boards (user_id, data_json, updated_at) VALUES (?, ?, ?)",
                (user_id, json.dumps(DEFAULT_BOARD), now),
            )
        conn.commit()


def authenticate(username: str, password: str) -> sqlite3.Row | None:
    with connect() as conn:
        row = conn.execute(
            "SELECT id, username FROM users WHERE username = ? AND password = ?",
            (username, password),
        ).fetchone()
        return row


def get_board_for_user(user_id: int) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute(
            "SELECT data_json FROM boards WHERE user_id = ?",
            (user_id,),
        ).fetchone()
        if row is None:
            return None
        return json.loads(row["data_json"])


def get_user_id(username: str) -> int | None:
    with connect() as conn:
        row = conn.execute(
            "SELECT id FROM users WHERE username = ?",
            (username,),
        ).fetchone()
        return int(row["id"]) if row else None


def save_board_for_user(user_id: int, board: dict[str, Any]) -> None:
    with connect() as conn:
        conn.execute(
            """
            UPDATE boards
            SET data_json = ?, updated_at = ?
            WHERE user_id = ?
            """,
            (json.dumps(board), _utcnow(), user_id),
        )
        conn.commit()
