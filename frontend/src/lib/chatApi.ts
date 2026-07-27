import type { BoardData } from "@/lib/kanban";

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type ChatResult = {
  reply: string;
  board: BoardData | null;
};

export async function sendChat(
  message: string,
  history: ChatTurn[],
  board: BoardData
): Promise<ChatResult> {
  const response = await fetch("/api/chat", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, board }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "Chat request failed");
  }
  return response.json();
}
