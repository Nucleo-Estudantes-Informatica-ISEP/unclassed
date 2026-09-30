import assert from "node:assert/strict";
import { NextRequest, NextResponse } from "next/server";
import { expect, test, vi } from "vitest";

import { authorizeRequest } from "@/lib/apiAccess";
import { getLogContext } from "@/lib/logger";
import { handlers } from "@/auth";

import { GET, POST } from "./route";

vi.mock("@/auth", () => ({ handlers: { GET: vi.fn(), POST: vi.fn() } }));
vi.mock("@/lib/apiAccess", () => ({ authorizeRequest: vi.fn() }));

test.each([
  ["GET", GET],
  ["POST", POST],
] as const)(
  "NextAuth %s owns auth and retains cookies and redirects",
  async (method, route) => {
    const response = NextResponse.redirect("http://localhost/callback");
    response.cookies.set("session", "test-cookie", { httpOnly: true });
    vi.mocked(handlers[method]).mockResolvedValue(response);
    const request = new NextRequest("http://localhost/api/auth/callback", {
      method,
    });
    const result = await route(request);
    expect(result).toBe(response);
    expect(result.headers.get("Set-Cookie")).toContain("HttpOnly");
    expect(handlers[method]).toHaveBeenCalledWith(request);
    expect(authorizeRequest).not.toHaveBeenCalled();
  }
);

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

    assert.equal((await handler(request)).status, 200);
    assert.equal(getLogContext().requestId, undefined);
  }
);
