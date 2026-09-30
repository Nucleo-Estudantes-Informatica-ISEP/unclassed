import assert from "node:assert/strict";
import pino from "pino";
import { test } from "vitest";

import { logger, withLogContext } from "./logger";
import { sanitizeMonitoringLog } from "./sanitizeMonitoringEvent";

import * as Sentry from "@sentry/nextjs";

test("Pino forwards only approved, sanitized logs to GlitchTip SDK", async () => {
  const envelopes: unknown[] = [];
  Sentry.pinoIntegration.trackLogger(logger);
  Sentry.init({
    dsn: "https://public@example.test/1",
    defaultIntegrations: false,
    integrations: [Sentry.pinoIntegration({ autoInstrument: false })],
    beforeSendLog: sanitizeMonitoringLog,
    transport: () => ({
      send: async (envelope: unknown) => {
        envelopes.push(envelope);
        return { statusCode: 200 };
      },
      flush: async () => true,
    }),
  });

  try {
    withLogContext(
      {
        requestId: "123e4567-e89b-42d3-a456-426614174000",
        jobExecutionId: "123e4567-e89b-42d3-a456-426614174001",
      },
      () => {
        logger.error(
          { jobId: "batch-matching", email: "user@example.com" },
          "Job failed"
        );
        logger.info({ token: "secret" }, "User secret event");
      }
    );
    pino({}, { write: () => undefined }).error("Job failed");
    await Sentry.flush(2_000);

    const sent = JSON.stringify(envelopes);
    assert.match(sent, /Job failed/);
    assert.equal((sent.match(/Job failed/g) || []).length, 1);
    assert.match(sent, /123e4567-e89b-42d3-a456-426614174000/);
    assert.match(sent, /123e4567-e89b-42d3-a456-426614174001/);
    assert.doesNotMatch(sent, /user@example.com|secret|User secret event/);
  } finally {
    await Sentry.close(2_000);
  }
});
