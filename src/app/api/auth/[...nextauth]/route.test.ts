import { expect, test, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/auth", () => ({ handlers: { GET: vi.fn(), POST: vi.fn() } }));
vi.mock("@/lib/apiAccess", () => ({ authorizeRequest: vi.fn() }));

import { handlers } from "@/auth";
import { authorizeRequest } from "@/lib/apiAccess";
import { GET, POST } from "./route";

test.each([["GET", GET], ["POST", POST]] as const)("NextAuth %s owns auth and retains cookies and redirects", async (method, route) => {
  const response = NextResponse.redirect("http://localhost/callback");
  response.cookies.set("session", "test-cookie", { httpOnly: true });
  vi.mocked(handlers[method]).mockResolvedValue(response);
  const request = new NextRequest("http://localhost/api/auth/callback", { method });
  const result = await route(request);
  expect(result).toBe(response);
  expect(result.headers.get("Set-Cookie")).toContain("HttpOnly");
  expect(handlers[method]).toHaveBeenCalledWith(request);
  expect(authorizeRequest).not.toHaveBeenCalled();
});
