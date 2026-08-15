# Deferred Implementation Register

## Open Items

### [PH1-DEFER-001]
Origin Phase: Phase 1
Item: Remaining hard-coded/representative terminal outputs that may look like measured runtime values.
Reason Deferred: CLI output must come from lab state or be clearly marked representative/simulated; requires context-aware backend functionality.
Target Phase: Phase 6 — Context-Aware CLI
Priority: P1
Verification: All CLI output must come from lab state or be clearly marked representative/simulated.
Status: OPEN

### [PH1-DEFER-002]
Origin Phase: Phase 1
Item: Remaining RHCSA/Linux verified/compliant counters or hard-coded check totals.
Reason Deferred: Status must be generated from actual implemented lab checks in future phases.
Target Phase: Phase 4 — Linux Systems Console / Phase 7 Scenario Verification
Priority: P1
Verification: Verification status must be generated from actual implemented lab checks.
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
Implementation State: IMPLEMENTED / AWAITING EXIT VALIDATION. `MockDatabaseService`, legacy repositories, legacy regression mode, synthetic Packet Tracer parser attachment, and fake architecture telemetry are removed. Media reference metadata uses `Artifact`, system metrics use PostgreSQL counts, and a dedicated persistent-runtime regression suite is included.
Status: OPEN

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
