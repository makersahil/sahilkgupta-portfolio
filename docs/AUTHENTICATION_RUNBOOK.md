# Authentication Operations Runbook

This document is the durable operational guide for administrator authentication. It is not phase documentation.

## Architecture

Browser authentication uses the `infra_auth_token` HttpOnly cookie.

```text
login
→ persisted User bcrypt verification
→ persisted AuthSession creation
→ signed JWT containing user id + session id
→ HttpOnly / SameSite=Lax cookie

protected request
→ verify JWT signature/expiry
→ load AuthSession
→ load current User
→ check session revocation/expiry
→ check User.isActive
→ use current persisted User.role
→ requireRole(...)
```

The browser must never persist the authentication token in localStorage.

## Bootstrap or rotate the administrator

Set these values in the local/server environment:

```dotenv
DATABASE_URL=...
JWT_SECRET=...
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
ADMIN_DISPLAY_NAME=Sahil K Gupta
```

Requirements:

- `JWT_SECRET`: at least 32 random characters.
- `ADMIN_PASSWORD`: at least 12 characters.
- The command never prints the password or hash.
- Re-running bootstrap intentionally updates the configured administrator and revokes that user's existing sessions.

Run:

```bash
npm run auth:bootstrap-admin
```

After bootstrap succeeds, runtime login no longer needs `ADMIN_PASSWORD`; authentication uses the stored bcrypt hash. Keep the password available only where you intentionally need future credential rotation.

## Session maintenance

Expired/revoked sessions can be pruned with:

```bash
npm run auth:cleanup-sessions
```

The cleanup command keeps recent session records and removes expired/revoked sessions older than seven days.

## Security regression

```bash
npm run test:auth:static
npm run test:auth
```

The regression suite verifies persisted sessions, current-role authorization, account deactivation, logout revocation, expired-session rejection, ADMIN/SUPER_ADMIN access, EDITOR denial on admin-only routes, no password-hash exposure, cookie behavior, and basic failed-login throttling.

## Recovery

If an administrator is locked out because credentials were intentionally changed or the stored user is missing:

1. Confirm `DATABASE_URL` targets the intended database.
2. Set a new `ADMIN_PASSWORD` and the correct `ADMIN_EMAIL`.
3. Run `npm run auth:bootstrap-admin`.
4. Sign in again. Existing sessions for that administrator will have been revoked.

Do not insert plaintext passwords directly into PostgreSQL and do not add administrator credentials to `prisma/seed.ts`.

## Phase 9 browser-request protections

Production browser mutations require a signed double-submit CSRF token delivered in the host-only `portfolio_csrf` cookie and `X-CSRF-Token` header. The token is HMAC-signed and bound to the current session-cookie value when authenticated. Login rotates the token to the new session binding; logout rotates it back to an anonymous binding. SameSite cookies, exact Origin checks, and Fetch Metadata rejection remain defense in depth rather than substitutes for CSRF validation.

Failed-login and general login-attempt limits are shared through PostgreSQL `RateLimitBucket` rows using HMAC-hashed identities. Raw email/IP values are not stored. Production maintenance should run `npm run maintenance:cleanup` on a schedule.
