import NextAuth from "next-auth";
import Zitadel from "next-auth/providers/zitadel";

import { getMissingAuthEnvVars, isAuthConfigured } from "@/lib/auth-config";
import {
  getAuthNeiRoles,
  hasVerifiedEmailClaim,
  isAdmin,
} from "@/lib/auth-nei-roles";
import { env } from "@/lib/env";
import { isFixtureDatabase } from "@/lib/fixtureDatabase";
import { syncLocalUserFromOidc } from "@/lib/local-user";
import { logger, safeError } from "@/lib/logger";
import {
  AUTH_SESSION_MAX_AGE,
  createAuthSession,
  getAuthSessionRoles,
  revokeAuthSession,
} from "@/application/services/authSessionService";

function getClaim(
  claims: Record<string, unknown> | undefined,
  key: string
): string | null {
  const value = claims?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
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
  useSecureCookies: env.NODE_ENV === "production" ? true : undefined,
  secret: env.AUTH_SECRET,
  pages: { signIn: "/login" },
  logger: {
    error(error) {
      logger.error(safeError(error), "Auth.js request failed");
    },
  },
  session: { strategy: "jwt", maxAge: AUTH_SESSION_MAX_AGE },
  events: {
    async signOut(message) {
      if ("token" in message && message.token?.authSessionId) {
        await revokeAuthSession(message.token.authSessionId);
      }
    },
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "zitadel") return true;

      const claims = (profile ?? {}) as Record<string, unknown>;
      if (!hasVerifiedEmailClaim(claims)) {
        logger.warn(
          "Blocking ZITADEL sign-in because email_verified claim is missing or false."
        );
        return false;
      }

      const sub = getClaim(claims, "sub") || account.providerAccountId || null;
      return Boolean(sub);
    },
    async jwt({ token, account, profile, trigger }) {
      if (account) {
        const claims = (profile ?? {}) as Record<string, unknown>;
        const sub =
          getClaim(claims, "sub") || account.providerAccountId || null;
        if (!sub || !hasVerifiedEmailClaim(claims)) return null;

        if (authDebugEnabled) logger.info({ trigger }, "[auth][jwt]");
        const roles = getAuthNeiRoles(claims, env.AUTH_ROLE_CLAIM);
        const localUser = await syncLocalUserFromOidc({
          sub,
          email: getClaim(claims, "email") || token.email,
          name: getClaim(claims, "name") || token.name,
          emailVerified: true,
        });
        const expiresAt = account.expires_at;
        const authSessionId = await createAuthSession({
          userId: localUser.id,
          roles,
          providerExpiresAt: new Date(
            typeof expiresAt === "number" && Number.isFinite(expiresAt)
              ? expiresAt * 1000
              : Date.now()
          ),
          refreshToken: account.refresh_token,
        });

        return {
          authSessionId,
          localUserId: localUser.id,
          zitadelSub: sub,
          authNeiRoles: roles,
          name: localUser.name,
          email: localUser.email,
          picture: token.picture,
        };
      }

      if (token.fixtureSession && isFixtureDatabase() && env.E2E_TEST_SECRET) {
        return token;
      }
      if (!token.authSessionId || !token.localUserId || !token.zitadelSub)
        return null;

      const roles = await getAuthSessionRoles(
        token.authSessionId,
        token.localUserId,
        token.zitadelSub
      );
      return roles ? { ...token, authNeiRoles: roles } : null;
    },
    async session({ session, token }) {
      if (authDebugEnabled) {
        logger.info("[auth][session]");
      }

      const authNeiRoles = token.authNeiRoles ?? [];
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
