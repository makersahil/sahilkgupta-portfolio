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

## Phase 9 operational persistence

`RateLimitBucket` is the only Phase 9 schema addition. It provides shared fixed-window counters for horizontally scaled Node processes; raw identities are HMAC-hashed before persistence and expired rows are maintenance data.

The existing `Artifact` model now also supports `LOCAL_MANAGED`. For those rows, `storageKey` is a private content-addressed relative key and `sha256` is calculated from actual bytes. The byte directory is not PostgreSQL and must be backed up/restored together with Artifact metadata. External and S3 reference rows remain metadata only.
