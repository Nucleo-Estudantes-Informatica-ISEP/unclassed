import NextAuth from "next-auth";
import Zitadel from "next-auth/providers/zitadel";

import { getMissingAuthEnvVars, isAuthConfigured } from "@/lib/auth-config";
import { getAuthNeiRoles, isAdmin, isStudent } from "@/lib/auth-nei-roles";
import { provisionStudentForNormalOnboarding } from "@/lib/authnei-provisioner";
import { env } from "@/lib/env";
import { syncLocalUserFromOidc } from "@/lib/local-user";

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
      if (!sub) return false;

      try {
        const result = await provisionStudentForNormalOnboarding(
          sub,
          getAuthNeiRoles(claims, env.AUTH_ROLE_CLAIM)
        );
        return result === "provisioned"
          ? "/login?studentProvisioned=true"
          : true;
      } catch (error) {
        if (authDebugEnabled) {
          console.warn("[auth][provisioning]", {
            message:
              error instanceof Error
                ? error.message
                : "Unknown provisioning failure",
          });
        }
        return false;
      }
    },
    async jwt({ token, account, profile, trigger }) {
      if (typeof account?.id_token === "string" && account.id_token.length > 0) {
        token.idTokenHint = account.id_token;
        token.idToken = account.id_token;
      }

      if (authDebugEnabled && account) {
        console.info("[auth][jwt]", {
          trigger,
          provider: account.provider,
          hasProfile: Boolean(profile),
          hasIdToken: typeof account.id_token === "string",
          hasAccessToken: typeof account.access_token === "string",
          hasStoredIdTokenHint: typeof token.idTokenHint === "string",
          hasStoredIdToken: typeof token.idToken === "string",
          hasTokenEmail: typeof token.email === "string",
          hasProfileEmail:
            typeof (profile as Record<string, unknown> | undefined)?.email ===
            "string",
        });
      }

      if (!account || !profile) return token;

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
      if (!isStudent({ authNeiRoles })) {
        throw new Error("OIDC login did not include the required student role.");
      }

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
        roles: token.authNeiRoles ?? [],
        zitadelSub: token.zitadelSub as string,
        name: (token.name as string) || session.user?.name,
        email: (token.email as string) || session.user?.email,
      };

      return session;
    },
  },
});
