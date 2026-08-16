# Schema version 1 — baseline

- Base commit: `e0e7058`
- Normalized schema SHA-256: `4d357a91a55dd81f92f8537498f500529383967ede147daab7213476635a1d5f`
- Data migration: none; this records the pre-stabilization MongoDB schema.
- Deployment: validate a current backup, then run `pnpm schema:deploy` against staging before production.
- Rollback: restore the previous application image. MongoDB documents remain compatible because this baseline changes no stored data.

Prisma Migrate does not support MongoDB. These records make each `db push` schema state reviewable and ordered; they do not claim SQL-style rollback semantics.
