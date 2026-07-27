import json
import os
import re
from typing import Any

import httpx

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "openai/gpt-oss-20b:free"

BOARD_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "columns": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "title": {"type": "string"},
                    "cardIds": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                },
                "required": ["id", "title", "cardIds"],
                "additionalProperties": False,
            },
        },
        "cards": {
            "type": "object",
            "additionalProperties": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "title": {"type": "string"},
                    "details": {"type": "string"},
                },
                "required": ["id", "title", "details"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["columns", "cards"],
    "additionalProperties": False,
}

CHAT_RESPONSE_FORMAT: dict[str, Any] = {
    "type": "json_schema",
    "json_schema": {
        "name": "kanban_chat_response",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "reply": {
                    "type": "string",
                    "description": "Message to show the user",
                },
                "board": {
                    "anyOf": [BOARD_JSON_SCHEMA, {"type": "null"}],
                    "description": "Full replacement board JSON, or null if unchanged",
                },
            },
            "required": ["reply", "board"],
            "additionalProperties": False,
        },
    },
}

SYSTEM_PROMPT = """You are an assistant for a single Kanban board app.
You receive the current board JSON and the user's message (plus prior chat turns).
Respond with JSON only matching this shape:
{"reply": string, "board": BoardData | null}

Rules:
- Always set reply to a helpful message for the user.
- Set board to null when no board change is needed.
- When changing the board, return the FULL updated BoardData (columns + cards), not a patch.
- Keep exactly the existing columns (same ids); you may rename column titles.
- You may create, edit, move, or delete cards.
- Do not invent unrelated features.
"""


class OpenRouterError(Exception):
    pass


def get_api_key() -> str:
    key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not key:
        raise OpenRouterError(
            "OPENROUTER_API_KEY is missing. Set it in the project root .env file."
        )
    return key


def chat_completion(
    messages: list[dict[str, str]],
    *,
    model: str = DEFAULT_MODEL,
    temperature: float = 0,
    response_format: dict[str, Any] | None = None,
) -> str:
    api_key = get_api_key()
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:8000",
        "X-Title": "PM MVP",
    }
    payload: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }
    if response_format is not None:
        payload["response_format"] = response_format

    try:
        response = httpx.post(
            OPENROUTER_URL,
            headers=headers,
            json=payload,
            timeout=90.0,
        )
    except httpx.HTTPError as exc:
        raise OpenRouterError(f"OpenRouter request failed: {exc}") from exc

    if response.status_code >= 400:
        detail = response.text[:500]
        raise OpenRouterError(
            f"OpenRouter error {response.status_code}: {detail}"
        )

    data = response.json()
    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise OpenRouterError("OpenRouter response missing message content") from exc

    if not isinstance(content, str) or not content.strip():
        raise OpenRouterError("OpenRouter returned an empty response")
    return content.strip()


def ping_math() -> dict[str, Any]:
    """Ask 2+2 and verify the reply contains 4. Free-tier model only."""
    reply = chat_completion(
        [
            {
                "role": "user",
                "content": "What is 2+2? Reply with only the number.",
            }
        ]
    )
    if not re.search(r"\b4\b", reply):
        raise OpenRouterError(
            f"Unexpected math reply from model (expected 4): {reply!r}"
        )
    return {
        "ok": True,
        "model": DEFAULT_MODEL,
        "reply": reply,
        "note": "Free OpenRouter models are rate-limited (~50 requests/day without credits).",
    }


def _extract_json_object(text: str) -> dict[str, Any]:
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise OpenRouterError("Model response was not valid JSON") from None
        try:
            data = json.loads(text[start : end + 1])
        except json.JSONDecodeError as exc:
            raise OpenRouterError("Model response was not valid JSON") from exc
    if not isinstance(data, dict):
        raise OpenRouterError("Model JSON must be an object")
    return data


def ask_board_assistant(
    user_message: str,
    history: list[dict[str, str]],
    board: dict[str, Any],
) -> dict[str, Any]:
    messages: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for turn in history:
        role = turn.get("role")
        content = turn.get("content")
        if role in {"user", "assistant"} and isinstance(content, str):
            messages.append({"role": role, "content": content})
    messages.append(
        {
            "role": "user",
            "content": (
                "Current board JSON:\n"
                f"{json.dumps(board)}\n\n"
                f"User message:\n{user_message}"
            ),
        }
    )

    try:
        raw = chat_completion(
            messages,
            response_format=CHAT_RESPONSE_FORMAT,
            temperature=0.2,
        )
    except OpenRouterError:
        # Some free providers reject json_schema; retry with plain JSON instruction.
        raw = chat_completion(messages, temperature=0.2)

    data = _extract_json_object(raw)
    reply = data.get("reply")
    if not isinstance(reply, str) or not reply.strip():
        raise OpenRouterError("Structured response missing reply string")
    board_update = data.get("board", None)
    if board_update is not None and not isinstance(board_update, dict):
        raise OpenRouterError("Structured response board must be an object or null")
    return {"reply": reply.strip(), "board": board_update}
