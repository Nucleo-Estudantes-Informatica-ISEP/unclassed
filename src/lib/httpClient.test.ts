import { afterEach, expect, test, vi } from "vitest";

import { HttpClient, HttpError } from "@/lib/httpClient";

afterEach(() => vi.unstubAllGlobals());
test.each(["get", "post", "patch", "put", "delete"] as const)(
  "%s shares JSON, credentials and typed parsing",
  async (method) => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ id: "123" }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new HttpClient();
    const result =
      method === "get" || method === "delete"
        ? await client[method]<{ id: string }>("/api/items")
        : await client[method]<{ id: string }>("/api/items", { name: "item" });
    expect(result.id).toBe("123");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/items",
      expect.objectContaining({
        method: method.toUpperCase(),
        credentials: "same-origin",
      })
    );
    if (method !== "get" && method !== "delete") {
      expect(fetchMock.mock.calls[0][1].body).toBe('{"name":"item"}');
      expect(fetchMock.mock.calls[0][1].headers.get("Content-Type")).toBe(
        "application/json"
      );
    }
  }
);
test("retains server error details and retry headers", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { error: "Aguarda", details: ["reason"] },
          { status: 429, headers: { "Retry-After": "30" } }
        )
      )
  );
  try {
    await new HttpClient().get("/api/items");
    expect.fail("should reject");
  } catch (error) {
    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({
      message: "Aguarda",
      status: 429,
      body: { details: ["reason"] },
    });
    expect((error as HttpError).headers.get("Retry-After")).toBe("30");
  }
});
test("handles empty success, non-JSON errors and cancellation", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(
      new Response("<html>proxy error</html>", { status: 502 })
    );
  vi.stubGlobal("fetch", fetchMock);
  const client = new HttpClient();
  expect(await client.delete("/api/items/1")).toBeUndefined();
  await expect(client.get("/api/items")).rejects.toMatchObject({
    status: 502,
    message: "Erro: 502",
  });
  const controller = new AbortController();
  const abort = new DOMException("Aborted", "AbortError");
  fetchMock.mockRejectedValueOnce(abort);
  await expect(
    client.get("/api/items", { signal: controller.signal, cache: "no-store" })
  ).rejects.toBe(abort);
  expect(fetchMock).toHaveBeenLastCalledWith(
    "/api/items",
    expect.objectContaining({ signal: controller.signal, cache: "no-store" })
  );
});
