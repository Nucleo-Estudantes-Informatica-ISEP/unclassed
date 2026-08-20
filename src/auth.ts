import NextAuth from "next-auth";
import type { JWT } from "next-auth/jwt";
import Zitadel from "next-auth/providers/zitadel";

import { getMissingAuthEnvVars, isAuthConfigured } from "@/lib/auth-config";
import { getAuthNeiRoles, isAdmin } from "@/lib/auth-nei-roles";
import { env } from "@/lib/env";
import { syncLocalUserFromOidc } from "@/lib/local-user";

const REFRESH_SKEW_MS = 30_000;

type ZitadelRefreshResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

function getClaim(
  claims: Record<string, unknown> | undefined,
  key: string
): string | null {
  const value = claims?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function parseEmailVerifiedClaim(claims: Record<string, unknown>) {
  const raw = claims.email_verified;

  if (typeof raw === "boolean") {
    return raw;
  }

  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return undefined;
}

function formUrlEncode(value: string) {
  return new URLSearchParams({ value }).toString().slice("value=".length);
}

function invalidateProviderSession(token: JWT): JWT {
  return {
    ...token,
    accessToken: undefined,
    accessTokenExpiresAt: undefined,
    authNeiRoles: [],
    role: "USER",
    error: "RefreshAccessTokenError",
  };
}

async function fetchUserInfo(accessToken: string) {
  const issuer = env.AUTH_ISSUER_URL?.replace(/\/$/, "");
  if (!issuer) {
    throw new Error("AUTH_ISSUER_URL is not configured");
  }

  const response = await fetch(`${issuer}/oidc/v1/userinfo`, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`ZITADEL userinfo failed with status ${response.status}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

async function refreshProviderToken(token: JWT): Promise<JWT> {
  const issuer = env.AUTH_ISSUER_URL?.replace(/\/$/, "");
  const clientId = env.AUTH_CLIENT_ID;
  const clientSecret = env.AUTH_CLIENT_SECRET;

  if (!issuer || !clientId || !clientSecret || !token.refreshToken) {
    return invalidateProviderSession(token);
  }

  try {
    const basicCredentials = Buffer.from(
      `${formUrlEncode(clientId)}:${formUrlEncode(clientSecret)}`
    ).toString("base64");

    const response = await fetch(`${issuer}/oauth/v2/token`, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Basic ${basicCredentials}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });

    const refreshed = (await response.json()) as ZitadelRefreshResponse;
    if (
      !response.ok ||
      typeof refreshed.access_token !== "string" ||
      typeof refreshed.expires_in !== "number" ||
      refreshed.expires_in <= 0
    ) {
      throw new Error(
        refreshed.error_description ||
          refreshed.error ||
          `ZITADEL token refresh failed with status ${response.status}`
      );
    }

    // Re-read userinfo with the newly issued provider token instead of carrying
    // the Auth.js JWT's cached authorization forward. This makes role changes
    // effective no later than the provider access-token lifetime.
    const userInfo = await fetchUserInfo(refreshed.access_token);
    const authNeiRoles = getAuthNeiRoles(userInfo, env.AUTH_ROLE_CLAIM);
    const refreshedIdToken = refreshed.id_token ?? token.idToken;

    return {
      ...token,
      accessToken: refreshed.access_token,
      accessTokenExpiresAt: Date.now() + refreshed.expires_in * 1000,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      idToken: refreshedIdToken,
      idTokenHint: refreshed.id_token ?? token.idTokenHint,
      authNeiRoles,
      role: isAdmin({ authNeiRoles }) ? "ADMIN" : "USER",
      error: undefined,
    };
  } catch (error) {
    if (authDebugEnabled) {
      console.error("[auth][refresh] Failed to refresh ZITADEL session", error);
    }
    return invalidateProviderSession(token);
  }
}

const missingAuthEnvVars = getMissingAuthEnvVars();
const authConfigured = isAuthConfigured();
const authDebugEnabled = env.AUTH_DEBUG;
const isProductionBuild =
  env.NEXT_PHASE === "phase-production-build" ||
  env.npm_lifecycle_event === "build";

if (!authConfigured && env.NODE_ENV === "production" && !isProductionBuild) {
  throw new Error(
    `Auth is not configured. Missing environment variables: ${missingAuthEnvVars.join(", ")}`
  );
}

const providers = authConfigured
  ? [
      {
        ...Zitadel({
          issuer: env.AUTH_ISSUER_URL,
          clientId: env.AUTH_CLIENT_ID,
          clientSecret: env.AUTH_CLIENT_SECRET,
          authorization: { params: { scope: env.AUTH_SCOPES } },
        }),
        idToken: false,
      },
    ]
  : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  trustHost: env.AUTH_TRUST_HOST,
  secret: env.AUTH_SECRET,
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "zitadel") return true;

      const claims = (profile ?? {}) as Record<string, unknown>;
      if (parseEmailVerifiedClaim(claims) !== true) {
        console.warn(
          "Blocking ZITADEL sign-in because email_verified claim is missing or false."
        );
        return false;
      }

      const sub = getClaim(claims, "sub") || account.providerAccountId || null;
      return Boolean(sub);
    },
    async jwt({ token, account, profile, trigger }) {
      if (typeof account?.id_token === "string" && account.id_token.length > 0) {
        token.idTokenHint = account.id_token;
        token.idToken = account.id_token;
      }

      if (account) {
        token.accessToken = account.access_token;
        token.accessTokenExpiresAt = account.expires_at
          ? account.expires_at * 1000
          : undefined;
        token.refreshToken = account.refresh_token;
        token.error = undefined;
      }

      if (authDebugEnabled && account) {
        console.info("[auth][jwt]", {
          trigger,
          provider: account.provider,
          hasProfile: Boolean(profile),
          hasIdToken: typeof account.id_token === "string",
          hasAccessToken: typeof account.access_token === "string",
          hasRefreshToken: typeof account.refresh_token === "string",
          accessTokenExpiresAt: account.expires_at ?? null,
          hasStoredIdTokenHint: typeof token.idTokenHint === "string",
          hasStoredIdToken: typeof token.idToken === "string",
          hasTokenEmail: typeof token.email === "string",
          hasProfileEmail:
            typeof (profile as Record<string, unknown> | undefined)?.email ===
            "string",
        });
      }

      if (account && profile) {
        const claims = profile as Record<string, unknown>;
        const sub =
          getClaim(claims, "sub") ||
          account.providerAccountId ||
          token.sub ||
          null;

        if (!sub) {
          throw new Error("OIDC login did not include a subject claim.");
        }

        const authNeiRoles = getAuthNeiRoles(claims, env.AUTH_ROLE_CLAIM);
        const localUser = await syncLocalUserFromOidc({
          sub,
          email: getClaim(claims, "email") || token.email,
          name: getClaim(claims, "name") || token.name,
          emailVerified: parseEmailVerifiedClaim(claims),
        });

        token.localUserId = localUser.id;
        token.authNeiRoles = authNeiRoles;
        token.role = isAdmin({ authNeiRoles }) ? "ADMIN" : "USER";
        token.zitadelSub = sub;
        token.name = localUser.name;
        token.email = localUser.email;

        return token;
      }

      const accessTokenExpiresAt = token.accessTokenExpiresAt;
      const providerTokenNeedsRefresh =
        typeof accessTokenExpiresAt !== "number" ||
        !Number.isFinite(accessTokenExpiresAt) ||
        Date.now() >= accessTokenExpiresAt - REFRESH_SKEW_MS;

      if (providerTokenNeedsRefresh) {
        return refreshProviderToken(token);
      }

      return token;
    },
    async session({ session, token }) {
      if (authDebugEnabled) {
        console.info("[auth][session]", {
          hasUser: Boolean(session.user),
          hasLocalUserId: typeof token.localUserId === "string",
          hasRole: typeof token.role === "string",
          hasZitadelSub: typeof token.zitadelSub === "string",
          hasTokenEmail: typeof token.email === "string",
          hasIdTokenHint: typeof token.idTokenHint === "string",
          hasIdToken: typeof token.idToken === "string",
          error: token.error ?? null,
        });
      }

      const authNeiRoles = token.error ? [] : (token.authNeiRoles ?? []);
      session.error = token.error;
      session.user = {
        ...session.user,
        id: token.localUserId as string,
        role: isAdmin({ authNeiRoles }) ? "ADMIN" : "USER",
        roles: authNeiRoles,
        zitadelSub: token.zitadelSub as string,
        name: (token.name as string) || session.user?.name,
        email: (token.email as string) || session.user?.email,
      };

      return session;
    },
  },
});
