import { createHash } from "node:crypto";

export const RATE_LIMIT_POLICIES = {
  matching: { maxRequests: 10, windowMs: 60_000 },
  batch: { maxRequests: 2, windowMs: 60_000 },
  stats: { maxRequests: 30, windowMs: 60_000 },
  create: { maxRequests: 5, windowMs: 60_000 },
} as const;

export type RateLimitPolicy = keyof typeof RATE_LIMIT_POLICIES;

export interface RateLimitStore {
  increment(key: string, expiresAt: Date): Promise<number>;
}

interface MemoryBucket {
  count: number;
  expiresAt: Date;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, MemoryBucket>();

  async increment(key: string, expiresAt: Date): Promise<number> {
    const current = this.buckets.get(key);
    if (!current) {
      this.buckets.set(key, { count: 1, expiresAt });
      return 1;
    }

    current.count += 1;
    return current.count;
  }
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfter: number;
}

export function buildRateLimitBucketKey(
  policy: RateLimitPolicy,
  identifier: string,
  now: Date
): string {
  const { windowMs } = RATE_LIMIT_POLICIES[policy];
  const windowStart = Math.floor(now.getTime() / windowMs) * windowMs;
  const identifierHash = createHash("sha256").update(identifier).digest("hex");

  return `${policy}:${identifierHash}:${windowStart}`;
}

export function createRateLimiter(store: RateLimitStore) {
  return async function checkRateLimit(
    policy: RateLimitPolicy,
    identifier: string,
    now = new Date()
  ): Promise<RateLimitResult> {
    const { maxRequests, windowMs } = RATE_LIMIT_POLICIES[policy];
    const windowStart = Math.floor(now.getTime() / windowMs) * windowMs;
    const expiresAt = new Date(windowStart + windowMs);
    const count = await store.increment(
      buildRateLimitBucketKey(policy, identifier, now),
      expiresAt
    );

    return {
      allowed: count <= maxRequests,
      limit: maxRequests,
      remaining: Math.max(0, maxRequests - count),
      retryAfter: Math.max(
        1,
        Math.ceil((expiresAt.getTime() - now.getTime()) / 1_000)
      ),
    };
  };
}

export const checkRateLimit = createRateLimiter(new MemoryRateLimitStore());
