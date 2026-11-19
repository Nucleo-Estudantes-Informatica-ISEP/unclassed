import { assertSafeTestDatabaseUrl, createTestUser } from "@tests/helpers/db";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { env } from "@/lib/env";
import * as authSessionRepo from "@/application/repositories/authSessionRepository";
import {
  createAuthSession,
  getAuthSessionRoles,
  revokeAuthSession,
} from "@/application/services/authSessionService";

const originalEnv = { ...env };
const provider = "https://auth.example.test";
const subject = "fixture-auth-subject";
const sessionIds: string[] = [];

beforeEach(() => {
  assertSafeTestDatabaseUrl();
  Object.assign(env, {
    AUTH_SECRET: "synthetic-auth-session-encryption-key",
    AUTH_ISSUER_URL: provider,
    AUTH_CLIENT_ID: "fixture-client",
    AUTH_CLIENT_SECRET: "fixture-client-credential",
    AUTH_ROLE_CLAIM: "projectRoles",
  });
});

afterEach(async () => {
  for (const id of sessionIds.splice(0)) await authSessionRepo.remove(id);
  vi.unstubAllGlobals();
  Object.assign(env, originalEnv);
});

async function fixtureSession(providerExpiresAt = new Date(0)) {
  const { id: userId } = await createTestUser();
  const id = await createAuthSession({
    userId,
    roles: ["admin"],
    providerExpiresAt,
    refreshToken: "initial-fixture-token",
  });
  sessionIds.push(id);
  return { id, userId };
}

test("concurrent requests rotate once and observe the same current roles", async () => {
  const { id, userId } = await fixtureSession();
  const initial = await authSessionRepo.find(id);
  expect(initial?.encryptedRefreshToken).toBeTruthy();
  expect(initial?.encryptedRefreshToken).not.toContain("initial-fixture-token");

  const exchange = vi.fn(async (input: URL, init: RequestInit) => {
    expect(input.origin).toBe(provider);
    if (input.pathname === "/oauth/v2/token") {
      expect((init.body as URLSearchParams).get("refresh_token")).toBe(
        "initial-fixture-token"
      );
      return Response.json({
        access_token: "fixture-access",
        refresh_token: "rotated-fixture-token",
        expires_in: 300,
      });
    }
    expect(input.pathname).toBe("/oidc/v1/userinfo");
    expect(new Headers(init.headers).get("authorization")).toBe(
      "Bearer fixture-access"
    );
    return Response.json({
      sub: subject,
      email_verified: true,
      projectRoles: [],
    });
  });
  vi.stubGlobal("fetch", exchange);

  const roles = await Promise.all([
    getAuthSessionRoles(id, userId, subject),
    getAuthSessionRoles(id, userId, subject),
  ]);
  expect(roles).toEqual([[], []]);
  expect(
    exchange.mock.calls.filter(([url]) => url.pathname === "/oauth/v2/token")
  ).toHaveLength(1);
  expect(await getAuthSessionRoles(id, userId, subject)).toEqual([]);
  expect(exchange).toHaveBeenCalledTimes(2);
  expect((await authSessionRepo.find(id))?.encryptedRefreshToken).not.toBe(
    initial?.encryptedRefreshToken
  );

  const revoke = vi.fn(async (url: URL, init: RequestInit) => {
    expect(url.pathname).toBe("/oauth/v2/revoke");
    expect((init.body as URLSearchParams).get("token")).toBe(
      "rotated-fixture-token"
    );
    return new Response(null, { status: 200 });
  });
  vi.stubGlobal("fetch", revoke);
  await revokeAuthSession(id);
  expect(revoke).toHaveBeenCalledOnce();
  expect(await getAuthSessionRoles(id, userId, subject)).toBeNull();
});

test("provider refresh rejection invalidates the current session", async () => {
  const { id, userId } = await fixtureSession();
  const exchange = vi.fn(async () =>
    Response.json({ error: "invalid_grant" }, { status: 400 })
  );
  vi.stubGlobal("fetch", exchange);

  expect(await getAuthSessionRoles(id, userId, subject)).toBeNull();
  expect(await getAuthSessionRoles(id, userId, subject)).toBeNull();
  expect(await authSessionRepo.find(id)).toBeNull();
  expect(exchange).toHaveBeenCalledOnce();
});

test("local logout invalidates the session even if provider revocation fails", async () => {
  const { id, userId } = await fixtureSession(new Date(Date.now() + 60_000));
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(null, { status: 503 }))
  );

  expect(await getAuthSessionRoles(id, userId, subject)).toEqual(["admin"]);
  await revokeAuthSession(id);
  expect(await getAuthSessionRoles(id, userId, subject)).toBeNull();
});
