# Architecture

The application separates request handling, matching decisions, and persistence. See [ADR 0001](./decisions/0001-centralize-request-authorization.md) and [ADR 0002](./decisions/0002-extract-pure-matching-core.md) for why the boundaries exist.

```mermaid
flowchart LR
    Browser[Browser] --> App[Next.js App Router]
    App --> Access[authorizeRequest]
    Access --> Session[NextAuth session and local user]
    OIDC[AuthNEI / ZITADEL] --> Session
    Access --> Application[Application services and MatchingOrchestrator]
    Scheduler[CronScheduler] --> Handlers[CronJobHandlers]
    Handlers --> Application
    Handlers --> Locks[JobLock]
    Application --> Domain[Pure graph and matching algorithms]
    Application --> Repos[Application repositories]
    Application --> Mail[Email service]
    Repos --> Prisma[Shared Prisma client]
    Locks --> Prisma
    Prisma --> Mongo[(MongoDB)]
```

Routes validate input and ownership after access checks. The scheduler manages timers; cron handlers and MongoDB-backed locks coordinate background work. The domain core has no database, framework, or email dependency.
