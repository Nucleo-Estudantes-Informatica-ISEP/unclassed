import assert from "node:assert/strict";
import { test } from "vitest";

import { sanitizeMonitoringEvent } from "./sanitizeMonitoringEvent";

import type { ErrorEvent } from "@sentry/nextjs";

test("monitoring event keeps stack and correlation but strips PII", () => {
  const event = {
    message: "user@example.com token-secret",
    request: {
      url: "/?email=user@example.com",
      headers: { authorization: "Bearer token-secret" },
    },
    user: { email: "user@example.com" },
    extra: { password: "token-secret" },
    breadcrumbs: [{ message: "user@example.com" }],
    tags: {
      requestId: "request-1",
      email: "user@example.com",
      route: "/api/matches/[matchId]",
    },
    exception: {
      values: [
        {
          type: "Error",
          value: "user@example.com",
          stacktrace: {
            frames: [
              {
                filename: "/app/src/route.ts?secret=token-secret",
                lineno: 42,
                vars: { password: "token-secret" },
              },
            ],
          },
        },
      ],
    },
  } as unknown as ErrorEvent;

  const sanitized = sanitizeMonitoringEvent(event);
  assert.equal(sanitized.tags?.requestId, "request-1");
  assert.equal(
    sanitized.exception?.values?.[0]?.stacktrace?.frames?.[0]?.filename,
    "route.ts"
  );
  assert.equal(
    sanitized.exception?.values?.[0]?.stacktrace?.frames?.[0]?.lineno,
    42
  );
  assert.doesNotMatch(
    JSON.stringify(sanitized),
    /user@example.com|token-secret/
  );
});
