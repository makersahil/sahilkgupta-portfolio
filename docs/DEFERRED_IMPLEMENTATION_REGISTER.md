# Deferred Implementation Register

## Open Items

### [PH1-DEFER-001]
Origin Phase: Phase 1
Item: Remaining hard-coded/representative terminal outputs that may look like measured runtime values.
Reason Deferred: CLI output must come from lab state or be clearly marked representative/simulated; requires context-aware backend functionality.
Target Phase: Phase 6 — Context-Aware CLI
Priority: P1
Verification: All CLI output must come from lab state or be clearly marked representative/simulated.
Implementation State: DONE. Phase 6 replaces the legacy hard-coded terminal route with `UnifiedCliService`, removes fabricated runtime/ping/deployment/benchmark output, and maps supported familiar command forms to recorded-state inspectors. The dependency-complete Phase 6 verification gate passed before merge to `main`.
Status: DONE

### [PH1-DEFER-002]
Origin Phase: Phase 1
Item: Remaining RHCSA/Linux verified/compliant counters or hard-coded check totals.
Reason Deferred: Status must be generated from actual implemented lab checks in future phases.
Target Phase: Phase 4 — Linux Systems Console / Phase 7 Scenario Verification
Priority: P1
Verification: Verification status must be generated from actual implemented lab checks. Phase 4A persists recorded Linux verification records and Phase 4B derives recorded-state health/investigation results. Phase 7 adds explicit active-scenario/recovery verification and removes the public hard-coded RHCSA "Hardened" total badge in favor of recorded objective counts.
Implementation State: IMPLEMENTED PENDING EXIT. Runtime verification is now authoritative for Phase 7 scenarios; dependency-complete regression and browser verification remain required before closure.
Status: OPEN

### [PH1-DEFER-003]
Origin Phase: Phase 1
Item: Any remaining `nexus-*` lab/internal host naming exposed publicly.
Reason Deferred: Clean up of simulated infrastructure naming requires domain implementations.
Target Phase: Phase 3/4/5 domain lab implementation or Phase 9 cleanup.
Priority: P2
Verification: Public simulated infrastructure uses consistent Sahil portfolio lab naming.
Status: OPEN

### [PH1-DEFER-004]
Origin Phase: Phase 1
Item: Remaining ambiguous production/Multi-AZ wording inside legacy seed/demo output.
Reason Deferred: Need domain phases to replace mock seeds with active verified artifacts.
Target Phase: Relevant domain phase or Phase 9.
Priority: P1
Verification: No lab state is presented as real production state unless actually connected.
Status: OPEN

### [PH1-DEFER-005]
Origin Phase: Phase 1
Item: Full clean build/lint verification in a dependency-complete environment.
Reason Deferred: Ensuring continuous success across all layers.
Target Phase: Every phase and final Phase 9.
Priority: P1
Verification: `npm run build` and `npm run lint` successful in a complete environment.
Status: OPEN

### [PH2A-DEFER-001]
Origin Phase: Phase 2A
Item: Migrate content APIs and services toward a repository boundary and Prisma contract parity.
Reason Deferred: Phase 2A is strictly focused on persistence foundation. Content mappings, asynchronous route handling, API error behavior, and PostgreSQL parity require dedicated Phase 2B work. Phase 2B must not prematurely migrate authentication or persistent Admin mutations.
Target Phase: Phase 2B
Priority: P0
Verification: Public content API contracts operate through the repository/service boundary with verified Prisma parity, canonical content remains visible, domain filtering remains correct, and API failures do not appear as valid empty content. MockDatabaseService retirement is not a Phase 2B completion condition.
Implementation State: DONE. Repository/service boundaries, legacy and Prisma adapters, content CRUD, error handling, frontend failure states, durable content regression scripts, live Prisma checks, and restart persistence verification passed the Phase 2B exit audit.
Status: DONE

### [PH2A-DEFER-002]
Origin Phase: Phase 2A
Item: Authentication Persistence & RBAC.
Reason Deferred: Need functional user login flows and safe admin bootstrap outside of seed.
Target Phase: Phase 2C
Priority: P0
Verification: Persisted users authenticate through bcrypt hashes; sessions are stored/revoked in PostgreSQL; `/me` and all protected requests re-check the current active user and role; browser localStorage auth is absent; bootstrap is explicit and normal seed contains no users; auth/content regressions and build/lint pass.
Implementation State: DONE. Persistent `User` + `AuthSession` schema/migration, Prisma auth repository, AuthService, HttpOnly cookie session flow, current-role middleware, explicit admin bootstrap, logout revocation, basic failed-login throttling, auth regression suites, content regressions, lint, build, migration deployment, and PostgreSQL verification passed the Phase 2C exit gate.
Status: DONE

### [PH2A-DEFER-003]
Origin Phase: Phase 2A
Item: Admin CRUD Integration.
Reason Deferred: CMS needs to operate via authenticated routes over Prisma.
Target Phase: Phase 2D-2
Priority: P0
Verification: CMS UI successfully mutates data in PostgreSQL.
Implementation State: DONE. The authenticated Lab Builder, persistent Skills/Certifications management, inquiry status updates, Project story-field round-tripping, and persisted AuditLog-backed Admin audit display passed the consolidated Phase 2D verification suite and full-ZIP exit audit.
Status: DONE

### [PH2A-DEFER-004]
Origin Phase: Phase 2A
Item: Real Artifact Storage.
Reason Deferred: Requires S3 or local bucket pipeline configuration.
Target Phase: Phase 8 or Phase 9
Priority: P2
Verification: `Artifact` model contains genuine SHA hashes and functional storage references.
Status: OPEN

### [PH2A-FIX-001]
Origin Phase: Phase 2A-Fix
Item: Legacy Seed Learning Track Metrics.
Reason Deferred: The seed currently contains arbitrary learning objectives (e.g. 8/10, 12/15) not backed by explicit objective tracking.
Target Phase: Phase 4/5/8
Priority: P2
Verification: Genuine explicit learning objectives mapped to users instead of static seed numbers.
Status: OPEN

### [PH2A-FIX-002]
Origin Phase: Phase 2A-Fix
Item: Retire MockDatabaseService only after PostgreSQL API parity is verified.
Reason Deferred: Content, authentication, and Admin persistence parity were prerequisites for removing the final compatibility runtime paths.
Target Phase: Phase 2E
Priority: P1
Verification: Content, authentication, and Admin persistence parity are complete; no runtime route imports legacy persistence; no fallback selects in-memory persistence; persistent media/system replacements are active; and the full regression baseline passes using PostgreSQL.
Implementation State: DONE. `MockDatabaseService`, legacy repositories, legacy regression mode, synthetic Packet Tracer parser attachment, and fake architecture telemetry are removed. Media reference metadata uses `Artifact`, system metrics use PostgreSQL counts, and the complete PostgreSQL regression baseline passed the Phase 2E exit gate.
Status: DONE

### [PH2A-FIX-003]
Origin Phase: Phase 2A Documentation Reconciliation
Item: Replace synthetic/fallback Audit UI records with truthful persisted audit data or an explicit unavailable/empty state.
Reason Deferred: The current Admin audit view derives fallback records from the architecture endpoint and fabricates current timestamps instead of reading a persistent audit source.
Target Phase: Phase 2D-2 — Admin Lab Builder & Persistent Admin Core
Priority: P1
Verification: The Audit UI reads authenticated persisted audit records, or clearly reports an unavailable/empty state, and never fabricates events or timestamps.
Implementation State: DONE. The Admin audit view reads authenticated persisted `AuditLog` records, displays a truthful empty state, and no longer fabricates events or timestamps. The Phase 2D consolidated verification and exit audit passed.
Status: DONE

### [PH2A-FIX-004]
Origin Phase: Phase 2A Documentation Reconciliation
Item: Remove or qualify hard-coded Evidence Vault verification claims such as `LAB CHECKS PASSED`.
Reason Deferred: Evidence status must be derived from implemented lab checks and genuine evidence records, or clearly labeled as representative UI.
Target Phase: Phase 7 — Real Lab & Simulation Engine
Priority: P1
Verification: Evidence Vault verification state is generated from implemented scenario checks and traceable evidence, or is explicitly presented as unverified/representative.
Implementation State: IMPLEMENTED PENDING EXIT. The generic project Evidence Vault no longer claims `LAB CHECKS PASSED`; it directs visitors to run scenario checks in the Lab, while the Phase 7 Scenario Runtime displays persisted active-scenario/recovery verification results. Dependency-complete verification remains required.
Status: OPEN

### [PH2A-FIX-005]
Origin Phase: Phase 2A Documentation Reconciliation
Item: Reconcile architecture endpoint claims with controls verified in the runtime.
Reason Deferred: The architecture blueprint currently describes controls and technology details, including rate limiting and CORS/CSRF protections, that are not verified in the active Express runtime.
Target Phase: Phase 9 — Production Security, Testing, Performance and Deployment
Priority: P1
Verification: Every architecture endpoint claim is backed by inspected runtime configuration and tests, or is clearly labeled as target/planned architecture.
Status: OPEN

### [PH2A-FIX-006]
Origin Phase: Phase 2A Documentation Reconciliation
Item: Align the Express listening port with validated environment configuration.
Reason Deferred: `server/config/env.ts` exposes `PORT`, but `server.ts` currently listens on hard-coded port `3000`.
Target Phase: Phase 9 — Production Security, Testing, Performance and Deployment
Priority: P1
Verification: Server startup uses the validated environment port, documents the default consistently, and passes local and deployment startup checks.
Implementation State: DONE. `server.ts` reads and validates `env.PORT`, and the Phase 2B dependency-complete build/startup verification passed.
Status: DONE


### [PH2C-DEFER-001]
Origin Phase: Phase 2C
Item: Replace process-local failed-login throttling if production is horizontally scaled across multiple Node instances.
Reason Deferred: The current cPanel/single-process deployment can use the implemented in-memory limiter, but a multi-instance production topology would require a shared limiter or edge/WAF control.
Target Phase: Phase 9 — Production Security, Testing, Performance and Deployment
Priority: P2
Verification: Production deployment architecture is reviewed; if multiple instances are used, login throttling is enforced through shared storage or an upstream gateway/WAF and covered by security tests.
Status: OPEN

### [PH3A-DEFER-001]
Origin Phase: Phase 3A — Core Networking Engine
Item: Complete the Networking operations path from persisted snapshots through operator context and future mutable scenario/CLI execution.
Reason Deferred: Phase 3B now implements recorded-state route lookup, health analysis, structured path/ACL assessment, `NETOPS/...` operator-context contracts, and scenario-ready definitions. A full device CLI emulator is intentionally not claimed, and scenario mutation/reset belongs to the shared engines rather than the Networking core.
Target Phase: Phase 6 / Phase 7
Priority: P1
Verification: The unified CLI consumes the same selected Lab/operator context; failure scenarios apply a session overlay consistently without rewriting canonical state; visual and CLI reads remain synchronized and resettable; scenario verification remains traceable.
Implementation State: IMPLEMENTED PENDING EXIT. Phase 3B provides recorded-state investigation, Phase 6 provides contextual CLI inspection, and Phase 7 adds session-scoped Networking mutation, active-scenario/recovery verification, remediation, and reset. Full executable/browser verification remains required.
Status: OPEN



### [PH3A-DEFER-002]
Origin Phase: Phase 3A — Core Networking Engine
Item: Implement a genuinely supported Packet Tracer ingestion/export workflow that can create canonical Lab records from an actual supported artifact format.
Reason Deferred: Phase 3A deliberately treats `.pkt` as reference metadata and renders from normalized persisted topology/configuration records. Arbitrary Packet Tracer binary parsing must not be claimed without a verified parser or companion exporter.
Target Phase: Phase 8 — Portfolio Orchestrator
Priority: P1
Verification: A documented supported importer/exporter derives `LabInput`, `LabNode`, `LabLink`, and normalized Networking state from a genuine artifact or companion manifest; unsupported `.pkt` files remain clearly reference-only and never produce fabricated parsed data.
Implementation State: OPEN. The canonical input contract and reference-only provenance remain implemented; Phase 3B does not add an unverified binary parser.
Status: OPEN

### [PH4B-DEFER-001]
Origin Phase: Phase 4B — Linux Investigation and Operations
Item: Complete the Linux operations path from recorded-state diagnostics through executable contextual CLI and mutable scenario remediation/reset.
Reason Deferred: Phase 4B intentionally provides health derivation, investigation findings, suggested commands, remediation guidance, `RHEL/...` context contracts, and scenario-ready definitions without spawning shells or mutating host state.
Target Phase: Phase 6 / Phase 7
Priority: P1
Verification: The unified CLI uses the same selected Lab/host context; Linux scenarios apply a session overlay consistently without rewriting canonical state; visual and CLI reads remain synchronized and resettable; scenario verification remains traceable.
Implementation State: IMPLEMENTED PENDING EXIT. Phase 4B provides recorded-state investigation, Phase 6 provides contextual CLI inspection, and Phase 7 adds whitelisted Linux simulation, active-scenario/recovery verification, remediation, and reset without spawning shell commands. Full executable/browser verification remains required.
Status: OPEN

### [PH5A-DEFER-001]
Origin Phase: Phase 5A — Core Dynamic DevOps Engine
Item: Complete the DevOps operations path from recorded delivery state through investigation, contextual CLI, and mutable scenario execution/reset.
Reason Deferred: Phase 5A intentionally provides a reusable recorded-state delivery model and UI without pretending to execute pipelines, Terraform, kubectl, Helm, ArgoCD, Cilium, or cloud APIs.
Target Phase: Phase 5B / Phase 6 / Phase 7
Priority: P1
Verification: Phase 5B derives evidence-backed delivery findings and `GITOPS/...` context from the same `devops.v1` state; Phase 6 executes only supported contextual inspection commands; Phase 7 applies and resets a session overlay consistently across UI and CLI while provider execution stays disabled.
Implementation State: IMPLEMENTED PENDING EXIT. Phase 5A provides the core model, Phase 5B recorded-state diagnostics, Phase 6 contextual CLI inspection, and Phase 7 whitelisted DevOps simulation with active-scenario/recovery verification, remediation, and reset. Full executable/browser verification remains required.
Status: OPEN
