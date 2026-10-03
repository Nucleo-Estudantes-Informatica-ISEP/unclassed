# Database

MongoDB schema source: [`prisma/schema.prisma`](../prisma/schema.prisma). See the [domain model diagram](./domain-model/domain-model.md) for all models, stored fields, and declared Prisma relations.

## Schema quirks

- Every model's `id` is a Prisma `String` backed by a MongoDB `ObjectId`. Keep `@db.ObjectId` on fields that reference those values; other identifiers such as `CronLock.jobId` are plain strings.
- Authentication is handled through OIDC; the `User` model no longer stores a local password or verification-token fields.
- `SingleSwapRequest.preferredClassIds`, `BundleSwapRequest.preferredClassIds`, `Match.singleSwapRequestIds`, and `Match.bundleSwapRequestIds` are arrays of ObjectIds, not Prisma relations. `Match.participants` is an array of JSON objects. `MatchNotificationDelivery.matchId` and `userId` are stored IDs without `@relation`; do not infer database-enforced foreign keys from them.
- `GraphPartition.partitionKey` and request/match `graphPartition` fields use `subject-<subjectId>` or `year-<year>` strings. `GraphPartition.subjectId` is optional and is not a declared Prisma relation. `GraphPartition.isLocked` tracks partition processing; `CronLock` leases scheduler jobs by unique `jobId`.
- Active-request uniqueness uses [versioned partial MongoDB indexes](../prisma/mongodb-indexes.mjs): one active single request per `(userId, subjectId)` and one active bundle request per `(userId, currentClassId)`. Prisma 6 cannot express these partial indexes in `schema.prisma`.
- `RateLimitBucket.key` and `CronLock.jobId` are unique. Their `expiresAt` fields are indexed; expiry handling belongs to application logic.

## Changing the schema

Prisma Migrate does not support MongoDB here. Record schema changes in [`prisma/schema-changes/`](../prisma/schema-changes/), update [`prisma/schema-manifest.json`](../prisma/schema-manifest.json), and keep [explicit indexes](../prisma/mongodb-indexes.mjs) in sync. `pnpm schema:validate` checks the schema without changing data. Before deployment to a shared database, follow the backup, `pnpm schema:audit`, and `pnpm schema:deploy` procedure in [`AGENTS.md`](../AGENTS.md#database-and-environment).
