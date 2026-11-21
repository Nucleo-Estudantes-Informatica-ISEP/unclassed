import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const reopeningSchema = z.iso.datetime({ offset: true });
let warnedAboutInvalidReopening = false;

const reopeningDate = new Intl.DateTimeFormat("pt-PT", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "Europe/Lisbon",
});

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPage = pathname !== "/api" && !pathname.startsWith("/api/");
  const configuredReopening =
    isPage && process.env.SEASONAL_CLOSURE_UNTIL?.trim();
  const parsed = configuredReopening
    ? reopeningSchema.safeParse(configuredReopening)
    : undefined;
  if (parsed && !parsed.success && !warnedAboutInvalidReopening) {
    warnedAboutInvalidReopening = true;
    console.warn("Invalid SEASONAL_CLOSURE_UNTIL; public pages remain open");
  }
  if (parsed?.success && Date.parse(parsed.data) > Date.now()) {
    const reopening = new Date(parsed.data);
    return new NextResponse(
      request.method === "HEAD"
        ? null
        : `<!DOCTYPE html>
<html lang="pt-PT">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Unclassed temporariamente encerrado</title>
  <style>
    :root { color-scheme: light dark; font: 1rem/1.6 system-ui, sans-serif; }
    body { margin: 0; min-height: 100svh; display: grid; place-items: center; }
    main { max-width: 36rem; margin: 1.5rem; padding: clamp(1.25rem, 5vw, 3rem); border: 1px solid GrayText; border-radius: 1rem; }
    h1 { line-height: 1.15; }
  </style>
</head>
<body>
  <main>
    <h1>Unclassed temporariamente encerrado</h1>
    <p>As permutas de turma estão encerradas nesta época.</p>
    <p>Reabertura prevista para <time datetime="${reopening.toISOString()}">${reopeningDate.format(reopening)}</time> (hora de Lisboa).</p>
  </main>
</body>
</html>`,
      {
        status: 503,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "Retry-After": reopening.toUTCString(),
        },
      }
    );
  }

  const requestId = randomUUID();
  const headers = new Headers(request.headers);
  headers.set("x-request-id", requestId);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: ["/api/:path*", "/((?!api(?:/|$)|_next(?:/|$)|.*\\.[^/]+$).*)"],
};
