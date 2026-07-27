import NextAuth from "next-auth";
import Zitadel from "next-auth/providers/zitadel";
import CredentialsProvider from "next-auth/providers/credentials";

import { getMissingAuthEnvVars, isAuthConfigured } from "@/lib/auth-config";
import { syncLocalUserFromOidc } from "@/lib/local-user";

function getClaim(
  claims: Record<string, unknown> | undefined,
  key: string
): string | null {
  const value = claims?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function parseBooleanEnv(value: string | undefined, defaultValue: boolean) {
  if (typeof value !== "string") {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  return defaultValue;
}

function parseEmailVerifiedClaim(claims: Record<string, unknown>) {
  const raw = claims.email_verified;

  if (typeof raw === "boolean") {
    return raw;
  }

  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  return undefined;
}

const missingAuthEnvVars = getMissingAuthEnvVars();
const authConfigured = isAuthConfigured();
const authDebugEnabled = process.env.AUTH_DEBUG === "true";
const isProductionBuild =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.npm_lifecycle_event === "build";

if (!authConfigured && process.env.NODE_ENV === "production" && !isProductionBuild) {
  throw new Error(
    `Auth is not configured. Missing environment variables: ${missingAuthEnvVars.join(", ")}`
  );
}

const providers = authConfigured
  ? [
      {
        ...Zitadel({
          issuer: process.env.AUTH_ISSUER_URL,
          clientId: process.env.AUTH_CLIENT_ID,
          clientSecret: process.env.AUTH_CLIENT_SECRET,
          authorization: {
            params: {
              scope: process.env.AUTH_SCOPES || "openid email profile",
            },
          },
        }),
        // ZITADEL may omit profile/email claims from the ID token when an
        // access token is issued. Fetch user data from userinfo instead.
        idToken: false,
      },
    ]
  : [];

if (process.env.ALLOW_DEV_BYPASS === "true" || process.env.NEXT_PUBLIC_ALLOW_DEV_BYPASS === "true") {
  providers.push(
    CredentialsProvider({
      name: "Dev Bypass",
      credentials: {},
      async authorize() {
        return {
          id: "dev-bypass-id",
          name: "Dev Admin User",
          email: "admin@unclassed.local",
        };
      },
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  trustHost: parseBooleanEnv(process.env.AUTH_TRUST_HOST, false),
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "zitadel") {
        return true;
      }

      const claims = (profile ?? {}) as Record<string, unknown>;
      const emailVerified = parseEmailVerifiedClaim(claims);

      if (emailVerified !== true) {
        console.warn(
          "Blocking ZITADEL sign-in because email_verified claim is missing or false."
        );
        return false;
      }

      return true;
    },
    async jwt({ token, account, profile, user, trigger }) {
      if (
        typeof account?.id_token === "string" &&
        account.id_token.length > 0
      ) {
        token.idTokenHint = account.id_token;
        token.idToken = account.id_token;
      }

      if (authDebugEnabled && account) {
        console.info("[auth][jwt]", {
          trigger,
          provider: account.provider,
          hasProfile: Boolean(profile),
          hasUser: Boolean(user),
        });
      }

      // If it's the initial sign in
      if (account) {
        const isCredentials = account.provider === "credentials";
        
        const claims = (profile || {}) as Record<string, unknown>;
        const sub =
          getClaim(claims, "sub") ||
          account.providerAccountId ||
          user?.id ||
          token.sub ||
          null;

        if (!sub) {
          throw new Error("OIDC login did not include a subject claim.");
        }

        const email = getClaim(claims, "email") || user?.email || token.email;
        const name = getClaim(claims, "name") || user?.name || token.name;

        const localUser = await syncLocalUserFromOidc({
          sub,
          email,
          name,
          emailVerified: isCredentials ? true : parseEmailVerifiedClaim(claims),
        });

        token.localUserId = localUser.id;
        token.role = localUser.role;
        token.zitadelSub = sub;
        token.name = localUser.name;
        token.email = localUser.email;
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
        });
      }

      session.user = {
        ...session.user,
        id: token.localUserId as string,
        role: token.role as "USER" | "ADMIN",
        zitadelSub: token.zitadelSub as string,
        name: (token.name as string) || session.user?.name,
        email: (token.email as string) || session.user?.email,
      };

      return session;
    },
  },
});
