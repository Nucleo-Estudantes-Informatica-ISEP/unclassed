import assert from "node:assert/strict";
import { test } from "vitest";

import { parseEnvironment } from "./env";

test("fails fast when production runtime configuration is missing", () => {
  assert.throws(
    () => parseEnvironment({ NODE_ENV: "production" }),
    /DATABASE_URL is required in production/
  );
});

test("allows secretless production builds but not malformed SMTP config", () => {
  assert.doesNotThrow(() =>
    parseEnvironment({
      NODE_ENV: "production",
      npm_lifecycle_event: "build",
    })
  );
  assert.throws(
    () => parseEnvironment({ EMAIL_HOST: "smtp.example.com" }),
    /must be set together/
  );
});

test("parses typed booleans, ports, and defaults", () => {
  const parsed = parseEnvironment({
    AUTH_TRUST_HOST: "true",
    ENABLE_CRON_SCHEDULER: "false",
    EMAIL_PORT: "465",
  });

  assert.equal(parsed.AUTH_TRUST_HOST, true);
  assert.equal(parsed.ENABLE_CRON_SCHEDULER, false);
  assert.equal(parsed.EMAIL_PORT, 465);
  assert.equal(parsed.AUTH_SCOPES, "openid email profile");
});

test("rejects weak secrets and non-Mongo database URLs", () => {
  assert.throws(
    () => parseEnvironment({ AUTH_SECRET: "too-short" }),
    /at least 32 characters/
  );
  assert.throws(
    () => parseEnvironment({ DATABASE_URL: "postgresql://localhost/test" }),
    /must be a MongoDB URL/
  );
});
