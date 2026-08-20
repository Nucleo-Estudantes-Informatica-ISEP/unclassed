# Schema version 3 — active request uniqueness

- Prisma schema SHA-256: unchanged (`8799c82d666ebdfb1b3313ed961d22b10b4a271aae5bc10efc293aea754b5241`).
- Change: add versioned MongoDB partial unique indexes for one active single request per `(userId, subjectId)` and one active bundle request per `(userId, currentClassId)`.
- Reason for raw indexes: Prisma 6.19 is the supported MongoDB release and cannot represent partial indexes in the Prisma schema.
- Preflight: take a backup and run `pnpm schema:audit`. It reports duplicate-group counts without printing user or request identifiers.
- Deployment: resolve any reported duplicate groups, then run `pnpm schema:deploy` before the application rollout.
- Rollback: roll back the application first. Do not drop the uniqueness indexes unless the old application demonstrably depends on duplicates.
