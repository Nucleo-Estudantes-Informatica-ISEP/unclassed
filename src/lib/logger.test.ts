import assert from "node:assert/strict";
import { test } from "vitest";

import {
  getLogContext,
  logger,
  safeError,
  withJobExecution,
  withLogContext,
} from "./logger";

test("request and job context is inherited and isolated", async () => {
  const first = await withLogContext({ requestId: "request-a" }, () =>
    withJobExecution(async () => ({ ...getLogContext() }))
  );
  const second = withLogContext({ requestId: "request-b" }, () =>
    getLogContext()
  );

  assert.equal(first.requestId, "request-a");
  assert.match(first.jobExecutionId || "", /^[a-f0-9-]{36}$/);
  assert.deepEqual(second, { requestId: "request-b" });
  assert.deepEqual(getLogContext(), {});
});

test("error metadata excludes message and stack", () => {
  const error = new Error("user@example.com secret");
  assert.deepEqual(safeError(error), { errorType: "Error" });
});

test("logging fields do not leak into later context", () => {
  withLogContext({ requestId: "request-a" }, () => {
    logger.info({ jobId: "batch-matching" }, "Running job");
    assert.deepEqual(getLogContext(), { requestId: "request-a" });
  });
});
