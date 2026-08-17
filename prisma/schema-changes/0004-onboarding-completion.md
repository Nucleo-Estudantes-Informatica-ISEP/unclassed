# Schema version 4 — onboarding completion

- Normalized schema SHA-256: `6f77d3ca2b7534ef5edcec36461656ca27ba752f2de30e52c4acadacc79c60a5`
- Change: add optional `User.onboardingCompletedAt` to record completion of a user's first swap request.
- Data migration: none; existing MongoDB documents remain valid without the optional field.
- Deployment: back up MongoDB, run `pnpm schema:audit`, then run `pnpm schema:deploy` against staging before production.
- Rollback: roll back the application first. Existing field values may remain because older application versions ignore them.
