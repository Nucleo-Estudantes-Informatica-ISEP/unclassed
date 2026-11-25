import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as rateLimitRepo from "@/application/repositories/rateLimitRepository";
import { PrismaRateLimitStore, createRateLimiter } from "@/services/rateLimit";
import { assertSafeTestDatabaseUrl, clearTestDatabase } from "@tests/helpers/db";

describe("Rate limiting persistence semantics in MongoDB", () => {
  const store = new PrismaRateLimitStore();
  const limiter = createRateLimiter(store);

  beforeEach(async () => {
    assertSafeTestDatabaseUrl();
    await clearTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  it("increments rate limit bucket count in MongoDB across requests", async () => {
    const identifier = "user:test-session-1";
    const now = new Date("2026-09-15T12:00:00Z");

    const res1 = await limiter("matching", identifier, now);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(9); // policy allows 10

    const res2 = await limiter("matching", identifier, now);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(8);

    const buckets = await rateLimitRepo.findMany();
    expect(buckets.length).toBe(1);
    expect(buckets[0].count).toBe(2);
  });

  it("rejects requests after max allowed quota is reached in the window", async () => {
    const identifier = "user:test-session-2";
    const now = new Date("2026-09-15T12:00:00Z");

    // "batch" policy allows 2 requests
    const res1 = await limiter("batch", identifier, now);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(1);

    const res2 = await limiter("batch", identifier, now);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(0);

    const res3 = await limiter("batch", identifier, now);
    expect(res3.allowed).toBe(false);
    expect(res3.remaining).toBe(0);
    expect(res3.retryAfter).toBeGreaterThan(0);
  });

  it("handles concurrent increments to the same bucket without losing counts", async () => {
    const key = "test:concurrent:bucket";
    const expiresAt = new Date(Date.now() + 60_000);

    const increments = 10;
    await Promise.all(
      Array.from({ length: increments }).map(() =>
        store.increment(key, expiresAt)
      )
    );

    const bucket = await rateLimitRepo.findUnique({
      where: { key },
    });
    expect(bucket?.count).toBe(increments);
  });
});
