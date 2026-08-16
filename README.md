# Sahil K Gupta — Systems & Infrastructure Portfolio

Interactive infrastructure proof-of-work portfolio with three operator workspaces:

- Networking — topology, routing, Packet Tracer-oriented investigation, and network operations
- Linux — RHEL administration, storage, systemd, SELinux, and systems troubleshooting
- DevOps — Terraform, Kubernetes, GitOps, Cilium/eBPF, delivery pipelines, and runtime operations

The dark cyber-terminal/control-plane visual language is intentional. Representative simulations must never be presented as measured production evidence.

## Current architecture

Phase 2 through Phase 6 are established platform/domain baselines. The uploaded Phase 7 source provides the session-scoped Scenario Engine. Phase 8 now adds the Portfolio Orchestrator implementation as a closeout candidate. Do not mark Phase 8 complete until the additive migration, canonical 49-step verifier, and `docs/PHASE8_VALIDATION_RUNBOOK.md` pass in the real repository environment.

```text
Browser / React
  ├─ public content → Express routes → content services → Prisma repositories → PostgreSQL
  ├─ labs → /api/labs/* → LabService / LabManifestService → PrismaLabRepository → PostgreSQL
  ├─ auth → /api/auth/* → AuthService → PrismaAuthRepository → User + AuthSession
  ├─ admin → Portfolio Orchestrator → validation/preview/publication → Prisma transactions → PostgreSQL
  ├─ unified CLI → /api/terminal/* → UnifiedCliService → domain engines → recorded/session state
  ├─ scenarios → /api/scenarios/* → ScenarioEngineService → LabScenarioRuntime → session overlay
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

The Networking workspace is driven by persisted canonical Lab data through the Networking Engine and its recorded-state operations layer. The Linux workspace is driven by persisted canonical Linux Lab state through the Core Linux Engine plus a recorded-state investigation/operations layer. The DevOps workspace is driven by persisted `devops.v1` Lab state through the Core Dynamic DevOps Engine plus the Phase 5B recorded-state operations layer.

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
server/services/linux/                dynamic Linux adapter and core host-state engine
server/services/devops/               dynamic DevOps adapter, delivery-state engine, and recorded-state operations
server/services/cli/                  unified context-aware recorded-state + scenario command interpreter
server/services/scenarios/            session-scoped scenario lifecycle and safe state overlays
server/services/orchestrator/          revision-safe validation, preview, lifecycle, bundle and artifact orchestration
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
DATABASE_URL=postgresql://USER:PASSWORD@POOLED_HOST:5432/DATABASE?sslmode=verify-full
DIRECT_URL=postgresql://USER:PASSWORD@DIRECT_HOST:5432/DATABASE?sslmode=verify-full
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

The full Phase 8 verifier contains 49 derived steps and covers schema generation/validation, typecheck/build, migration status, auth, content, canonical labs, Admin audit behavior, persistence, all three dynamic domain engines and operations layers, Unified CLI, Phase 7 scenarios, plus the Phase 8 Orchestrator static/service/HTTP/bundle regressions.

## Media and Packet Tracer truthfulness

`POST /api/media/upload` is retained as a compatibility API name, but it **registers metadata for an already-stored media/artifact reference**. It does not claim to upload bytes to S3/Cloudinary/local disk.

The old synthetic `/api/network/upload-pkt` parser has been retired. Packet Tracer files/references belong in the canonical Lab Builder using the `PACKET_TRACER` input type. Arbitrary `.pkt` binary parsing is not claimed.


## Dynamic Networking Engine

Published Networking Labs are rendered from `Lab`, `LabInput`, `LabNode`, `LabLink`, runbook, evidence, scenarios, and normalized `networking.v1` state. The same engine supports multiple projects and multiple Labs per project. Core inspection includes dynamic topology, device/interface/configuration views, routing/VLAN/ACL snapshots, and deterministic topology reachability. The operations layer adds recorded BGP/OSPF neighbor inspection, first-hop redundancy state, health derivation, IPv4 longest-prefix route lookup, conservative recorded-state forwarding/ACL analysis, a durable `NETOPS/...` context contract, and scenario-ready definitions.

These operations are derived from persisted snapshots, not live device telemetry or a full IOS/ASA emulator. Phase 6 provides contextual CLI inspection over the same state. Phase 7 can apply a safe session-only scenario overlay that is visible to the Networking workspace, operations layer, and CLI without rewriting canonical Lab state. Packet Tracer remains a truthful reference input; arbitrary `.pkt` binary parsing is not claimed. See `docs/NETWORKING_ENGINE_ARCHITECTURE.md` and `docs/SCENARIO_ENGINE_ARCHITECTURE.md`.

## Dynamic Linux Engine

Published Linux Labs are rendered from canonical Lab Manifest v1 data and normalized `linux.v1` host state. The same engine supports multiple Linux projects and multiple Labs per project. Core inspection covers persisted host identity, RHEL release/kernel, systemd service snapshots, block/LVM/filesystem/mount state, `/etc/fstab`, SELinux, network state, recorded logs, configuration files, and verification records.

The engine renders recorded state only. Phase 4B derives service/storage/SELinux/network/log health, evidence-backed investigation findings, suggested remediation guidance, and `RHEL/...` contexts. Phase 6 exposes safe CLI inspection over that state. Phase 7 can apply whitelisted Linux faults to a cloned session snapshot and restore the canonical baseline without executing shell commands. See `docs/LINUX_ENGINE_ARCHITECTURE.md` and `docs/SCENARIO_ENGINE_ARCHITECTURE.md`.

## Dynamic DevOps Engine

Published DevOps Labs are rendered from canonical Lab Manifest v1 data and normalized `devops.v1` delivery state. The Phase 5A core supports multiple projects and Labs and renders only modules represented by persisted state: repositories, CI/CD stages, Terraform/IaC files, Kubernetes snapshots, ArgoCD/GitOps state, Helm records, Cilium/network-policy observations, observability snapshots, and architecture records.

Phase 5B layers `DevOpsOperationsService` over that same state. It derives capability-aware health checks and evidence-backed findings for recorded pipeline failures, Terraform drift/errors, Kubernetes readiness/rollout problems, ArgoCD reconciliation issues, Helm state, Cilium/network-policy verification gaps, and observability warnings/failures. Missing modules are not invented and do not poison unrelated Labs with synthetic health checks. Suggested commands/remediation are guidance only.

The operations API also publishes durable `GITOPS/...` Lab/pipeline contexts and scenario definitions. Phase 6 uses those contexts in the unified CLI. Familiar commands such as `terraform plan` or `kubectl get` remain read aliases only. Phase 7 can overlay supported persisted DevOps scenario mutations for the browser session, while provider binaries/APIs remain disabled. See `docs/DEVOPS_ENGINE_ARCHITECTURE.md` and `docs/SCENARIO_ENGINE_ARCHITECTURE.md`.

## Unified Context-Aware CLI

Phase 6 replaces the legacy representative terminal with `UnifiedCliService`, a shared context-aware interpreter over the same persisted state used by the three domain workspaces. Stable contexts use `NETOPS/...`, `RHEL/...`, and `GITOPS/...` identifiers. Recorded-state commands include `ctx`, `inspect`, `show`, `show health`, `evidence`, and the supported domain inspectors.

Phase 7 extends the same CLI with `scenario list`, `scenario status`, `scenario run <slug>`, `scenario verify`, `scenario remediate`, and `scenario reset`. When a scenario is active, the context reports `SCENARIO_RUNTIME`; otherwise it reports `RECORDED_STATE`.

The CLI does **not** spawn a shell, SSH to devices, send ICMP packets, invoke IOS, run `kubectl`, run Terraform, Helm, ArgoCD, or provider APIs. Familiar command forms remain read aliases only. See `docs/UNIFIED_CLI_ARCHITECTURE.md`.

## Session-Scoped Scenario Engine

Phase 7 adds `ScenarioEngineService`, `ScenarioStateService`, `LabScenarioRuntime`, a safe mutation whitelist, the `/api/scenarios/*` lifecycle API, and a shared `ScenarioControlPanel` across Networking, Linux, and DevOps.

A scenario affects only the browser session identified by the opaque `X-Lab-Session` header. `Lab.normalizedState` remains the immutable canonical baseline. Running a scenario stores a server-side snapshot of the persisted scenario action contract; domain reads clone the canonical state and apply only whitelisted mutations. Remediation disables the overlay, verification records active-scenario/recovery checks, and reset deletes the runtime. No client-supplied arbitrary mutation code is accepted.

Lifecycle:

```text
RUN → OBSERVE/TROUBLESHOOT → VERIFY SCENARIO STATE → REMEDIATE → VERIFY RECOVERY → RESET
```

See `docs/SCENARIO_ENGINE_ARCHITECTURE.md`.

## Phase 8 Portfolio Orchestrator

Phase 8 upgrades the authenticated Admin area into the single writable control plane for Projects, Labs, inputs, normalized state, topology, scenarios, runbooks, evidence, artifact references, validation, exact preview, publication, archive/restore, duplication, ordering, and bounded JSON import/export.

The workflow is:

```text
DRAFT → CONFIGURE → VALIDATE → PREVIEW → MARK LAB READY → PUBLISH → MAINTAIN → ARCHIVE
```

Project and Lab revisions provide optimistic concurrency. Canonical Lab edits are blocked while Phase 7 session runtimes are active until an Admin explicitly resets those runtimes. Publication revalidates the complete Project/Lab revision snapshot in a transaction. Imports are JSON-only, bounded to 2 MiB in the service, prototype-safe, atomic, never fetched/executed, and always persisted as DRAFT. Exports omit secrets, users, sessions, audit/runtime rows, private storage keys, and unsupported byte/hash claims.

A documented `networking.companion-manifest.v1` format can round-trip canonical Networking inputs, nodes, links, normalized state, and reference metadata. It does not parse arbitrary Packet Tracer binaries. See `docs/ADMIN_ORCHESTRATOR.md`, `docs/PORTFOLIO_BUNDLE_FORMAT.md`, and `docs/NETWORKING_COMPANION_MANIFEST.md`.

## Git workflow

Git is the source of truth.

- Never work directly on `main`.
- Use a bounded phase branch.
- Preserve the cyber-terminal UI unless the phase explicitly changes it.
- Never invent evidence, metrics, hashes, URLs, credentials, or production state.
- Never edit already-applied migrations casually.
- Run `npm run verify` and inspect `git diff` before committing.
- Read `AGENTS.md` and `docs/DEFERRED_IMPLEMENTATION_REGISTER.md` before every phase.

Phase 2 through Phase 6 are complete and exit-verified. Phase 7 is code-complete in this closeout candidate but must be revalidated after closeout changes; do not start Phase 8 until the canonical `npm run verify` and `docs/PHASE7_VALIDATION_RUNBOOK.md` browser/session-isolation checks pass.
