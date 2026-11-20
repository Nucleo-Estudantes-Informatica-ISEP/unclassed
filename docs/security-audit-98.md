# Authorization and credential audit

Reviewed [issue #98](https://github.com/Nucleo-Estudantes-Informatica-ISEP/unclassed/issues/98) against `dev` at `fccbbd86b6368997ca96eb17cf861988baa51f4c`, after the [authorization consolidation](https://github.com/Nucleo-Estudantes-Informatica-ISEP/unclassed/issues/63). The review traced all explicit App Router methods through their guards, repositories, and response boundaries. It also covered authenticated server pages, outbound OIDC requests, email links, and the repository’s deployment and logging configuration.

## Route authorization

Twenty-five explicit handlers reach [`authorizeRequest`](../src/lib/apiAccess.ts) through [`defineHandler`](../src/lib/defineHandler.ts). The wrapper enables origin checks for every session-authenticated write. The shared guard checks the development boundary, accepts machine credentials only on opted-in routes, and resolves the current local user for session access. Resource-specific checks run in handlers or application services.

| Route | Methods | Reviewed policy |
| --- | --- | --- |
| `/api/admin/cron` | `GET`, `POST` | Admin session for status and scheduler controls. Both methods rate-limit. |
| `/api/classes` | `GET` | Session. Returns reference data. |
| `/api/dashboard/stats` | `GET` | Session with stats rate limit. Identifier filtering is tracked in [#271](https://github.com/Nucleo-Estudantes-Informatica-ISEP/unclassed/issues/271). |
| `/api/health` | `GET` | Public basic status. Admin session or cron bearer for details, with no-store headers. |
| `/api/matches` | `GET` | Session. Participant-scoped results for ordinary users. Admins may list and filter across users. |
| `/api/matches/[matchId]` | `GET`, `PATCH` | Participant or admin for details. Only participants can perform actions. The action service checks match state. |
| `/api/matching` | `GET`, `POST`, `PUT` | Admin session or cron bearer. Separate rate-limit policies for statistics, immediate matching, and batch matching. |
| `/api/subjects` | `GET` | Session. Returns reference data. |
| `/api/swap-requests/bundle` | `GET`, `POST` | Session. Lists are owner-scoped unless admin. Creation uses the session user ID and is rate-limited. |
| `/api/swap-requests/bundle/[id]` | `GET`, `PUT`, `DELETE` | Owner or admin. Writes check the allowed request state. |
| `/api/swap-requests/single` | `GET`, `POST` | Same policy as bundle collection. Both use the shared handlers and service. |
| `/api/swap-requests/single/[id]` | `GET`, `PUT`, `DELETE` | Same policy as bundle detail. Both use the shared ownership checks. |
| `/api/test-matches` | `POST` | Development-only route and runtime guard, plus an admin session and origin check. |
| `/api/user/preferences` | `GET`, `PATCH` | Session. Reads and writes use the session user ID. PATCH accepts only local preferences. |

The eight explicit methods below use public or protocol-specific handling. Next.js supplies `HEAD` from `GET` where applicable and generates `OPTIONS` when none is declared.

| Route | Methods | Reviewed policy |
| --- | --- | --- |
| `/api/auth/[...nextauth]` | `GET`, `POST` | Auth.js owns OIDC callbacks, session cookies, and sign-out CSRF checks. |
| `/api/auth/configured` | `GET` | Public. Returns a configuration boolean. |
| `/api/auth/profile-url` | `GET` | Public. Redirect target comes from the configured issuer. |
| `/api/auth/test-session` | `POST`, `DELETE` | Test-only header secret, rejected in production. Test database scoping is tracked in [#272](https://github.com/Nucleo-Estudantes-Informatica-ISEP/unclassed/issues/272). |
| `/api/logout-url` | `GET` | Public redirect helper. Personalized logout hints require a decoded session cookie. |
| `/api/logout/callback` | `GET` | Public. A supplied target must match the configured issuer origin, with a configured fallback. |

The dashboard, matches, profile, requests, statistics, and swap-request pages resolve a server session. The dashboard gates admin content separately, the matches page filters by participant, and the profile lookup uses the local session ID. One contact-sharing finding has a private draft advisory with maintainers.

## Credential lifecycles

- **Cron bearer.** CI supplies fixture values and Compose injects the deployment secret at runtime. Matching is the machine write surface and health is the machine diagnostics surface. Checks use only the `Authorization` header. Response actor fields and rate-limit keys use a fixed cron identity. The audit change uses a timing-safe comparison on fixed-size digests and preserves exact header matching. Proxy header logging and actual secret entropy require deployment access to verify.
- **AuthNEI identity.** Auth.js handles the provider callback. The app requires `email_verified`, ties the subject to a local user, and uses unique identity records. First sign-in can link a legacy local account by verified email. This relies on AuthNEI’s ownership and reassignment policy. Admin status comes from the configured AuthNEI claim. Failed provider refresh and missing local users fail the server session check.
- **Session cookie.** Auth.js stores provider credentials in an encrypted JWT cookie keyed by `AUTH_SECRET`. The pinned implementation defaults to HttpOnly and SameSite=Lax with Secure on HTTPS. The public session response includes identity and role fields. Access and refresh credentials stay server-side during ordinary requests. The audit change routes Auth.js errors through structured logging that keeps the Auth.js error classification while omitting the message, cause, and stack. Next.js configures a default `no-store, max-age=0` header for `/api/:path*`. The health and matches routes explicitly set `no-cache, no-store, must-revalidate` on their successful responses. Proxy and session refresh verification are tracked in [#270](https://github.com/Nucleo-Estudantes-Informatica-ISEP/unclassed/issues/270) and [#273](https://github.com/Nucleo-Estudantes-Informatica-ISEP/unclassed/issues/273). [Auth.js session strategies](https://authjs.dev/concepts/session-strategies)
- **Logout.** The application builds an OIDC logout destination using configured issuer discovery and a registered return URL. This is the browser flow where provider logout hints can reach a URL. Reviewing hint exposure, navigation and logs with the deployment is tracked in [#269](https://github.com/Nucleo-Estudantes-Informatica-ISEP/unclassed/issues/269). [OIDC RP-Initiated Logout](https://openid.net/specs/openid-connect-rpinitiated-1_0.html)

## Identifiers and untrusted input

- Match, swap request, user, class, and subject IDs are MongoDB ObjectIds. The format has a timestamp, per-process random component, and counter. Treat these as references. Match and request lookups use participant or owner authorization, and preferences use the session user ID. Test-session cleanup separately requires the fixture secret. Statistics includes identifiers that the chart does not need and has [a dedicated follow-up](https://github.com/Nucleo-Estudantes-Informatica-ISEP/unclassed/issues/271). [MongoDB ObjectId specification](https://github.com/mongodb/specifications/blob/master/source/bson-objectid/objectid.md)
- Matching and notification links lead to signed-in application pages. Email and provider subject are identity attributes, and neither grants application access. The logout `state` is generated with `crypto.randomUUID()`. Auth.js owns sign-in state and PKCE. Request correlation IDs carry no privilege.
- The application’s OIDC fetch destinations come from the configured issuer or its discovery metadata. The callback redirect is origin-checked. The reviewed routes use typed Prisma operations and validate mutation inputs or constrain them to explicit fields. No raw query or user-controlled server fetch destination was found in the reviewed paths. [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- The production dependency scan reported `deepmerge-ts` via Prisma configuration. The audit found no application route feeding that merge. Updating the dependency is tracked in [#274](https://github.com/Nucleo-Estudantes-Informatica-ISEP/unclassed/issues/274). [Upstream advisory](https://github.com/advisories/GHSA-ggr8-5vv4-36mx)

## Verification

- Both the checked-in Nginx configuration and the configuration generated by `deploy.sh` log the request method, path, protocol, and status without query strings or Referer. Loopback requests through each configuration confirmed that synthetic sign-in and logout query markers stayed out of the access log. Nginx error logs can still include the full request line on upstream or handler errors, potentially recording OIDC callback `code` and `state` values. Deployed ingress and error-log behavior remain tracked in [#269](https://github.com/Nucleo-Estudantes-Informatica-ISEP/unclassed/issues/269).
- AuthNEI email reassignment policy and legacy account ownership are tracked in [#276](https://github.com/Nucleo-Estudantes-Informatica-ISEP/unclassed/issues/276).

- On macOS with Node 26 and pnpm 9, lint, typecheck, Prisma schema validation, and the production build passed. The unit suite passed 324 tests. The MongoDB 7 integration suite passed 42 tests and reported two existing TODOs.
- Real requests to a loopback development server backed by an isolated MongoDB replica set verified basic and cron-authenticated health responses, rejection of cron credentials on admin controls, and test cookie issuance and cleanup. The session response contained the fixture identity and omitted provider tokens. An unsupported Auth.js action returned a generic HTTP 400 and the server logged the error type and request ID.
- Hosted AuthNEI, production proxy and log configuration, SMTP, and deployed cookie behavior remain outside the verified environment. The test session used a local HTTP cookie.
