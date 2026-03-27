import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { buildZitadelLogoutUrl, getPostLogoutRedirectUri } from "@/lib/zitadel";

const authDebugEnabled = process.env.AUTH_DEBUG === "true";

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    });
    const idTokenHint =
      typeof token?.idTokenHint === "string"
        ? token.idTokenHint
        : typeof token?.idToken === "string"
          ? token.idToken
          : null;
    const logoutHint = typeof token?.email === "string" ? token.email : null;

    if (authDebugEnabled) {
      console.info("[auth][logout-url]", {
        hasJwt: Boolean(token),
        hasIdTokenHint: typeof token?.idTokenHint === "string",
        hasIdToken: typeof token?.idToken === "string",
        hasEmail: typeof token?.email === "string",
        hasSub: typeof token?.sub === "string",
        hasZitadelSub: typeof token?.zitadelSub === "string",
      });
    }

    const redirectTo = await buildZitadelLogoutUrl(idTokenHint, logoutHint);

    if (authDebugEnabled) {
      const url = new URL(redirectTo);
      console.info("[auth][logout-url-generated]", {
        origin: url.origin,
        pathname: url.pathname,
        hasClientId: url.searchParams.has("client_id"),
        hasIdTokenHint: url.searchParams.has("id_token_hint"),
        hasLogoutHint: url.searchParams.has("logout_hint"),
        hasPostLogoutRedirectUri: url.searchParams.has(
          "post_logout_redirect_uri"
        ),
        postLogoutRedirectUri: url.searchParams.get(
          "post_logout_redirect_uri"
        ),
      });
    }

    return NextResponse.json({ redirectTo });
  } catch (error) {
    console.error("Failed to build logout URL:", error);
    return NextResponse.json({ redirectTo: getPostLogoutRedirectUri() });
  }
}
