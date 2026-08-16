import assert from "node:assert/strict";
import { test } from "node:test";

import { validateOrigin } from "./originValidation";

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
