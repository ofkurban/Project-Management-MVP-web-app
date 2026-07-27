from copy import deepcopy

from fastapi.testclient import TestClient
import pytest

from app import db
from app.main import app


@pytest.fixture()
def client(tmp_path, monkeypatch):
    db_file = tmp_path / "app.db"
    monkeypatch.setenv("DATABASE_PATH", str(db_file))
    db.init_db()
    with TestClient(app) as test_client:
        yield test_client


def _login(client: TestClient) -> None:
    response = client.post(
        "/api/login",
        json={"username": "user", "password": "password"},
    )
    assert response.status_code == 200


def test_chat_requires_auth(client: TestClient) -> None:
    response = client.post(
        "/api/chat",
        json={
            "message": "Hello",
            "history": [],
            "board": db.DEFAULT_BOARD,
        },
    )
    assert response.status_code == 401


def test_chat_reply_only_does_not_change_board(client: TestClient, monkeypatch) -> None:
    _login(client)
    before = client.get("/api/board").json()

    monkeypatch.setattr(
        "app.openrouter.ask_board_assistant",
        lambda message, history, board: {
            "reply": "No changes needed.",
            "board": None,
        },
    )

    response = client.post(
        "/api/chat",
        json={
            "message": "What is on the board?",
            "history": [],
            "board": before,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["reply"] == "No changes needed."
    assert body["board"] is None
    assert client.get("/api/board").json() == before


def test_chat_board_update_is_saved(client: TestClient, monkeypatch) -> None:
    _login(client)
    before = client.get("/api/board").json()
    updated = deepcopy(before)
    updated["columns"][0]["title"] = "AI Inbox"
    updated["cards"]["card-1"]["title"] = "Moved by AI"

    monkeypatch.setattr(
        "app.openrouter.ask_board_assistant",
        lambda message, history, board: {
            "reply": "Updated the board.",
            "board": updated,
        },
    )

    response = client.post(
        "/api/chat",
        json={
            "message": "Rename backlog to AI Inbox",
            "history": [{"role": "user", "content": "hi"}],
            "board": before,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["reply"] == "Updated the board."
    assert body["board"]["columns"][0]["title"] == "AI Inbox"

    saved = client.get("/api/board").json()
    assert saved["columns"][0]["title"] == "AI Inbox"
    assert saved["cards"]["card-1"]["title"] == "Moved by AI"


def test_chat_rejects_invalid_ai_board(client: TestClient, monkeypatch) -> None:
    _login(client)
    before = client.get("/api/board").json()
    monkeypatch.setattr(
        "app.openrouter.ask_board_assistant",
        lambda message, history, board: {
            "reply": "oops",
            "board": {"columns": []},
        },
    )
    response = client.post(
        "/api/chat",
        json={
            "message": "break it",
            "history": [],
            "board": before,
        },
    )
    assert response.status_code == 502
    assert client.get("/api/board").json() == before
