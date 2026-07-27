import { describe, expect, it, vi, afterEach } from "vitest";
import { fetchBoard, saveBoard } from "@/lib/boardApi";
import { initialData } from "@/lib/kanban";

describe("boardApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetchBoard returns JSON on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(initialData))
    );
    await expect(fetchBoard()).resolves.toEqual(initialData);
  });

  it("fetchBoard throws on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 500 }))
    );
    await expect(fetchBoard()).rejects.toThrow(/failed to load board/i);
  });

  it("saveBoard PUTs the board", async () => {
    const fetchMock = vi.fn(async () => Response.json(initialData));
    vi.stubGlobal("fetch", fetchMock);
    await expect(saveBoard(initialData)).resolves.toEqual(initialData);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/board",
      expect.objectContaining({ method: "PUT" })
    );
  });
});
