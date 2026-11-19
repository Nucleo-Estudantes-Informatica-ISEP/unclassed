import { env } from "@/lib/env";

type OriginRequest = {
  headers: Pick<Headers, "get">;
  nextUrl: Pick<URL, "origin">;
};

export function validateOrigin(request: OriginRequest): boolean {
  const appUrl =
    env.APP_BASE_URL ??
    (env.NODE_ENV === "production" ? undefined : request.nextUrl.origin);
  if (!appUrl) return false;

  const appOrigin = new URL(appUrl).origin;
  const origin = request.headers.get("origin");
  if (origin !== null) return origin === appOrigin;

  const referer = request.headers.get("referer");
  if (!referer) return false;
  try {
    return new URL(referer).origin === appOrigin;
  } catch {
    return false;
  }
}
