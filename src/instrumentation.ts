import type { Instrumentation } from "next";

import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  if (process.env.SENTRY_DSN) await import("./sentry.server.config");

  const { initializeApplication } = await import("@/lib/startup");
  initializeApplication();
}

export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context
) => {
  if (!process.env.SENTRY_DSN) return;

  const header = request.headers["x-request-id"];
  const requestId = Array.isArray(header) ? header[0] : header;

  Sentry.withScope((scope) => {
    if (requestId && /^[a-f0-9-]{36}$/i.test(requestId)) {
      scope.setTag("requestId", requestId);
    }
    scope.setTag("route", context.routePath);
    scope.setTag("httpMethod", request.method);
    Sentry.captureRequestError(
      error,
      { path: context.routePath, method: request.method, headers: {} },
      context
    );
  });
};
