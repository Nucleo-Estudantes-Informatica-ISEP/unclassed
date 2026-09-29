import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { test, vi } from "vitest";

import { getLogContext } from "@/lib/logger";
import { handlers } from "@/auth";

import { GET, POST } from "./route";

vi.mock("@/auth", () => ({
  handlers: {
    GET: vi.fn(async () => new Response("GET")),
    POST: vi.fn(async () => new Response("POST")),
  },
}));

test.each([GET, POST])(
  "NextAuth handler receives request log context",
  async (handler) => {
    const id = "a3761e30-5f12-41aa-aea3-773c345abdcd";
    const request = new NextRequest("http://localhost/api/auth/session", {
      headers: { "x-request-id": id },
    });
    const original = handler === GET ? handlers.GET : handlers.POST;
    vi.mocked(original).mockImplementationOnce(async () => {
      await Promise.resolve();
      assert.equal(getLogContext().requestId, id);
      return new Response();
    });

    await handler(request);
    assert.equal(getLogContext().requestId, undefined);
  }
);
