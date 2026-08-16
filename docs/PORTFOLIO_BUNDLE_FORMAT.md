# Portfolio Bundle Format v1

Phase 8 supports JSON-only Project and Lab portability. No ZIP, executable expression, script, provider credential, or remote-fetch instruction is accepted.

## Schemas

- `portfolio.project-bundle.v1` contains one Project plus Project runbook/evidence/artifact references and zero or more complete Labs.
- `portfolio.lab-bundle.v1` contains one Lab aggregate for import into an existing same-domain Project.

Examples are stored in `docs/schemas/`.

## Security limits

The service enforces a 2 MiB serialized limit, maximum nesting depth, object/array/string/count limits, and recursively rejects `__proto__`, `prototype`, and `constructor`. Unsupported versions are rejected. Any malformed child rolls back the whole transaction.

## Import semantics

- Dry-run is required by the UI before commit.
- `REJECT` is the default slug-conflict mode.
- `RENAME` generates deterministic `-imported`, `-imported-2`, ... suffixes.
- Every imported Project and Lab is DRAFT with revision 1 and no publication timestamp.
- Scenario runtimes, users, sessions, AuditLog rows, credentials, storage keys, and environment values are never imported.
- External URLs are metadata references only and are never fetched.

## Export semantics

Export returns canonical safe fields, child records, and reference-only artifact summaries. It excludes authentication data, scenario runtimes, audit rows, internal storage keys, private server paths, environment values, and raw password/hash data. Artifact bytes are not embedded and unverified hashes are not claimed.
