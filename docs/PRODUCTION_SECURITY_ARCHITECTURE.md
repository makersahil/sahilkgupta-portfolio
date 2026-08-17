# Production Security Architecture

Phase 9 hardens the existing Express/Prisma platform without replacing its authentication, domain engines, Portfolio Orchestrator, Unified CLI, or Scenario Runtime.

## Request path

```text
TLS reverse proxy
  -> trusted-proxy-aware Express app
  -> request ID + structured redacted log context
  -> host/origin/HTTPS/security-header policy
  -> signed double-submit CSRF for browser mutations
  -> bounded body parsers and PostgreSQL-backed rate limits
  -> existing routes/services/repositories
  -> Prisma + PostgreSQL/Neon
```

Production requires an exact `PUBLIC_ORIGIN`, explicit allowed hosts/origins, HTTPS, a strong JWT secret, and `sslmode=verify-full`. The reverse proxy must overwrite forwarding headers and must not expose the Node listener directly to untrusted traffic.

The browser session remains an HttpOnly cookie backed by `AuthSession`. Protected requests re-read the current persisted user, active state, role, and session. SameSite cookies, exact Origin validation, Fetch Metadata rejection, and signed CSRF tokens are defense-in-depth controls.

Rate-limit identities are HMAC-SHA-256 hashes. Raw IP/email/session selectors are not stored in `RateLimitBucket`. Multi-process instances sharing PostgreSQL therefore share the same counters.

Logs are JSON lines with request IDs. Known credential, cookie, token, session-key, database-URL, private-key, and storage-key fields are redacted. Request bodies and private Lab payloads are not logged.

`/api/live` proves only that the Node process can answer. `/api/ready` and compatibility `/api/health` check PostgreSQL and required managed storage with a bounded timeout. They do not claim historical uptime or an external SLA.

Security controls are application-level. A production deployment should still use provider TLS, firewalling, dependency monitoring, least-privilege database credentials, filesystem permissions, backups, and hosting-level traffic controls.
