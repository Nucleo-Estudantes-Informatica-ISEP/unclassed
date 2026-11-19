import { createHash, timingSafeEqual } from "node:crypto";

export function secretsMatch(expected: string, actual: string): boolean {
  // Fixed-size digests keep the comparison independent of input length.
  const a = createHash("sha256").update(expected).digest();
  const b = createHash("sha256").update(actual).digest();
  return timingSafeEqual(a, b);
}
