import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { test, vi } from "vitest";

import { hasValidCronSecret } from "./apiAccess";
import { isDevOnlyRequestAllowed } from "./devOnly";
import { env } from "./env";
import { validateOrigin } from "./originValidation";

vi.mock("@/services/getServerSession", () => ({ default: vi.fn() }));
vi.mock("@/services/rateLimit", () => ({
  checkRateLimit: vi.fn(),
  resolveRateLimitIdentifier: vi.fn(),
}));
vi.mock("./env", () => ({ env: {} }));

test("cron bearer requires a configured secret and an exact header", () => {
  const secret = "synthetic-cron-secret-for-testing";
  const request = (authorization?: string) =>
    new NextRequest("http://localhost/api/matching", {
      headers: authorization ? { authorization } : {},
    });

  const valid = request(`Bearer ${secret}`);
  assert.equal(hasValidCronSecret(valid), false);
  env.CRON_SECRET = secret;
  try {
    assert.equal(hasValidCronSecret(valid), true);
    assert.equal(hasValidCronSecret(request()), false);
    assert.equal(hasValidCronSecret(request(`Basic ${secret}`)), false);
    assert.equal(hasValidCronSecret(request(`Bearer ${secret}-extra`)), false);
    assert.equal(
      hasValidCronSecret(request(`Bearer ${secret.slice(1)}`)),
      false
    );
    assert.equal(
      hasValidCronSecret(request(`Bearer X${secret.slice(1)}`)),
      false
    );
  } finally {
    env.CRON_SECRET = undefined;
  }
});

function requestWith(headers: Record<string, string>) {
  return {
    headers: new Headers(headers),
    nextUrl: new URL("http://localhost:3000/api/swap-requests/single"),
  };
}

test("validateOrigin accepts a matching Origin header", () => {
  assert.equal(
    validateOrigin(requestWith({ origin: "http://localhost:3000" })),
    true
  );
});

test("validateOrigin rejects a cross-origin Origin header", () => {
  assert.equal(
    validateOrigin(requestWith({ origin: "https://evil.example" })),
    false
  );
});

test("validateOrigin falls back to a matching Referer header", () => {
  assert.equal(
    validateOrigin(
      requestWith({ referer: "http://localhost:3000/swap-requests" })
    ),
    true
  );
});

test("validateOrigin rejects a cross-origin Referer header", () => {
  assert.equal(
    validateOrigin(
      requestWith({ referer: "https://evil.example/swap-requests" })
    ),
    false
  );
});

test("validateOrigin allows requests with neither Origin nor Referer", () => {
  // Same-origin same-site requests (e.g. same-tab navigations) don't always
  // send Origin/Referer; enforceSameOriginForSessionWrites relies on this
  // staying permissive rather than failing closed on missing headers.
  assert.equal(validateOrigin(requestWith({})), true);
});

test("dev-only authorization is allowed only in development", () => {
  assert.equal(isDevOnlyRequestAllowed(true, "development"), true);
  assert.equal(isDevOnlyRequestAllowed(true, "test"), false);
  assert.equal(isDevOnlyRequestAllowed(true, "production"), false);
  assert.equal(isDevOnlyRequestAllowed(false, "production"), true);
});
