# Schema version 5 — remove legacy local authentication fields

- Normalized schema SHA-256: `db7e04c5af43b760e85412879f66e0fd5b54bb9650f39a840445c29072eeb29e`
- Change: remove legacy `User.password`, `User.verificationToken`, and `User.verificationTokenExpiry` fields and the `verificationToken` index.
- Data migration: existing MongoDB documents may retain these legacy fields; the application no longer reads or writes them.
- Deployment: back up MongoDB, run `pnpm schema:audit`, then run `pnpm schema:deploy` against staging before production.
- Rollback: roll back the application first. Restoring the removed Prisma fields requires reverting the schema and application changes; legacy field values may still exist in MongoDB documents.
