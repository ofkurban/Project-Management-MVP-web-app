"use client";

import { useEffect, useState } from "react";
import { fetchMe, logout } from "@/lib/auth";
import { fetchBoard } from "@/lib/boardApi";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LoginForm } from "@/components/LoginForm";
import type { BoardData } from "@/lib/kanban";

type AppState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "loading-board"; username: string }
  | { status: "ready"; username: string; board: BoardData }
  | { status: "error"; message: string };

export const App = () => {
  const [state, setState] = useState<AppState>({ status: "loading" });

  const loadBoard = async (username: string) => {
    setState({ status: "loading-board", username });
    try {
      const board = await fetchBoard();
      setState({ status: "ready", username, board });
    } catch {
      setState({ status: "error", message: "Could not load your board." });
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then(async (user) => {
        if (cancelled) {
          return;
        }
        if (!user) {
          setState({ status: "anonymous" });
          return;
        }
        await loadBoard(user.username);
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: "anonymous" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    setState({ status: "anonymous" });
  };

  if (state.status === "loading" || state.status === "loading-board") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--gray-text)]">
        Loading...
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-[var(--secondary-purple)]">{state.message}</p>
        <button
          type="button"
          className="rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
          onClick={() => setState({ status: "anonymous" })}
        >
          Back to sign in
        </button>
      </div>
    );
  }

  if (state.status === "anonymous") {
    return (
      <LoginForm
        onSuccess={(username) => {
          void loadBoard(username);
        }}
      />
    );
  }

  return (
    <KanbanBoard
      username={state.username}
      initialBoard={state.board}
      onLogout={handleLogout}
    />
  );
};
