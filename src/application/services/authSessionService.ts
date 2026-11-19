import { randomUUID } from "node:crypto";
import { setTimeout as wait } from "node:timers/promises";
import { decode, encode } from "next-auth/jwt";
import { z } from "zod";

import {
  AUTH_NEI_ROLES,
  getAuthNeiRoles,
  hasVerifiedEmailClaim,
  type AuthNeiRole,
} from "@/lib/auth-nei-roles";
import { env } from "@/lib/env";
import { logger, safeError } from "@/lib/logger";
import * as authSessionRepo from "@/application/repositories/authSessionRepository";

export const AUTH_SESSION_MAX_AGE = 30 * 24 * 60 * 60;
const PROVIDER_TIMEOUT_MS = 4_000;
const REFRESH_WAIT_MS = 2 * PROVIDER_TIMEOUT_MS + 2_000;

const tokenResponse = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive().finite(),
  refresh_token: z.string().min(1),
});

function getAuthSecret() {
  if (!env.AUTH_SECRET)
    throw new Error("Auth session encryption is unconfigured");
  return env.AUTH_SECRET;
}

function refreshTokenSalt(id: string) {
  return `unclassed-provider-session:${id}`;
}

function sealRefreshToken(id: string, refreshToken: string) {
  return encode({
    secret: getAuthSecret(),
    salt: refreshTokenSalt(id),
    token: { refreshToken },
    maxAge: AUTH_SESSION_MAX_AGE,
  });
}

async function readRefreshToken(id: string, token: string | null) {
  if (!token) return null;
  const payload = await decode({
    secret: getAuthSecret(),
    salt: refreshTokenSalt(id),
    token,
  });
  return typeof payload?.refreshToken === "string"
    ? payload.refreshToken
    : null;
}

function providerRequest(path: string, form: Record<string, string>) {
  const {
    AUTH_ISSUER_URL: issuer,
    AUTH_CLIENT_ID: clientId,
    AUTH_CLIENT_SECRET: clientSecret,
  } = env;
  if (!issuer || !clientId || !clientSecret)
    throw new Error("AuthNEI is unconfigured");

  const formEncode = (value: string) =>
    new URLSearchParams({ value }).toString().slice(6);
  const credentials = Buffer.from(
    `${formEncode(clientId)}:${formEncode(clientSecret)}`
  ).toString("base64");
  return fetch(new URL(path, issuer), {
    method: "POST",
    headers: {
      authorization: `Basic ${credentials}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(form),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
}

async function revokeRefreshToken(refreshToken: string) {
  try {
    const response = await providerRequest("/oauth/v2/revoke", {
      token: refreshToken,
      token_type_hint: "refresh_token",
    });
    if (!response.ok) throw new Error("AuthNEI rejected token revocation");
  } catch (error) {
    logger.warn(safeError(error), "AuthNEI refresh token revocation failed");
  }
}

export async function createAuthSession(input: {
  userId: string;
  roles: AuthNeiRole[];
  providerExpiresAt: Date;
  refreshToken?: string;
}) {
  const id = randomUUID();
  await authSessionRepo.create({
    id,
    userId: input.userId,
    roles: input.roles,
    providerExpiresAt: input.providerExpiresAt,
    encryptedRefreshToken: input.refreshToken
      ? await sealRefreshToken(id, input.refreshToken)
      : null,
    expiresAt: new Date(Date.now() + AUTH_SESSION_MAX_AGE * 1000),
    refreshStartedAt: null,
  });
  return id;
}

export async function revokeAuthSession(id: string) {
  const session = await authSessionRepo.remove(id);
  if (!session) return;
  const refreshToken = await readRefreshToken(
    id,
    session.encryptedRefreshToken
  );
  if (refreshToken) await revokeRefreshToken(refreshToken);
}

async function renewAuthSession(
  id: string,
  startedAt: Date,
  subject: string,
  encryptedToken: string | null
) {
  let rotatedToken: string | undefined;
  try {
    const refreshToken = await readRefreshToken(id, encryptedToken);
    if (!refreshToken) {
      await authSessionRepo.remove(id);
      return null;
    }
    const response = await providerRequest("/oauth/v2/token", {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
    if (!response.ok) throw new Error("AuthNEI rejected token refresh");
    const provider = tokenResponse.parse(await response.json());
    rotatedToken = provider.refresh_token;
    const providerExpiresAt = new Date(Date.now() + provider.expires_in * 1000);

    const userInfo = await fetch(
      new URL("/oidc/v1/userinfo", env.AUTH_ISSUER_URL),
      {
        headers: { authorization: `Bearer ${provider.access_token}` },
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      }
    );
    if (!userInfo.ok) throw new Error("AuthNEI rejected userinfo");
    const claims = z
      .record(z.string(), z.unknown())
      .parse(await userInfo.json());
    if (claims.sub !== subject || !hasVerifiedEmailClaim(claims)) {
      throw new Error("AuthNEI identity verification failed");
    }
    const roles = getAuthNeiRoles(claims, env.AUTH_ROLE_CLAIM);

    const result = await authSessionRepo.finishRefresh(id, startedAt, {
      roles,
      providerExpiresAt,
      encryptedRefreshToken: await sealRefreshToken(id, rotatedToken),
    });
    if (result.count === 1) return roles;
  } catch (error) {
    logger.warn(safeError(error), "AuthNEI session refresh failed");
    await authSessionRepo.remove(id);
  }
  if (rotatedToken) await revokeRefreshToken(rotatedToken);
  return null;
}

export async function getAuthSessionRoles(
  id: string,
  userId: string,
  subject: string
) {
  const deadline = Date.now() + REFRESH_WAIT_MS;
  while (Date.now() < deadline) {
    const session = await authSessionRepo.find(id);
    const now = new Date();
    if (!session || session.userId !== userId || session.expiresAt <= now)
      return null;

    if (session.providerExpiresAt > now) {
      return AUTH_NEI_ROLES.filter((role) => session.roles.includes(role));
    }
    if (session.refreshStartedAt) {
      // An interrupted exchange may have consumed the grant. Require sign-in before retrying.
      if (now.getTime() - session.refreshStartedAt.getTime() >= REFRESH_WAIT_MS)
        return null;
      await wait(150);
      continue;
    }
    const claim = await authSessionRepo.claimRefresh(
      id,
      session.providerExpiresAt,
      now
    );
    if (claim.count === 1) {
      return renewAuthSession(id, now, subject, session.encryptedRefreshToken);
    }
  }
  return null;
}
