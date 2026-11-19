# AuthNEI and proxy verification

Use a staging AuthNEI client, test identities and a dedicated staging database. Register the application's exact callback and post-logout return URLs on that client. Apply the schema change and deploy the candidate revision before running the hosted checks.

## Proxy and log checks

Set `APP_BASE_URL` and Auth.js `AUTH_URL` to the public HTTPS origin. The last proxy must overwrite forwarded host and protocol. Enable `TRUST_PROXY_CLIENT_IP` only if the final proxy also overwrites `X-Real-IP` and application instances accept traffic only through that proxy. The supplied Nginx configs overwrite the forwarding headers. Coolify or other ingress needs its own equivalent configuration. When client-IP trust is disabled, anonymous requests share one rate-limit bucket.

1. Sign in and confirm the HTTPS session cookie is Secure, HttpOnly and SameSite=Lax. Use an ordinary test account for a preference write. Verify that the canonical origin succeeds and missing or different origins return 403.
2. Verify both supplied Nginx configurations and the staging ingress record method, path, and status without query strings or Referer. Use synthetic query markers and confirm those markers are absent from access logs for sign-in callbacks and logout navigation. Check Auth.js stdout and monitoring for the absence of callback payloads. Check ingress error logs separately because the access format does not change them.
3. Sign out locally and confirm protected pages require a session. Check the provider navigation includes only the client ID and registered return URL, then confirm the browser returns to the application.

## Refresh and revocation checks

1. Shorten the staging access-token lifetime if the isolated identity provider supports it. Sign in as an admin test identity, remove its configured admin grant, then wait for the current access token to expire.
2. Send concurrent normal application requests from the signed-in browser. Confirm they observe the same refreshed authorization, the removed admin loses admin access, and the browser remains signed in for ordinary pages. Provider tokens and session references must be absent from the public session response.
3. Revoke the test identity's provider refresh grant and wait for the current access token to expire. Confirm subsequent protected requests require sign-in. Repeat with local sign-out and verify the prior session reference no longer resolves. Do not copy credentials into evidence or logs.

Local tests use a synthetic provider and an isolated MongoDB replica set to cover single-use rotation, concurrent requests, refreshed roles, provider rejection and logout. They cannot establish the hosted client's configuration or the behavior of the deployed proxy.

Local verification passed lint, typecheck, 330 unit tests, schema validation, a production build, 45 MongoDB integration tests, and two Playwright smoke tests. Two pre-existing integration tests are marked TODO. Both Nginx configurations passed live loopback tests for forwarded headers and access-log redaction. Hosted verification remains pending.

## Development fixtures

Run Playwright and the sample match endpoint against a disposable MongoDB replica set with database name `unclassed_e2e`. The test-session endpoint also requires `E2E_TEST_SECRET`. Both fixture routes are excluded from production builds. Cleanup is limited to harness-owned records.
