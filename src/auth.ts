import NextAuth from "next-auth";
import Zitadel from "next-auth/providers/zitadel";

import { syncLocalUserFromOidc } from "@/lib/local-user";

function getClaim(
  claims: Record<string, unknown> | undefined,
  key: string
): string | null {
  const value = claims?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

const providers =
  process.env.AUTH_ISSUER_URL && process.env.AUTH_CLIENT_ID
    ? [
        Zitadel({
          issuer: process.env.AUTH_ISSUER_URL,
          clientId: process.env.AUTH_CLIENT_ID,
          clientSecret: process.env.AUTH_CLIENT_SECRET,
          authorization: {
            params: {
              scope: process.env.AUTH_SCOPES || "openid email profile",
            },
          },
        }),
      ]
    : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.idToken = account.id_token;
      }

      if (!account || !profile) {
        return token;
      }

      const claims = profile as Record<string, unknown>;
      const sub =
        getClaim(claims, "sub") ||
        account.providerAccountId ||
        token.sub ||
        null;

      if (!sub) {
        throw new Error("OIDC login did not include a subject claim.");
      }

      const localUser = await syncLocalUserFromOidc({
        sub,
        email: getClaim(claims, "email") || token.email,
        name: getClaim(claims, "name") || token.name,
        emailVerified:
          typeof claims.email_verified === "boolean"
            ? claims.email_verified
            : false,
      });

      token.localUserId = localUser.id;
      token.role = localUser.role;
      token.zitadelSub = sub;
      token.name = localUser.name;
      token.email = localUser.email;

      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.localUserId as string,
        role: token.role as "USER" | "ADMIN",
        zitadelSub: token.zitadelSub as string,
        name: (token.name as string) || session.user?.name,
        email: (token.email as string) || session.user?.email,
      };
      session.idToken = token.idToken as string | undefined;

      return session;
    },
  },
});
