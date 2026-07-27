import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from starlette.middleware.sessions import SessionMiddleware

from app import db
from app import openrouter
from app.openrouter import OpenRouterError

STATIC_DIR = Path(os.environ.get("STATIC_DIR", "/app/static"))
SESSION_SECRET = os.environ.get("SESSION_SECRET", "pm-mvp-dev-secret")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    db.init_db()
    yield


app = FastAPI(title="PM MVP", lifespan=lifespan)

app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    session_cookie="pm_session",
    same_site="lax",
    https_only=False,
)


class LoginBody(BaseModel):
    username: str
    password: str


class CardModel(BaseModel):
    id: str
    title: str
    details: str


class ColumnModel(BaseModel):
    id: str
    title: str
    cardIds: list[str]


class BoardData(BaseModel):
    columns: list[ColumnModel] = Field(min_length=1)
    cards: dict[str, CardModel]


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    history: list[ChatMessage] = Field(default_factory=list)
    board: BoardData


class ChatResponse(BaseModel):
    reply: str
    board: BoardData | None = None


def require_user(request: Request) -> tuple[int, str]:
    username = request.session.get("user")
    user_id = request.session.get("user_id")
    if not username or not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return int(user_id), str(username)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/login")
def login(body: LoginBody, request: Request) -> dict[str, str]:
    row = db.authenticate(body.username, body.password)
    if row is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    request.session.clear()
    request.session["user"] = row["username"]
    request.session["user_id"] = row["id"]
    return {"username": row["username"]}


@app.post("/api/logout")
def logout(request: Request) -> dict[str, bool]:
    request.session.clear()
    return {"ok": True}


@app.get("/api/me")
def me(request: Request) -> dict[str, str]:
    _, username = require_user(request)
    return {"username": username}


@app.get("/api/board")
def get_board(request: Request) -> dict[str, Any]:
    user_id, _ = require_user(request)
    board = db.get_board_for_user(user_id)
    if board is None:
        raise HTTPException(status_code=404, detail="Board not found")
    return board


@app.put("/api/board")
def put_board(board: BoardData, request: Request) -> dict[str, Any]:
    user_id, _ = require_user(request)
    payload = board.model_dump()
    db.save_board_for_user(user_id, payload)
    return payload


@app.get("/api/ai/ping")
def ai_ping(request: Request) -> dict[str, Any]:
    """Connectivity check: ask the free OpenRouter model what 2+2 is."""
    require_user(request)
    try:
        return openrouter.ping_math()
    except OpenRouterError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/api/chat")
def chat(body: ChatRequest, request: Request) -> ChatResponse:
    user_id, _ = require_user(request)
    history = [item.model_dump() for item in body.history]
    try:
        result = openrouter.ask_board_assistant(
            body.message,
            history,
            body.board.model_dump(),
        )
    except OpenRouterError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    board_out: BoardData | None = None
    if result.get("board") is not None:
        try:
            board_out = BoardData.model_validate(result["board"])
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail="AI returned an invalid board update",
            ) from exc
        db.save_board_for_user(user_id, board_out.model_dump())

    return ChatResponse(reply=result["reply"], board=board_out)


if STATIC_DIR.is_dir():
    app.mount(
        "/",
        StaticFiles(directory=str(STATIC_DIR), html=True),
        name="static",
    )
