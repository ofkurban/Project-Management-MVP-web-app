import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanBoard } from "@/components/KanbanBoard";
import { App } from "@/components/App";
import { initialData } from "@/lib/kanban";

const getFirstColumn = () => screen.getAllByTestId(/column-/i)[0];

const renderBoard = () =>
  render(
    <KanbanBoard
      username="user"
      initialBoard={initialData}
      onLogout={async () => undefined}
    />
  );

describe("KanbanBoard", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(initialData))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders five columns", () => {
    renderBoard();
    expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
  });

  it("renames a column", async () => {
    renderBoard();
    const column = getFirstColumn();
    const input = within(column).getByLabelText("Column title");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    expect(input).toHaveValue("New Name");
  });

  it("adds and removes a card", async () => {
    renderBoard();
    const column = getFirstColumn();
    const addButton = within(column).getByRole("button", {
      name: /add a card/i,
    });
    await userEvent.click(addButton);

    const titleInput = within(column).getByPlaceholderText(/card title/i);
    await userEvent.type(titleInput, "New card");
    const detailsInput = within(column).getByPlaceholderText(/details/i);
    await userEvent.type(detailsInput, "Notes");

    await userEvent.click(within(column).getByRole("button", { name: /add card/i }));

    expect(within(column).getByText("New card")).toBeInTheDocument();

    const deleteButton = within(column).getByRole("button", {
      name: /delete new card/i,
    });
    await userEvent.click(deleteButton);

    expect(within(column).queryByText("New card")).not.toBeInTheDocument();
  });

  it("edits a card title and details", async () => {
    renderBoard();
    const card = screen.getByTestId("card-card-1");
    await userEvent.click(
      within(card).getByRole("button", { name: /edit align roadmap themes/i })
    );

    const titleInput = within(card).getByLabelText(/edit title/i);
    const detailsInput = within(card).getByLabelText(/edit details/i);
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Updated roadmap");
    await userEvent.clear(detailsInput);
    await userEvent.type(detailsInput, "Revised notes.");
    await userEvent.click(within(card).getByRole("button", { name: /^save$/i }));

    expect(within(card).getByText("Updated roadmap")).toBeInTheDocument();
    expect(within(card).getByText("Revised notes.")).toBeInTheDocument();
  });
});

describe("App auth", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows login then board after successful sign-in", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/me")) {
        return new Response(null, { status: 401 });
      }
      if (url.endsWith("/api/login") && init?.method === "POST") {
        return Response.json({ username: "user" });
      }
      if (url.endsWith("/api/board") && (!init?.method || init.method === "GET")) {
        return Response.json(initialData);
      }
      if (url.endsWith("/api/board") && init?.method === "PUT") {
        return Response.json(initialData);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    expect(await screen.findByTestId("login-form")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/username/i), "user");
    await userEvent.type(screen.getByLabelText(/password/i), "password");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Kanban Studio" })).toBeInTheDocument();
    });
    expect(screen.getByText(/signed in as/i)).toBeInTheDocument();
  });

  it("logs out back to the login form", async () => {
    let authenticated = true;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/me")) {
        if (authenticated) {
          return Response.json({ username: "user" });
        }
        return new Response(null, { status: 401 });
      }
      if (url.endsWith("/api/board") && (!init?.method || init.method === "GET")) {
        return Response.json(initialData);
      }
      if (url.endsWith("/api/board") && init?.method === "PUT") {
        return Response.json(initialData);
      }
      if (url.endsWith("/api/logout") && init?.method === "POST") {
        authenticated = false;
        return Response.json({ ok: true });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "Kanban Studio" })
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /log out/i }));
    expect(await screen.findByTestId("login-form")).toBeInTheDocument();
  });
});
