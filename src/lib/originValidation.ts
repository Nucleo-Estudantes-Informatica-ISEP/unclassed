type OriginRequest = {
  headers: Pick<Headers, "get">;
  nextUrl: Pick<URL, "origin">;
};

export function validateOrigin(request: OriginRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  const allowedOrigins = new Set(
    [
      env.APP_BASE_URL,
      env.NEXT_PUBLIC_APP_URL,
      request.nextUrl.origin,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ]
      .map(normalizeOrigin)
      .filter((value): value is string => Boolean(value))
  );

  if (origin) {
    return matchesAllowedOrigin(origin, allowedOrigins);
  }

  if (referer) {
    return matchesAllowedOrigin(referer, allowedOrigins);
  }

  return true;
}

function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function matchesAllowedOrigin(
  value: string,
  allowedOrigins: Set<string>
): boolean {
  const normalizedOrigin = normalizeOrigin(value);
  return Boolean(normalizedOrigin && allowedOrigins.has(normalizedOrigin));
}
import { env } from "@/lib/env";
