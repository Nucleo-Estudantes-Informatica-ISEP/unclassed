import { NextRequest, NextResponse } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";
import { z } from "zod";

import { authorizeRequest } from "@/lib/apiAccess";
import { defineHandler } from "@/lib/defineHandler";

vi.mock("@/lib/apiAccess", () => ({ authorizeRequest: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
const request = (body: string) =>
  new NextRequest("http://localhost/api/test", { method: "POST", body });

test("auth failure preserves status, headers and body before parsing or running handlers", async () => {
  const response = NextResponse.json(
    { error: "limited" },
    { status: 429, headers: { "Retry-After": "60" } }
  );
  vi.mocked(authorizeRequest).mockResolvedValue({ ok: false, response });
  const handler = vi.fn();
  const route = defineHandler({
    auth: { requireAdmin: true, rateLimit: "create" },
    schema: z.object({ name: z.string() }),
    handler,
  });
  const result = await route(request("{"));
  expect(result).toBe(response);
  expect(handler).not.toHaveBeenCalled();
  expect(authorizeRequest).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      enforceSameOriginForSessionWrites: true,
      requireAdmin: true,
      rateLimit: "create",
    })
  );
});

test("parses input and async params before resource authorization", async () => {
  vi.mocked(authorizeRequest).mockResolvedValue({
    ok: true,
    authenticatedBy: "session",
    session: { id: "owner" },
  } as never);
  const handler = vi.fn(() =>
    NextResponse.json({ saved: true }, { status: 201 })
  );
  const authorize = vi.fn(({ body }) =>
    body.name === "allowed"
      ? undefined
      : NextResponse.json({ error: "forbidden" }, { status: 403 })
  );
  const route = defineHandler({
    schema: z.object({ name: z.string().trim() }),
    authorize,
    handler,
  });
  expect(
    (
      await route(request('{"name":"denied"}'), {
        params: Promise.resolve({ id: "item" }),
      })
    ).status
  ).toBe(403);
  expect(handler).not.toHaveBeenCalled();
  expect((await route(request('{"name":" allowed "}'))).status).toBe(201);
  expect(handler).toHaveBeenCalledWith(
    expect.objectContaining({
      body: { name: "allowed" },
      session: { id: "owner" },
    })
  );
});

test.each(["{", '{"name":1}', "null"])(
  "invalid body %s returns 400",
  async (body) => {
    const handler = vi.fn();
    const route = defineHandler({
      auth: false,
      schema: z.object({ name: z.string() }),
      handler,
    });
    expect((await route(request(body))).status).toBe(400);
    expect(handler).not.toHaveBeenCalled();
  }
);

test("unexpected failures do not leak internals; custom errors and redirects survive", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const route = defineHandler({
    auth: false,
    handler: () => {
      throw new Error("private database URL");
    },
  });
  const response = await route(request("{}"));
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: "Erro interno do servidor" });
  const redirect = NextResponse.redirect("http://localhost/login");
  expect(
    await defineHandler({ auth: false, handler: () => redirect })(request("{}"))
  ).toBe(redirect);
  expect(authorizeRequest).not.toHaveBeenCalled();
});
