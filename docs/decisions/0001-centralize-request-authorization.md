# ADR 0001: Centralize request authorization

Status: Accepted

## Context

The application has three distinct credentials: an AuthNEI/ZITADEL OIDC identity, a NextAuth application session, and a cron bearer secret. Routes also need consistent admin, origin, and rate-limit checks. Scattered route-specific checks risk treating machine access as a user session or omitting a check on a write.

## Decision

Keep OIDC sign-in and verified-email checks in [`src/auth.ts`](../../src/auth.ts). Link the provider subject to a local `User` through `UserIdentity`. Resolve application sessions through [`getServerSession()`](../../src/services/getServerSession.ts), which reloads the local user. Make [`authorizeRequest()`](../../src/lib/apiAccess.ts) the shared route-level decision point for session, admin, cron, development-only, same-origin write, and rate-limit policies. Allow `CRON_SECRET` only on routes that explicitly opt in; session-authenticated writes require same-origin enforcement.

## Consequences

Routes have one policy entry point and use the local user ID for ownership checks. Provider tokens do not directly authorize application routes; the cron secret is accepted only by opted-in routes. New routes must select the right `authorizeRequest()` options and still enforce resource ownership after authorization.
