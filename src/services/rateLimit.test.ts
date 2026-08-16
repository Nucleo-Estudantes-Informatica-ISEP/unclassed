import assert from "node:assert/strict";
import test from "node:test";

import {
  MemoryRateLimitStore,
  buildRateLimitBucketKey,
  createRateLimiter,
} from "./rateLimit";

test("enforces each fixed-window policy", async () => {
  const checkRateLimit = createRateLimiter(new MemoryRateLimitStore());
  const now = new Date("2026-08-16T10:00:30.000Z");

  for (let request = 1; request <= 5; request += 1) {
    const result = await checkRateLimit("create", "user-1", now);
    assert.equal(result.allowed, true);
    assert.equal(result.remaining, 5 - request);
  }

  const rejected = await checkRateLimit("create", "user-1", now);
  assert.equal(rejected.allowed, false);
  assert.equal(rejected.retryAfter, 30);
});

test("isolates identifiers and fixed windows without storing raw identities", async () => {
  const firstWindow = new Date("2026-08-16T10:00:30.000Z");
  const secondWindow = new Date("2026-08-16T10:01:00.000Z");

  const firstKey = buildRateLimitBucketKey("create", "user-1", firstWindow);
  const otherUserKey = buildRateLimitBucketKey("create", "user-2", firstWindow);
  const secondKey = buildRateLimitBucketKey("create", "user-1", secondWindow);

  assert.notEqual(firstKey, otherUserKey);
  assert.notEqual(firstKey, secondKey);
  assert.equal(firstKey.includes("user-1"), false);
});
