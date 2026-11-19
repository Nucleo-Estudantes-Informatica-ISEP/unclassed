# Schema version 6 — AuthNEI sessions

- Normalized schema SHA-256: `55a6c2ce2738b7c21750c9ad8a028c24ec3613664afba9ea14c01896940803e9`
- Change: add `AuthSession` with a TTL index on `expiresAt`.
- Deployment: apply the schema and index before starting the new application revision. Existing cookies lack a session reference and will prompt users to sign in again.
- Rollback: roll back the application first. Encrypted session records expire through the TTL index.
