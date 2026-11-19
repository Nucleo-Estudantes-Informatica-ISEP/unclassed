import assert from "node:assert/strict";
import { test } from "vitest";

import { env } from "@/lib/env";

import {
  MemoryRateLimitStore,
  buildRateLimitBucketKey,
  createRateLimiter,
  resolveRateLimitIdentifier,
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

test("keys authenticated limits by user instead of shared client IP", () => {
  const sharedCampusNetwork = new Headers({ "x-real-ip": "192.0.2.10" });
  const otherNetwork = new Headers({ "x-real-ip": "192.0.2.11" });

  assert.notEqual(
    resolveRateLimitIdentifier({
      sessionId: "student-1",
      headers: sharedCampusNetwork,
    }),
    resolveRateLimitIdentifier({
      sessionId: "student-2",
      headers: sharedCampusNetwork,
    })
  );
  assert.equal(
    resolveRateLimitIdentifier({
      sessionId: "student-1",
      headers: sharedCampusNetwork,
    }),
    resolveRateLimitIdentifier({
      sessionId: "student-1",
      headers: otherNetwork,
    })
  );
  assert.equal(
    resolveRateLimitIdentifier({
      authenticatedBy: "cron",
      headers: sharedCampusNetwork,
    }),
    "machine:cron"
  );
});

test("only accepts one validated address from an explicitly trusted proxy", () => {
  const originalTrust = env.TRUST_PROXY_CLIENT_IP;
  const headers = new Headers({
    "cf-connecting-ip": "192.0.2.2",
    "x-forwarded-for": "192.0.2.3",
    "x-real-ip": "192.0.2.4",
  });

  try {
    env.TRUST_PROXY_CLIENT_IP = false;
    assert.equal(resolveRateLimitIdentifier({ headers }), "ip:unknown");
    env.TRUST_PROXY_CLIENT_IP = true;
    assert.equal(resolveRateLimitIdentifier({ headers }), "ip:192.0.2.4");
    headers.set("x-real-ip", "192.0.2.4, 192.0.2.5");
    assert.equal(resolveRateLimitIdentifier({ headers }), "ip:unknown");
  } finally {
    env.TRUST_PROXY_CLIENT_IP = originalTrust;
  }
});
