# Phase 9 Validation Runbook

Phase 9 is not exit-verified until every item below is evidenced against the target environment.

## Automated gate

- [ ] Fresh `npm ci`.
- [ ] Prisma validate/generate/migration status and deploy pass.
- [ ] One uninterrupted `npm run verify` passes from 1/55 through 55/55.
- [ ] No temporary resume verifier is used for final evidence.
- [ ] `git diff --check` and secret/artifact scans pass.

## Browser and HTTP security

- [ ] Production traffic uses HTTPS through the configured trusted proxy.
- [ ] Wrong Host, disallowed Origin, cross-site mutation, missing CSRF, and invalid CSRF are rejected.
- [ ] CSP, HSTS, nosniff, frame denial, referrer, permissions, request ID, and no `X-Powered-By` are present.
- [ ] Login, logout, role changes, and session revocation still work.
- [ ] Public GET/HEAD requests do not require CSRF.
- [ ] Liveness is process-only; readiness reflects PostgreSQL and managed storage failures.
- [ ] Logs correlate by request ID and contain no credentials, cookies, raw private payloads, or storage keys.

## Shared throttling

- [ ] Two Node processes using the same PostgreSQL database observe the same login/contact/scenario/import/upload buckets.
- [ ] Raw rate-limit identity values are absent from PostgreSQL.
- [ ] Expired buckets are pruned by maintenance.

## Managed artifacts

- [ ] Admin uploads valid bytes and the server calculates SHA-256.
- [ ] Files live outside the public/static tree with private permissions.
- [ ] Private download is denied without authentication; public download is cacheable with ETag.
- [ ] Signature mismatch, oversize upload, and tampered bytes fail.
- [ ] Referenced artifacts cannot be deleted; final metadata deletion removes unreferenced managed bytes.
- [ ] External/S3 metadata remains clearly reference-only.

## Regression and operations

- [ ] Public portfolio, all domain engines, Orchestrator, CLI, and Scenario Runtime still work.
- [ ] Performance budgets pass on the production build.
- [ ] Graceful SIGTERM drains and closes HTTP, Vite (development), Prisma, and pg resources.
- [ ] Deployment smoke passes on the real domain.
- [ ] Database + artifact backup is created and verified.
- [ ] Restore into a disposable environment passes migration, health, content, Admin, Lab, CLI, Scenario, Orchestrator, and artifact checks.
