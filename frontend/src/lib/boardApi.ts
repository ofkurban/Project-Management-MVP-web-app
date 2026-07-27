import type { BoardData } from "@/lib/kanban";

export async function fetchBoard(): Promise<BoardData> {
  const response = await fetch("/api/board", { credentials: "include" });
  if (!response.ok) {
    throw new Error("Failed to load board");
  }
  return response.json();
}

export async function saveBoard(board: BoardData): Promise<BoardData> {
  const response = await fetch("/api/board", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(board),
  });
  if (!response.ok) {
    throw new Error("Failed to save board");
  }
  return response.json();
}
