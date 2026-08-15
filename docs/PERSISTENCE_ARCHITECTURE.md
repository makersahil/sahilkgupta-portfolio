# Runtime Persistence Architecture

## Current state

PostgreSQL through Prisma is the only supported runtime persistence provider.

```text
Express route
  → application service
  → repository contract
  → Prisma repository
  → PostgreSQL
```

Authentication, content, labs, Admin audit, artifact metadata, and system metrics all use persistent PostgreSQL state.

## Failure behavior

The application does not silently fall back to an in-memory database when PostgreSQL is unavailable. Health reports the database as unavailable and persistence-dependent requests fail through the normal error boundary.

## Retired compatibility paths

The following Phase 2 migration scaffolding is intentionally removed:

- `MockDatabaseService`
- `server/repositories/legacy/*`
- legacy content regression mode
- runtime `legacy|prisma` repository selection
- synthetic Packet Tracer parser attachment path
- fake in-memory architecture telemetry

An old environment variable `PERSISTENCE_MODE=prisma` is tolerated only to ease local migration. `PERSISTENCE_MODE=legacy` is rejected. New environments should omit the variable entirely.

## Artifact/media semantics

`Artifact` is the persistent metadata model. The media compatibility endpoint registers references to already-stored objects; it does not upload file bytes.

Actual managed artifact storage, checksums, provenance workflows, versioning, and storage-provider orchestration remain Phase 8/9 work.
