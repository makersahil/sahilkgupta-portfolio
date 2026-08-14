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
Item: API and Service Migration to Prisma.
Reason Deferred: Phase 2A is strictly focused on persistence foundation. Switching all legacy database mock routes requires dedicated effort.
Target Phase: Phase 2B
Priority: P0
Verification: Legacy MockDatabaseService retired and all backend routes interact through Prisma.
Status: OPEN

### [PH2A-DEFER-002]
Origin Phase: Phase 2A
Item: Authentication Persistence & RBAC.
Reason Deferred: Need functional user login flows and safe admin bootstrap outside of seed.
Target Phase: Phase 2C
Priority: P0
Verification: Users can securely authenticate and admin roles are enforced via Prisma queries.
Status: OPEN

### [PH2A-DEFER-003]
Origin Phase: Phase 2A
Item: Admin CRUD Integration.
Reason Deferred: CMS needs to operate via authenticated routes over Prisma.
Target Phase: Phase 2D
Priority: P0
Verification: CMS UI successfully mutates data in PostgreSQL.
Status: OPEN

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
Target Phase: Phase 2E
Priority: P1
Verification: No runtime route imports legacy persistence and all regression tests pass using PostgreSQL.
Status: OPEN
