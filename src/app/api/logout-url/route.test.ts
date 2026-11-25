import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { expect, test, vi } from "vitest";

import { env } from "@/lib/env";

import { GET } from "./route";

vi.mock("@/lib/env", () => ({ env: { AUTH_DEBUG: false } }));
vi.mock("next-auth/jwt", () => ({ getToken: vi.fn() }));
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
    error: "Não foi possível terminar a sessão no AuthNEI",
  });
});

test("returns the issuer logout URL with the session hint and configured return", async () => {
  vi.mocked(getToken).mockResolvedValue({ idTokenHint: "fixture-id-token" });
  Object.assign(env, {
    AUTH_ISSUER_URL: "https://auth.example.test",
    AUTH_CLIENT_ID: "fixture-client",
    AUTH_POST_LOGOUT_REDIRECT_URI: "https://unclassed.example.test/",
  });
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({
          end_session_endpoint: "https://auth.example.test/logout",
        })
      )
  );
  try {
    const response = await GET(
      new NextRequest("https://unclassed.example.test/api/logout-url", {
        headers: { cookie: "authjs.session-token=fixture-cookie" },
      }),
      { params: Promise.resolve({}) }
    );
    expect(response.status).toBe(200);
    const { redirectTo } = await response.json();
    const url = new URL(redirectTo);
    expect(url.origin + url.pathname).toBe("https://auth.example.test/logout");
    expect(url.searchParams.get("id_token_hint")).toBe("fixture-id-token");
    expect(url.searchParams.get("client_id")).toBe("fixture-client");
    expect(url.searchParams.get("post_logout_redirect_uri")).toBe(
      "https://unclassed.example.test/"
    );
  } finally {
    vi.unstubAllGlobals();
  }
});
