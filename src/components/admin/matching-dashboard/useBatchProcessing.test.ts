import useSWRMutation from "swr/mutation";
import { afterEach, expect, test, vi } from "vitest";

import { HttpError } from "@/lib/httpClient";

import { useBatchProcessing } from "./useBatchProcessing";

vi.mock("swr/mutation", () => ({ default: vi.fn() }));
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

test("batch mutation sends PUT and returns parsed results", async () => {
  const result = { success: true, matchesFound: 2 };
  const fetch = vi.fn().mockResolvedValue(Response.json(result));
  vi.stubGlobal("fetch", fetch);
  useBatchProcessing(vi.fn());
  const [url, mutate] = vi.mocked(useSWRMutation).mock.calls[0];
  expect(url).toBe("/api/matching");
  expect(
    await (mutate as (url: string) => Promise<unknown>)("/api/matching")
  ).toEqual(result);
  expect(fetch).toHaveBeenCalledWith(
    "/api/matching",
    expect.objectContaining({
      method: "PUT",
      credentials: "same-origin",
    })
  );
});

test("failed batch HTTP responses reject instead of populating result data", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { error: "Limite de pedidos excedido" },
          { status: 429, headers: { "Retry-After": "15" } }
        )
      )
  );
  useBatchProcessing(vi.fn());
  const [, mutate] = vi.mocked(useSWRMutation).mock.calls[0];
  await expect(
    (mutate as (url: string) => Promise<unknown>)("/api/matching")
  ).rejects.toBeInstanceOf(HttpError);
});
