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
→ repository factory
→ Legacy adapters or Prisma adapters

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

`PERSISTENCE_MODE=legacy|prisma` remains implemented for the content boundary. Production must use Prisma and must not silently fall back to in-memory persistence when PostgreSQL is unavailable. Authentication is now Prisma-backed regardless of the legacy content compatibility mode.

Phase 2B content persistence, Phase 2C persistent authentication/RBAC, and Phase 2D Canonical Lab Platform + Admin Core are COMPLETE and exit-verified. Full `MockDatabaseService` retirement remains Phase 2E after the remaining media/network/architecture compatibility paths receive persistent replacements.

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

`server/services/db.service.ts` remains intentionally present for legacy content adapters and selected compatibility routes such as media, architecture metrics, and current Packet Tracer compatibility behavior. Authentication no longer depends on it.

Do not retire `MockDatabaseService` until the remaining Admin/non-content dependencies have persistent replacements and Phase 2E exit criteria pass.

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

The active `MockDatabaseService` regression baseline is:

Canonical categories, with IDs and slugs that currently drive exact frontend filtering:

1. `cat-networking` / `networking` — Networking
2. `cat-linux` / `linux` — Linux
3. `cat-devops` / `devops` — DevOps

Flagship projects:

1. **Enterprise Multi-Homed WAN with Dual ISP BGP, OSPF Area 0 & HSRP Gateway Redundancy** — slug `cisco-enterprise-wan-bgp-hsrp`, format `cisco_pkt_lab`
2. **Enterprise RHEL 9 Infrastructure Hardening, Stratis/LVM Storage & SELinux Compliance Matrix** — slug `rhel-9-rhcsa-hardening-storage-selinux`, format `rhcsa_matrix`
3. **Cloud-Native GitOps Kubernetes Infrastructure with Cilium eBPF & Terraform** — slug `cloud-native-gitops-k8s-cilium-terraform`, format `devops_pipeline`

Certification/learning cards currently served as mock `Certification` records:

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

Phase 2B implements the content API boundary as:

HTTP Route
→ Application Service
→ Repository Contract
→ Repository Implementation

Repository implementations:

Legacy Repository
→ MockDatabaseService

Prisma Repository
→ PostgreSQL

Migrated content routes do not select persistence directly and do not import Prisma. Repository selection is centralized.

Supported modes:

PERSISTENCE_MODE=legacy

PERSISTENCE_MODE=prisma

Production must never silently fall back from broken PostgreSQL to in-memory persistence.

Phase 2B also includes explicit API error handling, async Express forwarding, frontend HTTP/envelope validation, loading/error/empty distinction, protected persistent Packet Tracer upload behavior, database checks, and persistence/regression scripts.

Phase 2B remains the content contract and Prisma parity checkpoint. Phase 2C adds the persistent auth repository/service boundary and revocable database sessions. Phase 2D adds the canonical Lab platform and persistent Admin core. `MockDatabaseService` can be retired only in Phase 2E after the remaining runtime compatibility dependencies have persistent replacements and the complete regression baseline is verified.

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

The three existing flagship lab fixtures are compatibility seed data normalized into this platform. They are not evidence that arbitrary Packet Tracer, Linux, or DevOps artifacts are parsed. Networking/Linux/DevOps adapters and stateful engines remain Phases 3–5. See `docs/LAB_PLATFORM_ARCHITECTURE.md`.

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
Legacy MockDatabaseService retirement after content, authentication, and Admin persistence parity

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

# 17. Planned Networking Evolution

Phase 3 should likely be implemented in controlled sub-phases:

3A topology/state model
3B device configuration
3C routing behavior
3D packet-flow engine
3E failures and verification

Example scenarios:

ISP_FAILOVER
OSPF_NEIGHBOR_LOSS

---

# 18. Planned Linux Evolution

Phase 4 should likely include:

system model
services
storage
SELinux/security
troubleshooting
shell integration

Example scenarios:

SELINUX_DENIAL
SERVICE_FAILURE
DISK_PRESSURE

---

# 19. Planned DevOps Evolution

Phase 5 should likely include:

pipeline model
IaC
GitOps/Kubernetes
failure and rollback
telemetry

Example scenarios:

ARGOCD_DRIFT
CANARY_FAILURE

---

# 20. Unified CLI Vision

Later phases should support contextual commands.

Examples:

CTX: NETOPS/R1-HQ

CTX: RHEL/RHEL9-LAB-01

CTX: GITOPS/LAB-CLUSTER

Potential portfolio-level commands:

help
ctx
inspect
scenario list
scenario run <id>
scenario reset
evidence

CLI output must eventually come from synchronized lab state rather than disconnected hard-coded text.

---

# 21. Scenario Lifecycle

Future simulations should approximately follow:

MISSION
→ ACTION
→ OBSERVATION
→ TROUBLESHOOTING
→ VERIFICATION
→ RESET

Visitors should be able to understand what failed, investigate it, fix it, and verify recovery.

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

# 24. Current Next Step

Phase 2B is COMPLETE and exit-verified. `PH2A-DEFER-001` is DONE.

**Phase 2C — Persistent Authentication & RBAC is COMPLETE and exit-verified.** The migration, explicit administrator bootstrap, persisted session behavior, current-role enforcement, logout revocation, content regressions, lint, and build passed the Phase 2C exit gate.

**Phase 2D — Canonical Lab Platform + Admin Core is COMPLETE and exit-verified.** Lab Manifest v1, standardized domain input registries, Project→many Labs, LabInputs, normalized state/topology/scenarios/runbooks/evidence, authenticated Lab Builder, persisted AuditLog UI, Skills/Certifications management, inquiry status management, and Project story-field round-tripping passed the consolidated verification baseline.

Routine validation is consolidated under `npm run verify`; targeted scripts remain for debugging. The next implementation target is **Phase 2E — safe retirement of the remaining MockDatabaseService runtime paths**.

Multi-Project Dynamic Lab Principle: Domain workspaces and interactive labs must be data-driven and reusable. Networking, Linux, and DevOps experiences must not be hard-coded for one flagship project. A Project may contain zero or more Labs; a Lab may contain zero or more Scenarios and Artifacts. Domain-specific adapters normalize project/lab inputs into a canonical lab state consumed by reusable renderers, CLI contexts, scenario engines, runbooks, and evidence views. Adding a supported project or lab should normally require data/artifact configuration rather than new frontend components.