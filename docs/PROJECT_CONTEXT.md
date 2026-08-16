# Sahil K Gupta — Systems & Infrastructure Portfolio
## Project Context

### 1. Product Vision

This project is an interactive infrastructure proof-of-work portfolio.

It is not intended to be a normal static developer portfolio.

The goal is to let visitors explore and interact with realistic infrastructure environments across three engineering domains:

- Networking
- Linux Systems
- DevOps / Cloud Native

Visitors should be able to inspect architectures, explore lab state, execute safe contextual commands, reproduce infrastructure scenarios, follow operator runbooks, and inspect evidence/configuration.

The portfolio should feel like an infrastructure operations platform rather than a resume website.

---

# 2. Main Operator Workspaces

The product has three major engineering workspaces.

## Networking

Public title:

NETWORK CONTROL PLANE

Target capabilities include:

- interactive network topology
- routers and switches
- routing state
- BGP / OSPF concepts
- HSRP / gateway redundancy
- packet-flow visualization
- device configuration inspection
- failure injection
- operator runbooks
- networking CLI context

Example future CLI context:

CTX: NETOPS/R1-HQ

Example commands:

show ip bgp summary
show ip route
show standby brief

---

## Linux

Public title:

RHEL SYSTEMS CONSOLE

Target capabilities include:

- RHEL host inspection
- systemd
- processes
- storage
- networking
- SELinux
- containers
- troubleshooting incidents
- system configuration inspection
- contextual Linux shell

Example future context:

CTX: RHEL/RHEL9-LAB-01

Example scenario:

SELinux blocks a service from accessing /srv/web.

Visitor investigates with:

systemctl
getenforce
ls -Z
ausearch

and resolves through realistic remediation.

---

## DevOps

Public title:

DELIVERY CONTROL PLANE

Target capabilities include:

- Git workflow
- CI pipeline
- security scanning
- OCI/container image lifecycle
- Terraform
- GitOps
- Kubernetes
- Cilium/eBPF
- observability
- deployment failures
- rollback
- runtime verification

Example future context:

CTX: GITOPS/LAB-CLUSTER

Example scenario:

Canary deployment fails health checks and requires rollback.

---

# 3. Public Product Story

Home:

SYSTEM INDEX

Primary flow:

SELECT DOMAIN
→ ENTER LAB
→ OPERATE & VERIFY

Project experience:

MISSION BRIEF
→ INTERACTIVE SYSTEM
→ OPERATOR RUNBOOK
→ CONTEXTUAL CLI
→ EVIDENCE VAULT

The portfolio should demonstrate engineering ability through interaction and reproducible proof rather than unsupported claims.

---

# 4. Truthfulness Requirement

This is one of the most important rules in the project.

Never fabricate or imply real production evidence when none exists.

Do not invent:

- benchmarks
- uptime
- latency
- compliance results
- audit evidence
- hashes
- repository URLs
- artifact files
- production infrastructure
- database persistence
- deployment metrics
- certifications
- verification results

When something is simulated, representative, planned, or conceptual, it must be presented honestly.

---

# 5. Current Technology Stack

Frontend:

React
TypeScript
Vite

Backend:

Node.js
Express
TypeScript

Persistence:

PostgreSQL
Prisma ORM

Current backend runtime architecture:

Public content:
React
→ browser API client
→ Express content routes
→ application services
→ repository contracts
→ Prisma repositories
→ PostgreSQL

Persistent authentication:
Admin UI
→ `/api/auth/*`
→ AuthService
→ PrismaAuthRepository
→ PostgreSQL `User` + `AuthSession`

Canonical lab platform:
Public/Admin clients
→ `/api/labs/*`
→ LabService / LabManifestService
→ PrismaLabRepository
→ PostgreSQL `Project → Labs → Inputs/State/Topology/Scenarios/Runbook/Evidence`

Persistent Admin orchestration:
Admin CMS
→ authenticated content/Lab APIs
→ content + Lab repositories/services
→ PostgreSQL
→ persisted `AuditLog` through AuditService/PrismaAuditRepository

PostgreSQL/Prisma is the only supported runtime persistence path. There is no silent in-memory fallback when PostgreSQL is unavailable. An old `PERSISTENCE_MODE=prisma` environment entry is tolerated only for local migration compatibility; `legacy` is rejected.

Phase 2B content persistence, Phase 2C persistent authentication/RBAC, Phase 2D Canonical Lab Platform + Admin Core, and Phase 2E Prisma-only runtime retirement are COMPLETE and exit-verified. Phase 3 Dynamic Networking, Phase 4 Dynamic Linux, Phase 5 Dynamic DevOps, and Phase 6 Unified Context-Aware CLI are complete and exit-verified platform/domain baselines. Phase 7 Session-Scoped Scenario Engine is code-complete in the current closeout candidate and must pass the canonical 45-step verifier plus browser/session-isolation validation after any closeout change before final checkpoint.

---

# 6. Phase 1 — Substantially Implemented

Phase 1 focused on foundation, story flow, portfolio truthfulness, and UX architecture.

Major outcomes visible in the current frontend:

- SYSTEM INDEX home
- NETWORK CONTROL PLANE
- RHEL SYSTEMS CONSOLE
- DELIVERY CONTROL PLANE

Navigation and storytelling were reorganized around operator workflows.

Admin was removed from primary public navigation.

Blueprint content was reframed as target/planned architecture where appropriate.

Misleading public Packet Tracer artifact claims were removed.

RHEL references were standardized around RHEL 9.4.

Hard-coded production JWT fallback behavior was corrected.

Hard-coded demo passwords were removed.

Major fabricated metrics/evidence were removed or registered as deferred work.

Phase 1 is not unconditionally complete. Representative terminal output, hard-coded verification counters, public lab naming, ambiguous production wording, and clean validation remain OPEN in the Deferred Implementation Register. The current Evidence Vault also contains hard-coded verification language that must not be treated as measured lab evidence.

---

# 7. Phase 2A — Current Known-Good Baseline

Phase 2A created the PostgreSQL/Prisma persistence foundation.

Important files include:

prisma/schema.prisma
prisma/seed.ts
prisma/migrations/
server/lib/prisma.ts
server/config/env.ts
server/scripts/db-check.ts

Database models include concepts such as:

User
AuthSession
Category
Project
ProjectRunbookStep
BlogPost
Inquiry
LearningTrack
Skill
Certification
Lab
LabNode
LabLink
LabScenario
Evidence
Artifact
AuditLog
SiteSetting

The baseline migration is intended to create a structurally coherent PostgreSQL schema. Repository inspection confirms the migration artifact exists, but does not establish whether it has been applied to any particular PostgreSQL database.

Phase 2A established the schema/migration foundation. Phase 2B has since expanded the seed so a fresh Prisma database can reproduce the canonical public content baseline required by the current UI, including categories, flagship projects, blogs, Certification learning cards, skills, and compatibility lab payloads.

The obsolete dormant `server/services/prisma.database.service.ts` transition service has been removed. Content persistence uses repository contracts plus dedicated Prisma adapters.

The former `server/services/db.service.ts` and legacy repository adapters have been removed. Media reference metadata now persists through `Artifact`, architecture metrics come from PostgreSQL counts, and the synthetic Packet Tracer parser attachment endpoint is retired.

Phase 2E exit verification proved that no runtime route depends on legacy in-memory persistence and that the full regression baseline passes against PostgreSQL.

---

# 8. Why Phase 2B Was Restored

Project history records that a previous AI-generated Phase 2B implementation was rejected and rolled back. The available Git history in this repository does not independently establish that rollback, so this section is retained as project history rather than a repository-verifiable event.

It introduced regressions including:

- core portfolio content disappearing
- Linux/DevOps projects being stored as Networking
- draft content accidentally becoming public
- blog/category relationships breaking
- Project story fields being removed
- weak async Express error handling
- frontend mutations reporting success after backend failures

These mistakes must not be repeated.

The current repository state is the source of truth for planning the next migration.

---

# 9. Core Content Regression Rule

Persistence work must NEVER make existing portfolio content disappear.

The canonical persistent content regression baseline is:

Canonical categories, with IDs and slugs that currently drive exact frontend filtering:

1. `cat-networking` / `networking` — Networking
2. `cat-linux` / `linux` — Linux
3. `cat-devops` / `devops` — DevOps

Flagship projects:

1. **Enterprise Multi-Homed WAN with Dual ISP BGP, OSPF Area 0 & HSRP Gateway Redundancy** — slug `cisco-enterprise-wan-bgp-hsrp`, format `cisco_pkt_lab`
2. **Enterprise RHEL 9 Infrastructure Hardening, Stratis/LVM Storage & SELinux Compliance Matrix** — slug `rhel-9-rhcsa-hardening-storage-selinux`, format `rhcsa_matrix`
3. **Cloud-Native GitOps Kubernetes Infrastructure with Cilium eBPF & Terraform** — slug `cloud-native-gitops-k8s-cilium-terraform`, format `devops_pipeline`

Certification/learning cards persisted as `Certification` records:

1. **CCNA 200-301 Preparation Track**
2. **RHCSA EX200 Preparation Track**
3. **Cloud-Native Kubernetes & DevOps Track**

Skills:

1. Enterprise Linux Administration
2. Cisco Routing & Packet Tracer Labs
3. LVM Storage & SELinux Hardening
4. BGP & OSPF Dynamic Routing
5. Kubernetes & Cilium eBPF Mesh
6. Terraform & Infrastructure-as-Code
7. ArgoCD & GitOps CI/CD Pipelines

Blogs:

1. **Enterprise BGP EVPN & Packet Tracer Simulation Architecture**
2. **Mastering Enterprise Linux: Storage Management, Systemd Units & SELinux**
3. **Zero-Trust Kubernetes: Replacing kube-proxy with Cilium eBPF & WireGuard**

Required behavior baseline:

- System Index renders when no domain is selected.
- `?domain=` navigation selects the correct workspace and browser back/forward navigation remains functional.
- Projects, blogs, and skills continue to filter by their canonical category IDs.
- Specialized Cisco, RHEL, and DevOps nested project content remains available.
- Featured project and certification/learning-card behavior remains intentional and stable.
- Existing Admin project and blog CRUD, category create/update, inquiry list, and refresh flows remain usable while persistence is migrated in their assigned phase.
- The public contact submission contract remains compatible.
- Authentication is implemented and exit-verified against persisted users and revocable PostgreSQL sessions.
- API failures must never appear as valid empty content or successful Admin mutations.
- Existing public categories, articles, CLI snippets, project detail, and technical competency content must not disappear.

A persistence migration that causes the frontend to render zero items is a regression.

The target frontend state must distinguish:

loading
loaded
error
empty

API failure must not silently look like an empty portfolio.

---

# 10. Important Project Fields

Project storytelling fields must be preserved.

These include concepts such as:

mission
architectureSummary
whatIBuilt

They support the public story:

MISSION
ARCHITECTURE
WHAT I BUILT

Do not remove them during schema migrations.

Verified limitation: these fields exist in the Prisma schema and seed, but are not currently preserved as independent fields by the active frontend/API `Project` contract. Current project-detail storytelling is partly selected and hard-coded by specialized project format. Future Admin/lab orchestration work must wire these fields end-to-end without breaking existing specialized project views.

---

# 11. Domain Model

Canonical engineering domains:

NETWORKING
LINUX
DEVOPS

Frontend representations may use lowercase equivalents.

Mappings must be explicit.

Do not default unknown projects to NETWORKING.

Project domain and selected category must remain logically consistent.

---

# 12. Content Status

Database publication states include concepts such as:

PUBLISHED
DRAFT
ARCHIVED

Public APIs must not expose drafts or archived content unless intentionally designed.

Never map an unknown status to PUBLISHED.

Unknown states should fail validation.

---

# 13. Authentication

Phase 2C implements persistent authentication and RBAC using PostgreSQL/Prisma.

The persistent model is:

Browser HttpOnly cookie
→ signed session JWT containing user/session identity only
→ persisted `AuthSession` lookup
→ current persisted `User` lookup
→ active/session-expiry/revocation checks
→ current database role
→ `requireRole()`

The browser no longer stores an authentication token in `localStorage`. Runtime login validates the persisted bcrypt password hash; it does not compare passwords to `ADMIN_PASSWORD`. Normal portfolio seeding creates no users. Administrator creation/rotation is explicit through `npm run auth:bootstrap-admin`, which also revokes existing sessions for that administrator.

Phase 2C includes basic process-local failed-login throttling. Distributed/shared rate limiting remains a Phase 9 deployment concern if the application is horizontally scaled.

Persistent roles are `SUPER_ADMIN`, `ADMIN`, and `EDITOR`. Account deactivation and role changes take effect on the next protected request because authorization state is reloaded from PostgreSQL.

---

# 14. Admin

The long-term Admin product is intended to become a Portfolio Orchestrator.

Eventually it should manage:

projects
categories
articles
skills
certifications
labs
devices
commands
scenarios
runbooks
evidence
artifacts
site configuration

without requiring source-code edits.

Phase 2D-2 implements the persistent Admin core over the Phase 2D-1 Lab platform:

- Projects, Blogs, Categories, Skills, and Certifications use authenticated persistent content APIs.
- Project `mission`, `architectureSummary`, and `whatIBuilt` fields round-trip through Admin, APIs, Prisma, and public project presentation.
- Inquiries can be read and have their persisted status updated.
- The Lab Builder manages Project-linked Labs, standardized inputs, normalized state/topology, scenarios, runbook steps, evidence metadata, and Manifest v1 preview through the canonical Lab APIs.
- The System Audit Log reads real persisted `AuditLog` records; synthetic fallback events/timestamps are removed from the Admin UI path.
- Admin mutations record actor/action/entity metadata without storing secrets or full request bodies.

The frontend API client validates HTTP status and API envelopes, and core portfolio loading distinguishes loading/error/empty/loaded. General media/artifact-storage orchestration remains later work; Phase 8 expands this Admin core into the full Portfolio Orchestrator.

---

# 15. Persistence Architecture

The runtime persistence boundary is now:

HTTP Route
→ Application Service
→ Repository Contract
→ Prisma Repository
→ PostgreSQL

Content routes do not import Prisma directly. Authentication, canonical Labs, Admin audit, artifact metadata, and system metrics all use persistent PostgreSQL state.

There is no supported legacy runtime repository mode and no silent fallback to in-memory data. Database failure is surfaced through health/error handling instead of returning mock content.

The former Packet Tracer parser endpoint is retired. Packet Tracer files/references are represented through canonical `PACKET_TRACER` LabInputs; arbitrary `.pkt` binary parsing is not claimed. Media compatibility APIs persist metadata in `Artifact` but do not claim managed byte storage, which remains Phase 8/9 work.

---

# 15A. Canonical Lab Platform

The durable lab model is now:

Project
→ 0..N Labs
→ 0..N standardized LabInputs
→ normalizedState
→ nodes / links
→ scenarios
→ LabRunbookSteps
→ Evidence / Artifact references

`Project.domain` is canonical. Lab input types are validated by domain-specific application registries instead of project-name checks. Public lab reads require a READY Lab attached to a PUBLISHED Project. Public Lab Manifest v1 output exposes safe input descriptors, enabled scenarios, public evidence, and public artifact summaries; it does not expose raw input payloads, raw external input URLs, or internal storage keys.

The three existing flagship lab fixtures are compatibility seed data normalized into this platform. They are not evidence that arbitrary Packet Tracer, Linux, or DevOps artifacts are parsed. Networking and Linux domain engines are complete; the DevOps core is complete and its recorded-state operations layer is implemented in Phase 5B. See `docs/LAB_PLATFORM_ARCHITECTURE.md`.

# 16. Phase Roadmap

Phase 1:
Foundation & Story Flow

Phase 2:
Backend & Data Architecture

Phase 2A:
Prisma/PostgreSQL foundation

Phase 2B:
Content API/service repository boundary and Prisma parity; no premature mock retirement

Phase 2C:
Authentication and RBAC persistence

Phase 2D:
Canonical Lab Platform + Admin Core

Phase 2D-1:
Canonical Lab Manifest v1, standardized LabInputs, normalized state, topology/scenario/runbook/evidence persistence, and Lab APIs

Phase 2D-2:
Admin Lab Builder, persistent Admin orchestration, Skills/Certifications management, and real AuditLog UI

Phase 2E:
Prisma-only runtime cutover, legacy service/adapters retirement, persistent media metadata, truthful system metrics, and parser cleanup

Phase 3:
Networking Control Plane

Phase 4:
Linux Systems Console

Phase 5:
DevOps Delivery Control Plane

Phase 6:
Unified Context-Aware CLI

Phase 7:
Real Lab & Simulation Engine

Phase 8:
Admin / Portfolio Orchestrator

Phase 9:
Production Security, Testing, Performance and Deployment

---

# 17. Dynamic Networking Engine

Phase 3 is complete in two layers. Phase 3A provides the persisted multi-project/multi-Lab Networking adapter, reusable topology/device rendering, recorded control-plane snapshots, and deterministic topology reachability. Phase 3B adds recorded BGP/OSPF and first-hop redundancy inspection, derived health, longest-prefix route lookup, conservative structured ACL/path analysis, durable `NETOPS/...` context contracts, and scenario-ready definitions.

The Networking engine does not claim arbitrary Packet Tracer binary parsing or live device execution. Phase 6 provides unified contextual CLI inspection. Phase 7 applies supported Networking faults as session-only overlays over cloned canonical state; no device command is executed and canonical `Lab.normalizedState` is not rewritten.

---

# 18. Dynamic Linux Engine

Phase 4 is complete in two layers. Phase 4A provides reusable `linux.v1` state for RHEL 9.4 hosts, services, storage/LVM/mount/fstab, SELinux, networking, logs/configuration, verification, and multi-project/multi-Lab rendering. Phase 4B adds recorded-state service/storage/SELinux/network/log investigation, remediation guidance, durable `RHEL/...` context contracts, and scenario-ready definitions.

The Linux engine does not execute shell commands. Phase 6 provides unified contextual CLI inspection. Phase 7 applies supported Linux faults as session-only overlays and restores the canonical baseline on remediation/reset without running system commands.

---

# 19. Dynamic DevOps Engine

Phase 5 implements the reusable DevOps Delivery Control Plane in two layers. Phase 5A provides canonical `devops.v1` recorded state for repositories, pipelines, Terraform/IaC, Kubernetes, GitOps/ArgoCD, Helm, Cilium/network-policy observations, observability, architecture, runbooks, scenarios, and evidence. Phase 5B derives recorded-state health and investigation findings, remediation guidance, durable `GITOPS/...` operator contexts, and scenario-ready definitions from the same state.

The engine supports capability-aware Labs such as Terraform-only or pipeline-only projects. Missing unrelated modules are not fabricated and do not create synthetic health failures.

Example scenario contracts:

PIPELINE_FAILURE
TERRAFORM_DRIFT
KUBERNETES_ROLLOUT_FAILURE
ARGOCD_DRIFT
CANARY_FAILURE
CILIUM_POLICY_REGRESSION

Phase 5 does not execute provider commands. Phase 6 provides unified contextual recorded-state commands. Phase 7 adds shared session-scoped scenario mutation/remediation/verification/reset while keeping provider command execution disabled.

---

# 20. Unified Context-Aware CLI

Phase 6 implements contextual recorded-state commands across all three domain engines.

Examples:

CTX: NETOPS/<LAB>/<DEVICE>

CTX: RHEL/<LAB>/<HOST>

CTX: GITOPS/<LAB>/<PIPELINE>

Implemented portfolio-level commands include:

help
ctx
inspect
show <area>
show health
scenario list
scenario status
scenario run <slug>
scenario verify
scenario remediate
scenario reset
evidence
clear

CLI output comes from persisted normalized Lab state, an optional Phase 7 session scenario overlay, or explicit CLI metadata. The CLI does not execute shell/provider binaries. Active scenario contexts report `SCENARIO_RUNTIME`; normal contexts report `RECORDED_STATE`.

---

# 21. Scenario Lifecycle

Phase 7 simulations now follow:

MISSION
→ ACTION
→ OBSERVATION
→ TROUBLESHOOTING
→ VERIFICATION
→ RESET

Visitors can run a supported persisted scenario, observe the session-only fault through the visual workspace and CLI, verify the injected condition, remediate to the canonical baseline, verify recovery, and reset the runtime. The portfolio does not execute external infrastructure commands during this lifecycle.

---

# 22. Deferred Work

Before implementing any phase, read:

docs/DEFERRED_IMPLEMENTATION_REGISTER.md

Open deferred work must remain tracked until completed.

Do not delete deferred items merely because another phase has started.

Only mark an item complete when its implementation and verification conditions are satisfied.

---

# 23. Git Workflow

Git is the project source of truth.

main must remain stable.

Development occurs on phase/sub-phase branches.

Before completing a phase:

- review git diff
- run lint
- run build
- validate Prisma
- run relevant tests
- review database migrations
- update deferred register
- verify public content regression
- commit only intentional changes

Never treat AI chat output as the authoritative project state.

The repository is authoritative.

---

# 24. Current Platform State

**Phase 2 — Persistent Platform Foundation is COMPLETE and exit-verified.** PostgreSQL/Prisma persistence, content repositories/APIs, persistent authentication/RBAC, the canonical Lab Platform, Admin Core, and the Prisma-only runtime cutover are the established application foundation. `MockDatabaseService` and the legacy runtime fallback are retired.

**Phase 3 — Dynamic Networking Engine is COMPLETE.** The reusable Networking engine supports persisted multi-project/multi-Lab topology/device/routing state plus recorded-state BGP/OSPF/HSRP investigation, route lookup, conservative ACL/path reasoning, `NETOPS/...` context contracts, and scenario-ready definitions. Arbitrary `.pkt` binary parsing is not claimed.

**Phase 4 — Dynamic Linux Engine is COMPLETE.** The reusable `linux.v1` model supports RHEL 9.4 hosts, services, storage/LVM/mount/fstab, SELinux, networking, logs/configuration, and verification records. `LinuxOperationsService` adds recorded-state diagnostics, remediation guidance, `RHEL/...` contexts, and scenario-ready definitions without shell execution or mutation.

**Phase 5 — Dynamic DevOps Engine is COMPLETE.** The reusable `devops.v1` model supports repositories, pipelines, Terraform/IaC, Kubernetes, GitOps/ArgoCD, Helm, network-policy observations, observability, and capability-aware recorded-state operations with `GITOPS/...` contexts and scenario readiness.

**Phase 6 — Unified Context-Aware CLI is COMPLETE and exit-verified.** `UnifiedCliService` resolves `NETOPS/...`, `RHEL/...`, and `GITOPS/...` contexts and reads the same state as the domain workspaces. The legacy hard-coded terminal runtime is retired. External shell/provider execution remains disabled.

**Phase 7 — Session-Scoped Scenario Engine is code-complete in the current closeout candidate.** `LabScenarioRuntime`, `ScenarioEngineService`, safe mutation adapters, `/api/scenarios/*`, the shared Scenario Runtime UI, and Unified CLI lifecycle commands synchronize session simulation across Networking, Linux, and DevOps while keeping canonical Lab state immutable. Final checkpoint requires a fresh canonical 45-step verifier pass and the browser/session-isolation runbook after the closeout patch.

Routine validation is consolidated under `npm run verify`; targeted domain/CLI/scenario scripts remain durable debugging/regression tools.

Multi-Project Dynamic Lab Principle: Domain workspaces and interactive labs must be data-driven and reusable. Networking, Linux, and DevOps experiences must not be hard-coded for one flagship project. A Project may contain zero or more Labs; a Lab may contain zero or more Scenarios and Artifacts. Domain-specific adapters normalize project/lab inputs into a canonical lab state consumed by reusable renderers, CLI contexts, scenario engines, runbooks, and evidence views. Adding a supported project or lab should normally require data/artifact configuration rather than new frontend components.

## Phase 5A Core Dynamic DevOps Engine

```text
Canonical DevOps Lab Manifest
  -> DevOpsLabAdapter
  -> devops.v1 normalized state
  -> DevOpsService
  -> /api/devops
  -> Dynamic Delivery Control Plane
```

The engine supports multiple published DevOps projects and READY Labs without project-slug conditionals. Supported normalized modules include repository/revision metadata, CI/CD pipelines, Terraform/IaC files and drift state, Kubernetes cluster/workload snapshots, ArgoCD state, Helm records, Cilium/network-policy observations, observability snapshots, and architecture records. The UI renders only modules actually present in the Lab.

The canonical GitOps project is a recorded project fixture, not live production telemetry. Phase 5A does not execute pipelines, Terraform, kubectl, Helm, ArgoCD, Cilium, or cloud APIs. Missing state remains empty/unknown. The former browser-side timer-based pipeline replay is removed.

## Phase 5B DevOps Investigation and Operations

`DevOpsOperationsService` consumes the same `devops.v1` state and exposes `devops.operations.v1`. Health checks are capability/input-aware: a Terraform-only Lab is evaluated from its Terraform evidence rather than being marked unknown because Kubernetes or GitOps are absent. Represented but inconclusive evidence stays `UNKNOWN`. Explicit failure/warning state produces evidence-backed findings and remediation guidance.

The public operations contract adds `/operations` and `/context` endpoints. Context identifiers use `GITOPS/<LAB>` and optional `GITOPS/<LAB>/<PIPELINE>` forms. Persisted scenario definitions are surfaced with observable signals; Phase 7 can now apply supported definitions through the shared session runtime while the operations layer itself remains non-executing.

## Phase 6 Unified Context-Aware CLI

`UnifiedCliService` is the single command interpreter for all domains. The browser stores only the selected context identifier and sends it with each command; the backend resolves that context against public persisted Lab state. Lab/device/host/pipeline prompts reuse the domain context contracts. Global commands cover context switching, inspection, health, scenario listing, evidence, and clearing the transcript. Domain commands expose recorded routing/protocol state, RHEL host state, and DevOps delivery state. Familiar `cisco`, `systemctl`, `kubectl`, and `terraform` forms are read aliases only where supported.

The CLI never spawns a shell, SSH session, network probe, IOS process, kubectl/Terraform/Helm/ArgoCD command, or provider process. Phase 7 adds scenario lifecycle commands, but those commands mutate only the persisted session runtime overlay and never canonical Lab state or external infrastructure.

## Phase 7 Session-Scoped Scenario Engine

Phase 7 persists one optional `LabScenarioRuntime` per `sessionKey + labId`. The browser creates an opaque identifier in `sessionStorage` and sends it as `X-Lab-Session`. The identifier is a simulation selector, not authentication.

`ScenarioEngineService` loads only persisted, enabled `LabScenario` definitions. Clients send a scenario slug rather than arbitrary mutation code. `scenario-mutators.ts` validates a bounded whitelist of Networking, Linux, and DevOps state transitions and applies them to a clone of the current canonical domain state. `ScenarioStateService` overlays the result only while the runtime is `ACTIVE`.

Lifecycle states are `ACTIVE`, `REMEDIATED`, and `VERIFIED`. Active-scenario verification records checks derived from the mutation contract. Remediation disables the overlay so reads return the canonical baseline. Recovery verification confirms the overlay is disabled and marks the runtime verified. Reset deletes the runtime. New scenario starts also prune runtimes that have been stale for more than 24 hours; distributed quotas/rate limiting remain Phase 9 hardening.

The Scenario Runtime panel is integrated into all three domain explorers, and the Unified CLI supports `scenario list/status/run/verify/remediate/reset`. Visual domain reads, operations reads, and CLI reads use the same session header so the simulated state stays synchronized.

Truthfulness boundary: Phase 7 is a session-scoped simulation engine, not a remote infrastructure executor. It does not SSH, spawn shells, send packets, run systemd/kubectl/Terraform/Helm/ArgoCD/Cilium/provider commands, or overwrite `Lab.normalizedState`. See `docs/SCENARIO_ENGINE_ARCHITECTURE.md`.
