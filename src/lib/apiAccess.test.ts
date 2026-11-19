import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";

import { isDevOnlyRequestAllowed } from "./devOnly";
import { env } from "./env";
import { validateOrigin } from "./originValidation";

vi.mock("./env", () => ({ env: { NODE_ENV: "test" } }));

afterEach(() => {
  env.NODE_ENV = "test";
  env.APP_BASE_URL = undefined;
  env.NEXT_PUBLIC_APP_URL = undefined;
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

test("validateOrigin requires Origin or Referer for session writes", () => {
  assert.equal(validateOrigin(requestWith({})), false);
});

test("validateOrigin uses the configured app origin in production", () => {
  env.NODE_ENV = "production";
  env.APP_BASE_URL = "https://app.example.test/";
  env.NEXT_PUBLIC_APP_URL = "https://other.example.test";
  assert.equal(
    validateOrigin(requestWith({ origin: "https://app.example.test" })),
    true
  );
  for (const origin of [
    "http://localhost:3000",
    "https://other.example.test",
    "https://app.example.test/path",
    "null",
  ]) {
    assert.equal(
      validateOrigin(
        requestWith({ origin, referer: "https://app.example.test/page" })
      ),
      false
    );
  }
});

test("dev-only authorization is allowed only in development", () => {
  assert.equal(isDevOnlyRequestAllowed(true, "development"), true);
  assert.equal(isDevOnlyRequestAllowed(true, "test"), false);
  assert.equal(isDevOnlyRequestAllowed(true, "production"), false);
  assert.equal(isDevOnlyRequestAllowed(false, "production"), true);
});
