# AGENTS.md

Reference for AI agents and humans working in this repository. `README.md` covers setup; this file covers workflow, stack, layer boundaries, documentation, and operational gotchas.

---

## Contribution workflow

For each task:

1. Create a branch from `dev` named `<type>/<short-kebab-case-description>`, following [Conventional Branch](https://conventionalbranch.org/):
   - `feature/` or `feat/` — new functionality
   - `bugfix/` or `fix/` — bug fixes
   - `hotfix/` — urgent production fixes
   - `release/` — release preparation
   - `docs/` — documentation-only changes
   - `chore/` — tooling, configuration, and other maintenance
2. Commit with [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `build:`, `chore:`, ...):
   - No AI co-author trailer.
   - Subject under 72 characters.
   - Split unrelated changes into separate commits.
3. Push branch and open pull request into `dev`, never `main`.

---

## Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16, App Router, React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4, Radix UI, shadcn-style primitives |
| Database | MongoDB via Prisma 6 (`prisma/schema.prisma`) |
| Auth | NextAuth 5 beta + AuthNEI OIDC through ZITADEL |
| Validation | Zod; React Hook Form in client forms |
| Matching | Custom graph/cycle matcher in `src/services/advancedMatchingService.ts` |
| Background work | In-process cron scheduler with MongoDB-backed locks |
| Email | Nodemailer |
| Package manager | pnpm 9 (`packageManager` in `package.json`) |
| Deploy | Docker standalone build, Docker Compose, Vercel config |

Node.js `>=20.9.0` required. Prefer `pnpm`; `package-lock.json` is legacy and `pnpm-lock.yaml` is canonical.

## Common commands

```bash
pnpm dev        # Next.js development server
pnpm lint       # ESLint
pnpm typecheck  # tsc --noEmit
pnpm build      # production build; see Gotchas
pnpm generate   # Prisma client generation
pnpm sync       # prisma db push to MongoDB
pnpm seed       # seed subjects and classes
pnpm start      # serve production build
```

`populate`, `test-cron`, and `test-cron-system` currently point to missing `scripts/` files. Do not use them as verification until restored.

## Architecture

### Layout

```text
src/
├── app/          # App Router pages, layouts, and API routes
├── components/   # shared/client UI
├── config/       # app configuration
├── context/      # React context providers
├── hooks/        # client hooks
├── lib/          # Prisma singleton, OIDC helpers, startup, generic utilities
│   └── components/ui/ # reusable UI primitives
├── middleware/   # request-auth helpers
├── schemas/      # reusable Zod schemas
├── services/     # matching, cron, mail, session, cache, trigger logic
└── types/        # shared and NextAuth type declarations

prisma/           # MongoDB schema, seed, reset helper
data/             # static subject data
docs/domain-model/ # PlantUML domain diagram
```

### Request and data layers

Routes currently own request orchestration: authenticate, validate input, enforce authorization, call Prisma/services, return `NextResponse`. Preserve auth and ownership checks on every new or edited mutating route.

- Use `src/lib/prisma.ts` for normal application database access. It is the shared Prisma singleton; never create a new `PrismaClient` in a route or ordinary service.
- `CronScheduler` uses the shared Prisma singleton. Scheduler start/stop manages job timers, not the application-owned database connection.
- Prisma and server services belong only in server-side code—never client components or browser hooks.
- Put reusable non-HTTP logic in `src/services/`; do not duplicate it across API routes.
- Put reusable Zod schemas in `src/schemas/`. Legacy inline schemas exist, but do not create a second copy of a rule already defined there.
- Reuse `src/lib/components/ui/` primitives and existing Tailwind patterns before adding UI abstractions.

### Matching domain

- A `SingleSwapRequest` is scoped to a subject/current class; its `graphPartition` is `subject-<subjectId>`.
- A `BundleSwapRequest` moves a student across a year's classes; its partition is year-based.
- `AdvancedMatchingService` finds direct, three-way, and multi-way cycles; it records `Match` documents and manages provisional-match upgrades/expiry.
- Users with blocking accepted matches cannot create new requests. Reuse `hasBlockingAcceptedMatch()`.
- Creating a request calls `triggerImmediateMatching()` asynchronously. Keep matching non-blocking: request creation must not wait for background matching.
- Batch matching, provisional cleanup, and health checks run via `CronScheduler`. Its `CronLock` documents prevent concurrent job execution; do not bypass them.

## Authentication and authorization

Three distinct mechanisms coexist. Do not conflate them:

1. **External identity:** AuthNEI OIDC via ZITADEL in `src/auth.ts`. The provider supplies verified identity claims; `syncLocalUserFromOidc()` creates or links local `User`/`UserIdentity` records.
2. **Application session:** NextAuth JWT session. `getServerSession()` resolves the NextAuth session, then reloads the local database user. Use it for user/admin authorization; `session.id` is the local MongoDB user id and `session.role` is `USER` or `ADMIN`.
3. **Scheduled-machine access:** `CRON_SECRET` bearer authentication, checked through `authorizeRequest()`/ `hasValidCronSecret()`. It is for trusted cron callers, not a user session and not authorization for normal browser routes.

Rules:

- Preserve the ZITADEL `email_verified` gate.
- Local `User.password` exists for compatibility but active sign-in is OIDC. Do not add a parallel password-login flow without an explicit product decision.
- Use `authorizeRequest()` for new routes needing the standard session/admin/cron decision and same-origin checks. `withAuth()` is legacy-compatible middleware; do not introduce a third wrapper.
- For session-authenticated writes, enable same-origin enforcement when the route accepts browser requests.
- Never expose OIDC tokens, `AUTH_SECRET`, `CRON_SECRET`, SMTP credentials, or database URLs to clients or logs.

## API conventions

- Validate request bodies with Zod.
- Check ownership server-side—never trust browser-supplied `userId`.
- Validate referenced MongoDB documents before creating relationships.
- Return explicit response statuses: `400` invalid input, `401` no session, `403` insufficient authority/origin, `404` missing resource, `409` state conflict, `500` unexpected failure.
- Use the established failure shape `{ error: string }` for new routes. Legacy routes vary; do not spread that inconsistency.
- Keep Portuguese wording consistent in user-facing pages and API messages. Code identifiers and comments remain English.
- Use `@/` for `src/` imports. Keep imports formatted by Prettier.
- Avoid `any`; ESLint treats explicit `any` as an error.
- Do not make an internal HTTP request from server code when an existing service can be called directly.

## Documentation standard

Documentation should answer a future contributor's first question without duplicating implementation details.

- Update `README.md` when a user-visible capability, setup prerequisite, environment variable, script, route, deployment requirement, or operational workflow changes.
- Update this `AGENTS.md` when the stack, layer map, contribution/verification workflow, architectural boundary, or persistent gotcha changes.
- Keep documentation adjacent to its audience: public setup and operations in `README.md`; contributor rules and architecture here; domain diagrams in `docs/domain-model/`; code-specific rationale beside the code.
- Document why for non-obvious constraints, especially auth boundaries, lifecycle-managed clients, cron locks, data integrity rules, and security decisions. Do not restate code line-by-line.
- Keep examples runnable and command names synchronized with `package.json`.
- In the same change that alters behavior, update relevant docs. Do not defer known documentation drift to a follow-up.
- Refresh this guide when the matching-engine or auth-layer refactor lands; its layer map and gotchas describe the current implementation, not a planned target architecture.

## Database and environment

The datasource is MongoDB. Prisma migrations are not used; schema changes use `prisma db push` through `pnpm sync`. Update `prisma/schema.prisma`, regenerate Prisma Client, and keep seed data compatible.

Schema and production-data changes are consequential. Do not run `pnpm sync`, `pnpm seed`, or `prisma/reset.ts` against a shared/production database without explicit authorization and a confirmed `DATABASE_URL`. Preserve MongoDB `@db.ObjectId` compatibility with existing data.

Read environment variables server-side only. `.env.example` is source of truth for documented configuration; update it when adding/removing/renaming a variable.

## Verification

Before finishing a change:

1. Run `pnpm lint`.
2. Run `pnpm typecheck`.
3. Run `pnpm build` for configuration, route, or rendering changes. It can pass with type errors because `next.config.mjs` sets `typescript.ignoreBuildErrors: true`; typecheck is mandatory.
4. Exercise changed behavior through `pnpm dev`: interact with UI changes and make a real request for API changes, checking both response body and status.
5. State exactly what could not be exercised (for example, real OIDC, SMTP, cron, or production MongoDB) rather than implying it passed.

No committed automated test suite exists yet. Add a focused regression test for non-trivial pure logic or a regression fix; do not claim `pnpm test` exists.

## Gotchas

- `CronScheduler` uses the shared Prisma client and database locks. Its start/stop lifecycle only manages scheduled jobs.
- `ENABLE_CRON_SCHEDULER=true` starts in-process jobs. Avoid multiple local instances against one database unless testing lock behavior.
- A green `pnpm build` is not proof of type safety: Next ignores build-time TypeScript errors.
- `/api/cron/*` accepts the cron bearer secret; admin screens/routes require an `ADMIN` local session. Keep those boundaries separate.
- `src/app/api/test-matches/route.ts` and `prisma/reset.ts` are development/destructive surfaces. Treat them as unsafe outside an explicit, confirmed local task.
- `scripts/` is ignored by Git. Do not put required product code or tests there unless its ignore rule changes in the same scoped task.
- Docker relies on Next standalone output. Verify deployment-sensitive environment/startup changes with `pnpm build` and, when practical, the Docker path.
