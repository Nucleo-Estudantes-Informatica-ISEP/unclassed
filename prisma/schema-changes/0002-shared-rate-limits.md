# Schema version 2 — shared rate-limit buckets

- Normalized schema SHA-256: `8799c82d666ebdfb1b3313ed961d22b10b4a271aae5bc10efc293aea754b5241`
- Change: add `RateLimitBucket` with a unique bucket key and expiry index.
- Data migration: none; the collection starts empty.
- Deployment: back up MongoDB, deploy the schema before application replicas, then verify the `RateLimitBucket.key` unique index and `RateLimitBucket.expiresAt` index.
- Rollback: roll back the application first. The unused collection can remain; removing it is optional and must be separately approved.
