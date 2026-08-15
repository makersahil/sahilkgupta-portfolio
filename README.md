# Sahil K Gupta — Systems & Infrastructure Portfolio

Interactive infrastructure proof-of-work portfolio with three operator workspaces:

- Networking — topology, routing, Packet Tracer-oriented investigation, and network operations
- Linux — RHEL administration, storage, systemd, SELinux, and systems troubleshooting
- DevOps — Terraform, Kubernetes, GitOps, Cilium/eBPF, delivery pipelines, and runtime operations

The dark cyber-terminal/control-plane visual language is intentional. Representative simulations must never be presented as measured production evidence.

## Current architecture

Phase 2 is complete and exit-verified. Phase 3 — Dynamic Networking Engine is complete and exit-verified, including the reusable Core Networking Engine and the recorded-state Networking Investigation and Operations layer.

```text
Browser / React
  ├─ public content → Express routes → content services → Prisma repositories → PostgreSQL
  ├─ labs → /api/labs/* → LabService / LabManifestService → PrismaLabRepository → PostgreSQL
  ├─ auth → /api/auth/* → AuthService → PrismaAuthRepository → User + AuthSession
  ├─ admin → authenticated content/lab APIs → PostgreSQL + persisted AuditLog
  ├─ media references → MediaService → PrismaArtifactRepository → Artifact
  └─ architecture metrics → SystemMetricsService → PrismaSystemRepository → PostgreSQL counts
```

There is no runtime `MockDatabaseService` fallback. Database outages fail closed instead of silently switching to memory.

The canonical relationship model is:

```text
Domain
  → Project
    → 0..N Labs
      → 0..N LabInputs
      → normalized state
      → nodes / links
      → scenarios
      → runbook
      → evidence
      → artifact references
```

The Networking workspace is driven by persisted canonical Lab data through the Networking Engine and its recorded-state operations layer. Linux and DevOps visualizers remain representative until their domain engines are implemented.

## Repository layout

```text
src/                                  React frontend, context, types, API client
server.ts                             Express/Vite entry point
server/routes/                        HTTP routes
server/services/content/              content application services
server/services/auth/                 persistent authentication service/bootstrap logic
server/services/labs/                 canonical lab validation, input registry, Manifest v1
server/services/admin/                persisted Admin audit service
server/services/media/                persisted artifact-reference service
server/services/system/               truthful runtime metrics service
server/services/networking/           dynamic Networking adapter, engine, and operations services
server/repositories/contracts/        repository contracts
server/repositories/prisma/           PostgreSQL/Prisma repositories
server/middlewares/                   persisted auth, async, and error middleware
server/security/                      login abuse controls
server/scripts/                       durable verification/regression/maintenance scripts
prisma/schema.prisma                  canonical persistence schema
prisma/migrations/                    immutable migrations
prisma/seed.ts                        idempotent public baseline seed; no users
```

## Environment

Copy `.env.example` to `.env`. Never commit `.env` or real credentials.

```dotenv
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://USER:PASSWORD@POOLED_HOST:5432/DATABASE
DIRECT_URL=postgresql://USER:PASSWORD@DIRECT_HOST:5432/DATABASE
JWT_SECRET=replace-with-at-least-32-random-characters
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-with-a-strong-password-at-least-12-characters
ADMIN_DISPLAY_NAME=Sahil K Gupta
```

`DATABASE_URL` is the runtime connection. When available, `DIRECT_URL` is preferred by Prisma CLI commands such as migrate/status/introspection.

`PERSISTENCE_MODE` is no longer required. If an old local `.env` still contains `PERSISTENCE_MODE=prisma`, it is tolerated for migration compatibility; `legacy` is rejected.

## Setup

```bash
npm ci
npm run db:deploy
npm run db:seed
npm run db:check
npm run auth:bootstrap-admin
```

`npm ci` now runs `prisma generate` through the root `postinstall` script, reducing the chance of a missing generated Prisma Client after a clean install.

The normal portfolio seed creates no administrator or other user credentials.

## Verification

Run the complete regression baseline with one command:

```bash
npm run verify
```

For faster development:

```bash
npm run verify:quick
npm run verify:tests
```

The full verifier covers schema generation/validation, typecheck/build, migration status, auth, content, canonical labs, Admin orchestration, restart persistence, media/artifact persistence, architecture metrics, runtime retirement, the Dynamic Networking Engine, and recorded-state Networking operations regressions.

## Media and Packet Tracer truthfulness

`POST /api/media/upload` is retained as a compatibility API name, but it **registers metadata for an already-stored media/artifact reference**. It does not claim to upload bytes to S3/Cloudinary/local disk.

The old synthetic `/api/network/upload-pkt` parser has been retired. Packet Tracer files/references belong in the canonical Lab Builder using the `PACKET_TRACER` input type. Arbitrary `.pkt` binary parsing is not claimed.


## Dynamic Networking Engine

Published Networking Labs are rendered from `Lab`, `LabInput`, `LabNode`, `LabLink`, runbook, evidence, scenarios, and normalized `networking.v1` state. The same engine supports multiple projects and multiple Labs per project. Core inspection includes dynamic topology, device/interface/configuration views, routing/VLAN/ACL snapshots, and deterministic topology reachability. The operations layer adds recorded BGP/OSPF neighbor inspection, first-hop redundancy state, health derivation, IPv4 longest-prefix route lookup, conservative recorded-state forwarding/ACL analysis, a durable `NETOPS/...` context contract, and scenario-ready definitions.

These operations are derived from persisted snapshots, not live device telemetry or a full IOS/ASA emulator. CLI command execution remains Phase 6 and mutable scenario execution/reset remains Phase 7. Packet Tracer remains a truthful reference input; arbitrary `.pkt` binary parsing is not claimed. See `docs/NETWORKING_ENGINE_ARCHITECTURE.md`.

## Git workflow

Git is the source of truth.

- Never work directly on `main`.
- Use a bounded phase branch.
- Preserve the cyber-terminal UI unless the phase explicitly changes it.
- Never invent evidence, metrics, hashes, URLs, credentials, or production state.
- Never edit already-applied migrations casually.
- Run `npm run verify` and inspect `git diff` before committing.
- Read `AGENTS.md` and `docs/DEFERRED_IMPLEMENTATION_REGISTER.md` before every phase.

Phase 2 is complete and Phase 3 — Dynamic Networking Engine is complete and exit-verified. The next target is Phase 4A — Core Dynamic Linux Engine.
