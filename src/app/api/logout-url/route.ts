import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";

import { env } from "@/lib/env";
import { logger, safeError } from "@/lib/logger";
import { withRequestLogContext } from "@/lib/requestLogContext";
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
      cookie: allCookies
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; "),
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
      (cookie) =>
        cookie.name === cookieName || cookie.name.startsWith(`${cookieName}.`)
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
  return withRequestLogContext(request, async () => {
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
        logger.info("[auth][logout-url]");
      }

      const redirectTo = await buildZitadelLogoutUrl(idTokenHint, logoutHint);

      if (authDebugEnabled) {
        logger.info("[auth][logout-url-generated]");
      }

      return NextResponse.json({ redirectTo });
    } catch (error) {
      logger.error(safeError(error), "Failed to build logout URL:");
      return NextResponse.json({ redirectTo: getPostLogoutRedirectUri() });
    }
  });
}
