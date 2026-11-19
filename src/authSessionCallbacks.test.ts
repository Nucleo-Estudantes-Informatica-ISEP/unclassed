import NextAuth, { type NextAuthConfig } from "next-auth";
import { expect, test, vi } from "vitest";

import { syncLocalUserFromOidc } from "@/lib/local-user";
import {
  createAuthSession,
  getAuthSessionRoles,
  revokeAuthSession,
} from "@/application/services/authSessionService";

import "./auth";

vi.mock("next-auth", () => ({ default: vi.fn().mockReturnValue({}) }));
vi.mock("@/lib/local-user", () => ({ syncLocalUserFromOidc: vi.fn() }));
vi.mock("@/application/services/authSessionService", () => ({
  AUTH_SESSION_MAX_AGE: 30 * 24 * 60 * 60,
  createAuthSession: vi.fn(),
  getAuthSessionRoles: vi.fn(),
  revokeAuthSession: vi.fn(),
}));

test("sign-in issues a session reference and uses fresh server roles on every request", async () => {
  const config = vi.mocked(NextAuth).mock.calls[0][0] as NextAuthConfig;
  const jwt = config.callbacks?.jwt;
  expect(jwt).toBeDefined();

  vi.mocked(syncLocalUserFromOidc).mockResolvedValue({
    id: "local-user",
    name: "Fixture User",
    email: "fixture@example.test",
  } as never);
  vi.mocked(createAuthSession).mockResolvedValue("session-reference");
  const token = await jwt!({
    token: {},
    user: { id: "oidc-subject" },
    account: {
      provider: "zitadel",
      providerAccountId: "oidc-subject",
      type: "oidc",
      access_token: "synthetic-access",
      refresh_token: "synthetic-refresh",
      id_token: "synthetic-id",
      expires_at: 2_000_000_000,
    },
    profile: {
      sub: "oidc-subject",
      email: "fixture@example.test",
      email_verified: true,
    },
  });

  expect(createAuthSession).toHaveBeenCalledWith(
    expect.objectContaining({ refreshToken: "synthetic-refresh" })
  );
  expect(token).toMatchObject({
    authSessionId: "session-reference",
    localUserId: "local-user",
  });
  expect(JSON.stringify(token)).not.toContain("synthetic-");
  if (!token) throw new Error("Expected a session token");

  vi.mocked(getAuthSessionRoles)
    .mockResolvedValueOnce(["admin"])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce(null);
  const currentJwt = { token, user: { id: "local-user" }, account: null };
  expect(await jwt!(currentJwt)).toMatchObject({ authNeiRoles: ["admin"] });
  expect(await jwt!(currentJwt)).toMatchObject({ authNeiRoles: [] });
  expect(await jwt!(currentJwt)).toBeNull();

  await config.events?.signOut?.({ token });
  expect(revokeAuthSession).toHaveBeenCalledWith("session-reference");
});
