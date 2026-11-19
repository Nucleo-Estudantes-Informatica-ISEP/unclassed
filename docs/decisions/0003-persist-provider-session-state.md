# ADR 0003 — Persist provider session state in MongoDB

ZITADEL rotates refresh tokens when used. Next.js server components can resolve Auth.js sessions without writing a replacement cookie. Concurrent requests across instances also need one result for each refresh grant.

Keep a stable session reference in the Auth.js JWT and store provider refresh state in `AuthSession`. Encrypt the refresh token with `AUTH_SECRET` and bind the ciphertext to its session ID. At provider token expiry, a single request claims the refresh through an atomic update. Other instances read the updated roles and expiration from MongoDB. An interrupted exchange requires a new sign-in because the provider may have consumed the grant.

Local sign-out removes the database session before attempting provider revocation. Authorization also rejects expired sessions before MongoDB's TTL cleanup. The release requires a new sign-in for older cookies and a schema deployment before app startup.
