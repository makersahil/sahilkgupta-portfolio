# Portfolio Orchestrator

Phase 8 replaces the primitive writable Project/Lab Admin experience with one authenticated **Portfolio Orchestrator**. Blogs, Categories, Certifications, Skills, Inquiries, and Audit remain separate Admin tools.

## Control flow

```text
AdminOrchestrator UI
  -> /api/admin/orchestrator/*
  -> PortfolioOrchestratorService
  -> validation / preview / bundle services
  -> repository contracts
  -> Prisma transactions
  -> PostgreSQL
```

Every route requires the current persisted `ADMIN` or `SUPER_ADMIN` role. Permanent deletion additionally requires `SUPER_ADMIN`, DRAFT/ARCHIVED state, no active scenario runtime, and typed confirmation.

## Lifecycle

```text
DRAFT
  -> CONFIGURE
  -> VALIDATE
  -> PREVIEW
  -> MARK LAB READY
  -> PUBLISH PROJECT
  -> OBSERVE / MAINTAIN
  -> ARCHIVE
```

Legacy Project/Lab create operations can no longer publish or mark READY directly. New Project and Lab records start DRAFT. Only the validated Orchestrator transaction may publish or mark READY.

## Revision and runtime safety

`Project.revision` and `Lab.revision` start at 1. Orchestrator writes carry an expected revision and return HTTP 409 when stale. Lab child writes increment the Lab revision atomically. Publication compares the complete current Project/Lab revision snapshot again inside its transaction.

Canonical changes that can invalidate Phase 7 overlays—inputs, normalized state, topology, scenarios, or artifact associations—are blocked while active runtimes exist. The Admin may explicitly reset all runtimes for the Lab; only the deleted count is audited, never session keys.

## Validation and preview

Validation is computed from the current aggregate and is never persisted as an authoritative pass. It reuses:

- Lab Manifest v1
- the domain input registry
- Networking, Linux, and DevOps adapters
- safe scenario action application and verification
- public manifest shaping

Preview is read-only and uses the same public mappers/adapters. It never toggles publication, creates a scenario runtime, fetches an external URL, or mutates canonical state.

## Bundle and companion formats

The Orchestrator imports and exports versioned JSON:

- `portfolio.project-bundle.v1`
- `portfolio.lab-bundle.v1`
- `networking.companion-manifest.v1`

Import is bounded, prototype-safe, atomic, DRAFT-only, and never executes commands or fetches URLs. Export contains reference metadata only and excludes credentials, users, sessions, AuditLog rows, scenario runtimes, environment values, and internal storage keys.

## Artifact catalog

The Admin catalog manages safe Artifact metadata and associations. It does not claim that reference registration uploaded bytes. SHA-256 stays null unless bytes were genuinely read and hashed. Real byte storage remains deferred.

## Focused verification

```bash
npm run test:orchestrator:static
npm run test:orchestrator
npm run test:orchestrator:http
npm run test:orchestrator:bundle
npm run verify
```

Phase 8 is not complete until the canonical 49-step verifier and `docs/PHASE8_VALIDATION_RUNBOOK.md` both pass.
