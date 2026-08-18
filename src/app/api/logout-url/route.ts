import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";

import { env } from "@/lib/env";
import { buildZitadelLogoutUrl, getPostLogoutRedirectUri } from "@/lib/zitadel";

const authDebugEnabled = env.AUTH_DEBUG;

async function getJwtTokenFromRequest(request: NextRequest) {
  const allCookies = request.cookies.getAll();

  if (!allCookies.length) {
    return null;
  }

  const req = {
    cookies: request.cookies,
    headers: {
      cookie: allCookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; "),
    },
  } as unknown as Parameters<typeof getToken>[0]["req"];

  const sessionCookieVariants = [
    {
      cookieName: "__Secure-authjs.session-token",
      secureCookie: true,
    },
    {
      cookieName: "authjs.session-token",
      secureCookie: false,
    },
    {
      cookieName: "__Secure-next-auth.session-token",
      secureCookie: true,
    },
    {
      cookieName: "next-auth.session-token",
      secureCookie: false,
    },
  ].filter(({ cookieName }) =>
    allCookies.some(
      (cookie) => cookie.name === cookieName || cookie.name.startsWith(`${cookieName}.`)
    )
  );

  for (const variant of sessionCookieVariants) {
    const token = (await getToken({
      req,
      secret: env.AUTH_SECRET,
      cookieName: variant.cookieName,
      secureCookie: variant.secureCookie,
    })) as JWT | null;

    if (token) {
      return token;
    }
  }

  return (await getToken({
    req,
    secret: env.AUTH_SECRET,
  })) as JWT | null;
}

export async function GET(request: NextRequest) {
  try {
    const token = await getJwtTokenFromRequest(request);
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
        cookieNames: request.cookies.getAll().map((cookie) => cookie.name),
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
