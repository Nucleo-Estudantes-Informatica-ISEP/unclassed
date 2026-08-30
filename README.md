# Unclassed

Unclassed is a class-swap platform for ISEP Informatics students. It lets students request either a swap for a single subject or a full class bundle swap, then uses an automated matching engine to discover direct, three-way, and larger exchange cycles.

The application is built as a Next.js App Router project with Prisma, MongoDB, NextAuth, and AuthNEI-based authentication. AuthNEI is currently implemented on top of ZITADEL. The user-facing interface is primarily in Portuguese and is tailored to the NEI-ISEP / ISEP context.

## Key Features

- Guided request wizard with branch-specific single-subject and full-bundle flows
- Ordered class preferences for both request types
- Automated graph-based matching with direct, three-way, and multi-way swap patterns
- Provisional matches that can later be upgraded into better outcomes
- Admin dashboard for monitoring matching, cron runs, and partition health
- Email notifications for match delivery
- Centralized authentication through AuthNEI
- Docker-ready deployment with health checks and standalone Next.js output

## Tech Stack

- Language: TypeScript
- Framework: Next.js 16 (App Router)
- Runtime: Node.js 20.9+
- UI: React 19, Tailwind CSS 4, Radix UI, Sonner
- Auth: NextAuth 5 beta with AuthNEI (currently backed by ZITADEL)
- Database: MongoDB via Prisma
- Data validation: Zod, React Hook Form
- Charts / admin UX: Recharts, TanStack Table, Cytoscape
- Email: Nodemailer
- Deployment: Docker, Docker Compose

## What the System Does

The core product flow is:

1. A student authenticates with the NEI centralized identity provider.
2. On first login, the app creates or links a local user record.
3. The student creates either:
   - a `SingleSwapRequest` for one subject, or
   - a `BundleSwapRequest` for a full class move.
4. Requests are partitioned into matching graphs:
   - single swaps by subject
   - bundle swaps by academic year
5. The matching engine searches for valid swap cycles and stores them as `Match` records.
6. Participants can accept or reject proposed matches.
7. The system records cron execution metadata, delivery logs, and partition performance stats for operational visibility.

## Repository Structure

```text
.
├── prisma/
│   ├── schema.prisma        # MongoDB schema and enums
│   ├── seed.ts              # Seeds subjects and classes
│   └── reset.ts
├── public/                  # Static assets
├── src/
│   ├── app/                 # Next.js App Router pages and API routes
│   ├── application/         # Matching orchestration and persistence adapters
│   ├── components/          # Shared UI and dashboard components
│   ├── config/              # App-level configuration
│   ├── context/             # Theme context
│   ├── domain/              # Pure graph structure and matching algorithms
│   ├── hooks/               # Client-side data hooks
│   ├── lib/                 # Auth, Prisma, startup, helpers
│   ├── middleware/          # Request validation helpers
│   ├── schemas/             # Zod schemas
│   ├── services/            # Email, caching, cron, and matching triggers
│   └── types/               # Session and NextAuth types
├── data/
│   └── subjects.json
├── docs/
│   └── domain-model/
├── Dockerfile
├── docker-compose.yaml
├── docker-compose.override.yml
└── deploy.sh
```

## Core Domain Model

The Prisma schema defines the following main entities:

- `User`: local application user, role, notification preferences, phone-sharing preference
- `UserIdentity`: external identity mapping between AuthNEI and the local user
- `Subject`: subject catalog such as `APROG`, `ESOFT`, etc.
- `Class`: class groups such as `1DA`, `2DB`, `3DL`
- `SingleSwapRequest`: one subject, one current class, multiple preferred target classes
- `BundleSwapRequest`: full class move within the same year
- `Match`: proposed or accepted swap between one or more participants
- `GraphPartition`: operational partition metadata for the matcher
- `CronExecution` and `CronLock`: scheduler telemetry and locking
- `MatchNotificationDelivery`: audit trail for sent notifications

Important enums:

- `TicketType`: `SPECIFIC_CLASS` or `ALL_CLASSES`
- `SwapPattern`: `DIRECT`, `THREE_WAY`, `MULTI_WAY`
- `MatchStatus`: `PROPOSED`, `ACCEPTED`, `REJECTED`, `COMPLETED`, `PROVISIONAL`, `UPGRADED`
- `Role`: `USER`, `ADMIN`

## Prerequisites

Before running the project locally, make sure you have:

- Node.js `>=20.9.0`
- `pnpm` enabled via Corepack, or npm if you prefer
- A MongoDB database
- AuthNEI / OIDC credentials for authentication
- SMTP credentials if you want email notifications to work

Recommended:

- Docker Desktop for containerized runs
- MongoDB Atlas or a local MongoDB instance

## Environment Variables

Copy the example file first:

```bash
cp .env.example .env
```

The main variables are:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Prisma connection string for MongoDB |
| `APP_BASE_URL` | Yes | Server-side canonical app URL |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL used in links and client code |
| `AUTH_ISSUER_URL` | Yes | AuthNEI / OIDC issuer URL |
| `AUTH_CLIENT_ID` | Yes | OIDC client ID |
| `AUTH_CLIENT_SECRET` | Yes | OIDC client secret |
| `AUTH_SCOPES` | Usually | OIDC scopes, default is `openid email profile` |
| `AUTH_SECRET` | Yes | NextAuth secret |
| `AUTH_POST_LOGOUT_REDIRECT_URI` | Yes | Redirect target after sign-out |
| `AUTH_TRUST_HOST` | Depends | Enable only behind a trusted proxy |
| `CRON_SECRET` | Strongly recommended | Bearer secret for cron-triggered endpoints |
| `ENABLE_CRON_SCHEDULER` | Yes | Enables internal in-process cron scheduler |
| `CRON_BATCH_MATCHING` | Optional | Batch matching cron expression |
| `CRON_PROVISIONAL_CLEANUP` | Optional | Cleanup cron expression |
| `CRON_HEALTH_CHECK` | Optional | Health-check cron expression |
| `ADMIN_CACHE_TTL` | Optional | Cache TTL in seconds for admin dashboards |
| `EMAIL_HOST` | Optional | SMTP host |
| `EMAIL_PORT` | Optional | SMTP port |
| `EMAIL_SECURE` | Optional | Whether SMTP uses TLS |
| `EMAIL_USER` | Optional | SMTP username |
| `EMAIL_PASS` | Optional | SMTP password |
| `EMAIL_FROM` | Optional | Sender address |

### Authentication Notes

This project expects centralized authentication through AuthNEI. The current implementation uses ZITADEL underneath. If the required auth variables are missing:

- the `/login` and `/register` pages will show the app as not configured
- production startup will fail unless the app is running during build only

On successful OIDC login, the app syncs or links a local user record automatically.

## Getting Started

### 1. Install Dependencies

This repository includes a `pnpm-lock.yaml`, so `pnpm` is the intended package manager.

```bash
corepack enable
pnpm install
```

### 2. Configure the Environment

```bash
cp .env.example .env
```

Update `.env` with:

- a working MongoDB connection
- valid AuthNEI credentials
- a secure `AUTH_SECRET`
- a secure `CRON_SECRET`

Generate secrets with:

```bash
openssl rand -hex 32
```

Runtime configuration is parsed once through `src/lib/env.ts`. Production
startup fails immediately when required values are missing or malformed;
partial SMTP configuration is rejected instead of failing on first send.

### 3. Generate the Prisma Client

`postinstall` already runs Prisma generation, but you can run it explicitly:

```bash
pnpm generate
```

### 4. Validate and Deploy the Schema to MongoDB

Prisma Migrate does not support MongoDB. This project uses the supported
`db push` path, guarded by a versioned manifest under `prisma/schema-changes/`.
Every schema edit must add the next change record and update
`prisma/schema-manifest.json`.

```bash
pnpm schema:deploy
```

`pnpm schema:validate` checks the Prisma schema and rejects an unversioned
schema edit without touching a database. `pnpm sync` remains only as a compatibility
alias. Before production `pnpm schema:deploy`, take a
MongoDB backup, run `pnpm schema:audit`, and run the deployment against staging.

### 5. Seed Subjects and Classes

The seed script populates the subject and class catalog used by the app.

```bash
pnpm seed
```

Note:

- the included seed currently creates subjects and classes
- sample users and sample swap requests are present in the file but commented out

### 6. Start the Development Server

```bash
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Local Development Workflow

Useful day-to-day commands:

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
pnpm start
```

Prisma-related commands:

```bash
pnpm generate
pnpm schema:validate
pnpm schema:audit
pnpm schema:deploy
pnpm seed
```

Important note about scripts:

- `lint`, `typecheck`, `test`, `build`, `generate`, `schema:validate`, `schema:audit`, `schema:deploy`, and `seed` are present and wired up

## Main Application Routes

User-facing pages:

- `/` - marketing / landing page
- `/login` - centralized sign-in handoff
- `/register` - centralized registration / first-login handoff
- `/dashboard` - main user dashboard
- `/profile` - user profile
- `/matches` - match listing
- `/swap-requests` - request management
- `/privacy-policy`
- `/cookie-policy`

Key API routes:

- `/api/auth/[...nextauth]` - NextAuth handlers
- `/api/auth/configured` - auth readiness check
- `/api/subjects` - subject data
- `/api/classes` - class data
- `/api/swap-requests/single`
- `/api/swap-requests/bundle`
- `/api/matches`
- `/api/matches/[matchId]`
- `/api/matching` - matching stats and batch trigger
- `/api/matches/run-matching` - admin-triggered matching
- `/api/admin/cron` - cron monitoring and controls
- `/api/cron/batch-matching` - scheduled batch matching endpoint
- `/api/init` - application initialization
- `/api/health` - health endpoint

## Matching Engine Overview

Pure graph storage and cycle logic live in [`src/domain`](./src/domain), while [`MatchingOrchestrator`](./src/application/matchingOrchestrator.ts) adapts Prisma and notifications to that core. At a high level, it:

- reads active requests from Prisma
- groups them into graph partitions
- scores compatibility using class preferences, ordering, and timing
- attempts direct matches first
- falls back to larger cycles where possible
- stores matches and updates request state
- handles provisional expiration and upgrade flows

Operational metadata is tracked in:

- `GraphPartition`
- `CronExecution`
- `CronLock`
- `MatchNotificationDelivery`

## Scheduler and Background Jobs

The application supports an internal in-process cron scheduler.

Registered jobs:

- `batch-matching`
- `provisional-cleanup`
- `health-check`

Relevant files:

- `src/lib/startup.ts`
- `src/lib/cronInit.ts`
- `src/services/cronScheduler.ts`
- `src/services/cron/jobRegistry.ts`
- `src/services/cron/jobLock.ts`
- `src/services/cron/jobHandlers.ts`
- `src/services/cron/executionStore.ts`

Behavior:

- the app auto-initializes background services when running in production
- it also auto-initializes when `ENABLE_CRON_SCHEDULER=true`
- the scheduler uses database-backed lock records with lease renewal to prevent overlapping long-running jobs
- scaled Docker deployment assigns internal scheduling only to `app1`; `app2` and `app3` explicitly disable it

### When to Use the Internal Scheduler

Use the internal scheduler when you are self-hosting on a long-lived Node process, for example:

- Docker
- a VM
- a traditional container platform

### When Not to Use the Internal Scheduler

If you deploy on a serverless platform such as Vercel, prefer external scheduling and set:

```env
ENABLE_CRON_SCHEDULER=false
```

In that mode, trigger:

  - `POST /api/cron/batch-matching`

with:

- an `Authorization: Bearer <CRON_SECRET>` header

This recommendation is based on the repo structure and deployment files: the code supports both internal scheduling and externally triggered cron execution.

## Admin and Operations

Admins have access to an advanced monitoring surface exposed through the dashboard and API.

What the admin tooling covers:

- active request volume
- graph partition health
- execution history for cron jobs
- manual batch matching runs
- scheduler start / stop
- enable / disable per-job scheduling

Main operational endpoints:

- `/api/admin/cron`
- `/api/matching`
- `/api/matches/run-matching`
- `/api/init`
- `/api/health`

## Health Checks

The application exposes a health endpoint:

```text
GET /api/health
```

Base response includes:

- overall status
- timestamp
- initialization status
- database health
- response time

Detailed health data is returned when:

- the caller is an admin session, or
- the request includes a valid cron bearer secret

The Docker image also uses `/api/health` as its container health check.

## Email Notifications

Email delivery is handled through Nodemailer in `src/services/emailService.ts`.

Use SMTP configuration to enable:

- match-found notifications
- app-generated email links

If SMTP is not configured, matching can still work, but email delivery features will not.

## Docker

### Run with Docker Compose

The repository includes:

- `Dockerfile`
- `docker-compose.yaml`
- `.env.example`

Quick start:

```bash
cp .env.example .env
# edit .env with real values
docker compose up --build
```

The Docker image:

- uses Node 20 Alpine
- runs a standalone Next.js build
- exposes port `3000`
- includes Prisma files at runtime
- defines a container health check

### Scaled Self-Hosted Deployment

The repository also contains `deploy.sh`, which:

- generates a multi-instance `docker-compose.override.yml`
- configures Nginx as a reverse proxy
- scales multiple `app` instances while assigning internal scheduler ownership only to `app1`
- wires health checks and proxy headers

If you want to use that flow:

```bash
chmod +x deploy.sh
./deploy.sh
```

Review the script before running it in production, especially:

- `.env`
- Nginx settings
- Docker Compose expectations
- host ports and networking


## Data Seeding

The provided seed file creates:

- ISEP subject catalog entries
- class groups by year

It does not currently create live sample users by default because the sample user section is commented out.

Run:

```bash
pnpm seed
```

## Authentication Architecture

Authentication is handled by NextAuth with an AuthNEI provider. In the current implementation, that provider is backed by ZITADEL.

Key behavior:

- only AuthNEI-authenticated users are expected
- sign-in is blocked if `email_verified` is missing or false
- a local user is created or linked during JWT callback processing
- local session data includes:
  - local user ID
  - role
  - AuthNEI subject ID
  - normalized name and email

Important files:

- `src/auth.ts`
- `src/lib/auth-config.ts`
- `src/lib/local-user.ts`
- `src/lib/zitadel.ts`

## UI and Frontend Notes

The app uses:

- Next.js App Router
- server components for route shells and auth-gated pages
- client components for forms, dashboard interactivity, and admin tools
- Tailwind CSS and Radix primitives for UI composition

The landing page and dashboard are optimized around the student class-swap workflow, and much of the interface copy is written in Portuguese.

## Quality Checks

Before merging changes, run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`pnpm test` runs Vitest over every `*.test.ts`/`*.spec.ts` file. The current suite covers matching characterization, state transitions, authorization/input boundaries, shared rate limits, scheduler locks, schema/version checks, and DTO privacy. Prefer TDD for regressions: reproduce the failure in a focused test, implement the smallest fix, then refactor.

GitHub CI uses a frozen install and requires lint, typecheck, all tests, Prisma/schema validation, the production build, a non-root Docker image build, and Gitleaks before merge. Pull requests target `dev`; production is reached through the reviewed release flow.

## Troubleshooting

### Auth is not configured

Symptoms:

- `/login` or `/register` shows auth is not configured
- production startup throws an auth configuration error

Check:

- `AUTH_ISSUER_URL`
- `AUTH_CLIENT_ID`
- `AUTH_CLIENT_SECRET`
- `AUTH_SECRET`

### Prisma cannot connect

Symptoms:

- health checks return database failure
- `pnpm schema:audit`, `pnpm schema:deploy`, or `pnpm seed` fails

Check:

- `DATABASE_URL`
- MongoDB network access / IP allowlist
- credentials and database name

### Scheduler is not running

Check:

- `ENABLE_CRON_SCHEDULER=true`
- application startup logs
- `/api/health` detailed response
- `/api/admin/cron` as an admin


## Recommended First Steps for New Contributors

1. Install dependencies with `pnpm install`.
2. Configure `.env`.
3. Validate the versioned Prisma schema with `pnpm schema:validate`; deploy it only to an authorized local database with `pnpm schema:deploy`.
4. Seed the subject and class catalog with `pnpm seed`.
5. Start the app with `pnpm dev`.
6. Verify `/api/health`.
7. Log in through the configured AuthNEI environment.

## Production Checklist

- MongoDB is reachable from the runtime environment
- a current MongoDB backup and clean `pnpm schema:audit` exist before `pnpm schema:deploy`
- All auth variables are set
- `AUTH_SECRET` and `CRON_SECRET` are strong random values
- SMTP is configured if email notifications are required
- `ENABLE_CRON_SCHEDULER` matches the deployment model
- Health checks are wired to `/api/health`
- Admin access is available for cron and matching supervision
