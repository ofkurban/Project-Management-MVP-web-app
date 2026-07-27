import { expect, test } from "@playwright/test";

async function signIn(
  page: import("@playwright/test").Page,
  username = "user",
  password = "password"
) {
  await page.goto("/");
  await expect(page.getByTestId("login-form")).toBeVisible();
  await page.getByLabel(/username/i).fill(username);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
}

test("requires login before showing the board", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("login-form")).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(0);
});

test("rejects wrong credentials", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(/username/i).fill("user");
  await page.getByLabel(/password/i).fill("wrong");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByText(/invalid username or password/i)).toBeVisible();
  await expect(page.getByTestId("login-form")).toBeVisible();
});

test("logs in and out", async ({ page }) => {
  await signIn(page);
  await expect(page.getByText(/signed in as/i)).toBeVisible();
  await page.getByRole("button", { name: /log out/i }).click();
  await expect(page.getByTestId("login-form")).toBeVisible();
});

test("loads the kanban board", async ({ page }) => {
  await signIn(page);
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
});

test("adds a card to a column", async ({ page }) => {
  await signIn(page);
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill("Playwright card");
  await firstColumn.getByPlaceholder("Details").fill("Added via e2e.");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await expect(firstColumn.getByText("Playwright card")).toBeVisible();
});

test("edits a card", async ({ page }) => {
  await signIn(page);
  const card = page.getByTestId("card-card-1");
  await card.getByRole("button", { name: /^edit/i }).click();
  await card.getByLabel(/edit title/i).fill("Edited via e2e");
  await card.getByLabel(/edit details/i).fill("Updated details.");
  await card.getByRole("button", { name: /^save$/i }).click();
  await expect(card.getByText("Edited via e2e")).toBeVisible();
  await expect(card.getByText("Updated details.")).toBeVisible();
});

test("moves a card between columns", async ({ page }) => {
  await signIn(page);
  const card = page.getByTestId("card-card-1");
  const dragHandle = card.getByRole("button", { name: /^drag/i });
  const targetColumn = page.getByTestId("column-col-review");
  const handleBox = await dragHandle.boundingBox();
  const columnBox = await targetColumn.boundingBox();
  if (!handleBox || !columnBox) {
    throw new Error("Unable to resolve drag coordinates.");
  }

  await page.mouse.move(
    handleBox.x + handleBox.width / 2,
    handleBox.y + handleBox.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    columnBox.x + columnBox.width / 2,
    columnBox.y + 120,
    { steps: 12 }
  );
  await page.mouse.up();
  await expect(targetColumn.getByTestId("card-card-1")).toBeVisible();
});

test("persists board changes across refresh", async ({ page }) => {
  const marker = `Persist ${Date.now()}`;
  await signIn(page);
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill(marker);
  await firstColumn.getByPlaceholder("Details").fill("Should survive reload.");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await expect(firstColumn.getByText(marker)).toBeVisible();
  await page.waitForTimeout(500);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
  await expect(page.getByText(marker)).toBeVisible();
});

test("persists card edits across refresh", async ({ page }) => {
  const title = `Edited persist ${Date.now()}`;
  await signIn(page);
  const card = page.getByTestId("card-card-1");
  await card.getByRole("button", { name: /^edit/i }).click();
  await card.getByLabel(/edit title/i).fill(title);
  await card.getByLabel(/edit details/i).fill("Persisted details.");
  await card.getByRole("button", { name: /^save$/i }).click();
  await expect(card.getByText(title)).toBeVisible();
  await page.waitForTimeout(500);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
  await expect(page.getByText(title)).toBeVisible();
  await expect(page.getByText("Persisted details.")).toBeVisible();
});

test("chat sidebar shows reply-only messages", async ({ page }) => {
  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ reply: "Looks good overall.", board: null }),
    });
  });
  await signIn(page);
  await expect(page.getByTestId("chat-sidebar")).toBeVisible();
  await page.getByPlaceholder(/ask the assistant/i).fill("Summarize the board");
  await page.getByRole("button", { name: /^send$/i }).click();
  await expect(page.getByTestId("chat-user")).toContainText("Summarize the board");
  await expect(page.getByTestId("chat-assistant")).toContainText("Looks good overall.");
});

test("chat sidebar applies board updates without reload", async ({ page }) => {
  await signIn(page);
  const board = await page.evaluate(async () => {
    const response = await fetch("/api/board", { credentials: "include" });
    return response.json();
  });
  board.columns[0].title = "Chat Updated";

  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reply: "Renamed the first column.",
        board,
      }),
    });
  });

  await page.getByPlaceholder(/ask the assistant/i).fill("Rename backlog");
  await page.getByRole("button", { name: /^send$/i }).click();
  await expect(page.getByTestId("chat-assistant")).toContainText(
    "Renamed the first column."
  );
  await expect(
    page.locator('[data-testid="column-col-backlog"] input[aria-label="Column title"]')
  ).toHaveValue("Chat Updated");
});
