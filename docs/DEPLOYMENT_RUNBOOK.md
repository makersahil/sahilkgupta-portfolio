# Deployment Runbook

## Prerequisites

- Phase 8 is merged and exit-verified.
- The Phase 9 migration has been reviewed.
- Production secrets exist only in the hosting environment.
- `DATABASE_URL` is pooled, `DIRECT_URL` is direct, and both use `sslmode=verify-full`.
- `ARTIFACT_STORAGE_DIR` is absolute, writable by the application user, private, and outside the public document root.
- The proxy terminates TLS, overwrites forwarding headers, forwards the original Host, and is the only network path to Node.

## Build and database

```bash
npm ci
npx prisma validate
npx prisma generate
npm run lint
npm run build
npx prisma migrate status
npx prisma migrate deploy
npm run db:seed
npm run db:check
npm run verify
```

Do not use `prisma migrate reset`, `db push`, or `migrate dev` against production.

## Process configuration

Run the exact build output:

```bash
node dist/server.cjs
```

Configure `NODE_ENV=production`, the exact public origin/hosts, trusted proxy count, HTTPS/security/CSRF/rate-limit enforcement, request limits, timeout values, and managed storage path. The hosting panel must not point to obsolete `dist/server.js`.

## Rollout

1. Take a database and artifact backup.
2. Deploy code and install locked dependencies.
3. Apply migrations once.
4. Restart the Node application gracefully.
5. Check `/api/live`, then `/api/ready`.
6. Run `npm run deployment:smoke -- https://sahilkgupta.com`.
7. Verify security headers, public content, Admin login/logout, Orchestrator preview, one CLI read, one isolated scenario, and a private managed-artifact upload/download/integrity check.
8. Monitor structured logs by request ID.

Rollback code only to a version compatible with the already-applied additive schema. Never roll back by deleting migration history. Restore data only through the tested restore procedure.
