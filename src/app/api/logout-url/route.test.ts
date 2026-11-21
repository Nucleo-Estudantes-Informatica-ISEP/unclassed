import { NextRequest } from "next/server";
import { expect, test, vi } from "vitest";

import { GET } from "./route";

vi.mock("@/lib/env", () => ({ env: { AUTH_DEBUG: false } }));
vi.mock("@/lib/apiAccess", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn() },
  safeError: vi.fn(),
}));
vi.mock("@/lib/requestLogContext", () => ({
  withRequestLogContext: (_request: unknown, handler: () => unknown) =>
    handler(),
}));

test("returns 503 without a redirect when the issuer is not configured", async () => {
  const response = await GET(
    new NextRequest("https://unclassed.example.test/api/logout-url"),
    { params: Promise.resolve({}) }
  );

  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({
    error: "AuthNEI logout unavailable",
  });
});
