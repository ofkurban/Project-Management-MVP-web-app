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
    assert db_file.exists()


def _login(client: TestClient) -> None:
    response = client.post(
        "/api/login",
        json={"username": "user", "password": "password"},
    )
    assert response.status_code == 200


def test_health(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_me_unauthenticated(client: TestClient) -> None:
    assert client.get("/api/me").status_code == 401


def test_login_wrong_credentials(client: TestClient) -> None:
    response = client.post(
        "/api/login",
        json={"username": "user", "password": "wrong"},
    )
    assert response.status_code == 401
    assert client.get("/api/me").status_code == 401


def test_login_logout_me(client: TestClient) -> None:
    login = client.post(
        "/api/login",
        json={"username": "user", "password": "password"},
    )
    assert login.status_code == 200
    assert login.json() == {"username": "user"}
    assert "pm_session" in login.cookies

    me = client.get("/api/me")
    assert me.status_code == 200
    assert me.json() == {"username": "user"}

    logout = client.post("/api/logout")
    assert logout.status_code == 200
    assert client.get("/api/me").status_code == 401


def test_board_requires_auth(client: TestClient) -> None:
    assert client.get("/api/board").status_code == 401
    assert client.put("/api/board", json=db.DEFAULT_BOARD).status_code == 401


def test_get_seeded_board(client: TestClient) -> None:
    _login(client)
    response = client.get("/api/board")
    assert response.status_code == 200
    body = response.json()
    assert len(body["columns"]) == 5
    assert "card-1" in body["cards"]
    assert body["cards"]["card-1"]["title"] == "Align roadmap themes"


def test_put_get_board_round_trip(client: TestClient) -> None:
    _login(client)
    board = client.get("/api/board").json()
    board["columns"][0]["title"] = "Inbox"
    board["cards"]["card-1"]["title"] = "Updated card"

    put = client.put("/api/board", json=board)
    assert put.status_code == 200
    assert put.json()["columns"][0]["title"] == "Inbox"

    got = client.get("/api/board").json()
    assert got["columns"][0]["title"] == "Inbox"
    assert got["cards"]["card-1"]["title"] == "Updated card"


def test_put_rejects_invalid_board(client: TestClient) -> None:
    _login(client)
    response = client.put("/api/board", json={"columns": []})
    assert response.status_code == 422


def test_db_file_created(tmp_path, monkeypatch) -> None:
    db_file = tmp_path / "nested" / "app.db"
    monkeypatch.setenv("DATABASE_PATH", str(db_file))
    assert not db_file.exists()
    db.init_db()
    assert db_file.exists()
