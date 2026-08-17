# Incident Response Runbook

1. Preserve evidence: timestamp, request IDs, affected routes, deployment SHA, database/provider events, and bounded redacted logs.
2. Contain: disable the affected feature, revoke sessions, rotate credentials, restrict ingress, or set the application unavailable rather than silently falling back to mock data.
3. Determine whether managed artifact bytes, private evidence, credentials, or database data were exposed or altered.
4. Rotate database, JWT/CSRF, Admin, hosting, and storage credentials as applicable. Re-bootstrap Admin and revoke old sessions.
5. Validate database migration state and run managed-artifact integrity checks.
6. Restore only from a verified backup into a disposable environment first.
7. Patch on a branch, run the complete verifier and targeted reproduction, review the diff, deploy, and run smoke checks.
8. Document root cause, impact, timeline, corrective action, and new regression coverage without publishing secrets.

Do not delete AuditLog rows, rewrite Git history, or claim availability/integrity until it has been measured and verified.
