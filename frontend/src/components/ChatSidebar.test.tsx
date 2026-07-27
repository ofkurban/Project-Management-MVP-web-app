import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatSidebar } from "@/components/ChatSidebar";
import { KanbanBoard } from "@/components/KanbanBoard";
import { initialData } from "@/lib/kanban";

describe("ChatSidebar", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows user and assistant messages for reply-only chat", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ reply: "Board looks healthy.", board: null })
      )
    );

    render(
      <ChatSidebar board={initialData} onBoardUpdate={() => undefined} />
    );

    await userEvent.type(
      screen.getByPlaceholderText(/ask the assistant/i),
      "How is the board?"
    );
    await userEvent.click(screen.getByRole("button", { name: /^send$/i }));

    expect(await screen.findByTestId("chat-user")).toHaveTextContent(
      "How is the board?"
    );
    expect(await screen.findByTestId("chat-assistant")).toHaveTextContent(
      "Board looks healthy."
    );
  });

  it("applies board updates from the assistant", async () => {
    const updated = {
      ...initialData,
      columns: initialData.columns.map((column, index) =>
        index === 0 ? { ...column, title: "AI Backlog" } : column
      ),
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/api/chat") && init?.method === "POST") {
          return Response.json({
            reply: "Renamed the first column.",
            board: updated,
          });
        }
        return Response.json(initialData);
      })
    );

    render(
      <KanbanBoard
        username="user"
        initialBoard={initialData}
        onLogout={async () => undefined}
      />
    );

    await userEvent.type(
      screen.getByPlaceholderText(/ask the assistant/i),
      "Rename backlog"
    );
    await userEvent.click(screen.getByRole("button", { name: /^send$/i }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("AI Backlog")).toBeInTheDocument();
    });
    expect(screen.getByTestId("chat-assistant")).toHaveTextContent(
      "Renamed the first column."
    );
  });
});
