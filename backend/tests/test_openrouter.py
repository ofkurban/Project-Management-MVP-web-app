import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import db
from app import openrouter
from app.main import app
from app.openrouter import OpenRouterError


def _load_root_env() -> None:
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


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


def test_get_api_key_missing(monkeypatch) -> None:
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    with pytest.raises(OpenRouterError, match="OPENROUTER_API_KEY is missing"):
        openrouter.get_api_key()


def test_ai_ping_requires_auth(client: TestClient) -> None:
    assert client.get("/api/ai/ping").status_code == 401


def test_ai_ping_missing_key(client: TestClient, monkeypatch) -> None:
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    _login(client)
    response = client.get("/api/ai/ping")
    assert response.status_code == 503
    assert "OPENROUTER_API_KEY is missing" in response.json()["detail"]


def test_live_openrouter_math() -> None:
    _load_root_env()
    if not os.environ.get("OPENROUTER_API_KEY", "").strip():
        pytest.skip("OPENROUTER_API_KEY not set")
    result = openrouter.ping_math()
    assert result["ok"] is True
    assert "4" in result["reply"]
    assert result["model"].endswith(":free")
