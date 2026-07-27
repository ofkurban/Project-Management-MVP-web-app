"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { sendChat, type ChatTurn } from "@/lib/chatApi";
import type { BoardData } from "@/lib/kanban";

type ChatSidebarProps = {
  board: BoardData;
  onBoardUpdate: (board: BoardData) => void;
};

export const ChatSidebar = ({ board, onBoardUpdate }: ChatSidebarProps) => {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = listRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [messages, pending]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || pending) {
      return;
    }

    const history = messages;
    setDraft("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setPending(true);

    try {
      const result = await sendChat(text, history, board);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.reply },
      ]);
      if (result.board) {
        onBoardUpdate(result.board);
      }
    } catch {
      setError("Assistant is unavailable right now. Try again.");
      setMessages((prev) => prev.slice(0, -1));
      setDraft(text);
    } finally {
      setPending(false);
    }
  };

  return (
    <aside
      className="mx-6 mb-10 flex h-[min(70vh,640px)] w-auto flex-col rounded-[28px] border border-[var(--stroke)] bg-white/95 shadow-[var(--shadow)] backdrop-blur lg:mx-0 lg:mb-0 lg:mt-0 lg:fixed lg:right-0 lg:top-0 lg:h-screen lg:w-[380px] lg:rounded-none lg:border-l lg:border-y-0 lg:border-r-0"
      data-testid="chat-sidebar"
    >
      <div className="border-b border-[var(--stroke)] px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gray-text)]">
          Assistant
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-[var(--navy-dark)]">
          AI Chat
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--gray-text)]">
          Ask about the board, or request card moves and edits.
        </p>
        <div className="mt-4 h-1 w-16 rounded-full bg-[var(--accent-yellow)]" />
      </div>

      <div
        ref={listRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
        data-testid="chat-messages"
      >
        {messages.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--stroke)] bg-[var(--surface)] px-4 py-6 text-sm leading-6 text-[var(--gray-text)]">
            Try: &quot;Move the roadmap card to Review&quot; or &quot;Summarize
            In Progress.&quot;
          </p>
        ) : null}
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={
              message.role === "user"
                ? "ml-6 rounded-2xl bg-[var(--primary-blue)] px-4 py-3 text-sm leading-6 text-white"
                : "mr-6 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3 text-sm leading-6 text-[var(--navy-dark)]"
            }
            data-testid={`chat-${message.role}`}
          >
            {message.content}
          </div>
        ))}
        {pending ? (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
            Thinking...
          </p>
        ) : null}
      </div>

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="border-t border-[var(--stroke)] p-4"
      >
        {error ? (
          <p className="mb-3 text-sm text-[var(--secondary-purple)]" role="status">
            {error}
          </p>
        ) : null}
        <label className="sr-only" htmlFor="chat-input">
          Message
        </label>
        <textarea
          id="chat-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          placeholder="Ask the assistant..."
          className="w-full resize-none rounded-2xl border border-[var(--stroke)] bg-white px-3 py-3 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
          disabled={pending}
        />
        <button
          type="submit"
          disabled={pending || !draft.trim()}
          className="mt-3 w-full rounded-full bg-[var(--secondary-purple)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {pending ? "Sending..." : "Send"}
        </button>
      </form>
    </aside>
  );
};
