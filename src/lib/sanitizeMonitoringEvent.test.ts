import assert from "node:assert/strict";
import { test } from "vitest";

import {
  sanitizeMonitoringEvent,
  sanitizeMonitoringLog,
} from "./sanitizeMonitoringEvent";

import type { ErrorEvent, Log } from "@sentry/nextjs";

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

test("monitoring logs keep known operation and correlation, dropping PII", () => {
  const log = {
    level: "error",
    message: "Job failed",
    attributes: {
      requestId: "123e4567-e89b-42d3-a456-426614174000",
      jobExecutionId: "123e4567-e89b-42d3-a456-426614174001",
      jobId: "batch-matching",
      durationMs: 42,
      errorType: "TypeError",
      email: "user@example.com",
      authorization: "Bearer token-secret",
      nested: { password: "token-secret" },
    },
  } satisfies Log;

  const sanitized = sanitizeMonitoringLog(log);
  assert.equal(sanitized?.message, "Job failed");
  assert.deepEqual(sanitized?.attributes, {
    requestId: "123e4567-e89b-42d3-a456-426614174000",
    jobExecutionId: "123e4567-e89b-42d3-a456-426614174001",
    jobId: "batch-matching",
    durationMs: 42,
    errorType: "TypeError",
  });
  assert.doesNotMatch(
    JSON.stringify(sanitized),
    /user@example.com|token-secret/
  );
});

test("monitoring logs reject dynamic messages and invalid metadata", () => {
  assert.equal(
    sanitizeMonitoringLog({
      level: "info",
      message: "Created match for user@example.com",
    }),
    null
  );
  assert.deepEqual(
    sanitizeMonitoringLog({
      level: "info",
      message: "Running job",
      attributes: {
        requestId: "user@example.com",
        jobId: "user@example.com",
        durationMs: -1,
        errorType: "user@example.com",
      },
    })?.attributes,
    {}
  );
});

test("batch matching logs retain non-sensitive counters", () => {
  const sanitized = sanitizeMonitoringLog({
    level: "info",
    message: "Batch matching completed",
    attributes: {
      matchesFound: 3,
      processedPartitions: 5,
      email: "user@example.com",
    },
  });
  assert.deepEqual(sanitized?.attributes, {
    matchesFound: 3,
    processedPartitions: 5,
  });
});
