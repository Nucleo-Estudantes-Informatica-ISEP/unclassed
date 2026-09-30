import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { test } from "vitest";

import { getLogContext } from "./logger";
import { withRequestLogContext } from "./requestLogContext";

test("request context carries proxy ID through async work", async () => {
  const id = "a3761e30-5f12-41aa-aea3-773c345abdcd";
  const request = new NextRequest("http://localhost/api/health", {
    headers: { "x-request-id": id },
  });
  const observed = await withRequestLogContext(request, async () => {
    await Promise.resolve();
    return getLogContext().requestId;
  });
  assert.equal(observed, id);
  assert.equal(getLogContext().requestId, undefined);
});

test("untrusted request ID is replaced", () => {
  const request = new NextRequest("http://localhost/api/health", {
    headers: { "x-request-id": "user@example.com" },
  });
  const id = withRequestLogContext(request, () => getLogContext().requestId);
  assert.match(id || "", /^[a-f0-9-]{36}$/);
});
