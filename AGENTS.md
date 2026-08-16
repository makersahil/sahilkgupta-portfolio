# Repository Engineering Rules

## Source of truth
Git is the source of truth. Never destroy or rewrite working functionality without explicit justification.

## Existing UI
Preserve the existing cyber-terminal visual design unless the task explicitly requests visual changes.

Never remove existing public content while performing backend migrations.

## Scope
Work on only the requested phase or sub-phase.

Do not implement later phases early unless required to prevent a blocker.

## Existing functionality
Before modifying an API, component, schema field, route, or service:
1. Find its consumers.
2. Understand its existing contract.
3. Preserve compatible behavior unless explicitly instructed otherwise.

## Truthfulness
Never invent:
- metrics
- benchmarks
- uptime
- compliance status
- hashes
- artifact files
- URLs
- repositories
- production infrastructure
- verification results
- credentials

## Database
PostgreSQL + Prisma is the persistence architecture.

Prisma/PostgreSQL is the only supported runtime persistence path. Never reintroduce mock/in-memory fallback behavior.

Never edit an already-applied migration without determining migration state.

Before destructive schema changes, explicitly identify data loss risk.

## Security
Never hard-code:
- passwords
- JWT secrets
- database credentials
- API keys

Persistent/admin mutation endpoints must be authenticated.

Browser authentication uses the HttpOnly `infra_auth_token` cookie. Do not reintroduce auth-token storage in `localStorage`.

Protected requests must authorize from the current persisted User/AuthSession state, not a stale JWT role claim.

Normal portfolio seed data must not create default administrator credentials. Use the explicit `auth:bootstrap-admin` workflow.

Public simulation endpoints may remain public when they do not alter persistent state.

## Quality gate
After meaningful implementation, prefer the consolidated durable verifier:

npm run verify

For a fast DB-free check use `npm run verify:quick`; for DB-backed regressions without rebuilding use `npm run verify:tests`.

When a change introduces a new migration or changes baseline seed data, apply/review those explicitly before `npm run verify`; the verifier must not auto-deploy migrations or mutate migration history.

Keep durable regression scripts phase-neutral when they remain useful after a phase (for example `test:content:*`, `test:api-client`, `test:auth*`, `test:labs*`, `test:admin*`, and `test:runtime:*`). Do not rename or rewrite applied Prisma migration directories merely to remove phase-specific names.

## Regression rule
After backend changes verify:
- projects still appear
- featured domain blueprints still appear
- learning tracks still appear
- skills still appear
- blogs still appear
- domain filtering still works

An empty page caused by a persistence migration is a regression.

## Deferred work
Read:

docs/DEFERRED_IMPLEMENTATION_REGISTER.md

before every phase.

Never delete an OPEN deferred item.

Mark it DONE only after implementation and verification.

## Git
Never work directly on main.

One sub-phase per branch.

Before finishing:
1. inspect git diff
2. run validation
3. report files changed
4. report tests run
5. report unresolved issues

If a requirement conflicts with repository state, stop and explain instead of guessing.
## Canonical lab platform invariants

- Treat `Project.domain` as canonical. A Lab must match the domain of its Project; never infer domain from a project title or slug.
- Keep Lab rendering data-driven. Do not add project-name or flagship-slug checks to reusable Lab services, manifests, future renderers, or scenario engines.
- Validate LabInput types through the domain input registry. Do not turn every input type into a database enum.
- Public Lab reads require `Lab.status=READY` and a published Project. Public manifests expose only public evidence and safe artifact summaries.
- Public-shaped manifests describe input availability but do not expose raw inline LabInput payloads, raw external input URLs, or internal artifact storage keys.
- Never claim arbitrary Packet Tracer/PCAP/config parsing unless a real adapter exists and is tested. Reference/normalized fixture metadata must be labeled truthfully.
- Domain engines may inspect and reason over persisted normalized state, but must not imply live infrastructure execution. Networking, Linux, DevOps, the Phase 6 unified CLI, and the Phase 7 session-scoped Scenario Engine are implemented. The CLI and Scenario Engine must never spawn shells/provider binaries or claim external infrastructure execution.
- Preserve one Project -> many Labs -> many Inputs/Scenarios/RunbookSteps/Evidence as the platform relationship model.


## Linux recorded-state operations invariants

- Treat `linux.v1` as recorded normalized Lab state, not live RHEL telemetry. Missing state stays UNKNOWN/empty instead of becoming a fabricated pass.
- Health findings and remediation guidance must cite persisted state and use `RECORDED_STATE_DIAGNOSTIC`; never claim a suggested command was executed.
- Do not disable SELinux as generic remediation. Prefer evidence-driven context/boolean/policy guidance.
- `RHEL/...` contexts are consumed by the Phase 6 unified recorded-state CLI; no shell/process execution is implied.
- Linux scenario definitions may be consumed by the Phase 7 session overlay only through the safe mutation whitelist. Never write a scenario fault into canonical `Lab.normalizedState` or execute the suggested shell commands.

## DevOps recorded-state engine invariants

- Treat `devops.v1` as persisted recorded Lab state, not live CI/CD, cloud, Terraform, Kubernetes, ArgoCD, Helm, Cilium, or observability telemetry.
- Render only modules represented by the selected Lab. Do not add Kubernetes/GitOps views to a Terraform-only Lab by assumption.
- Do not reintroduce browser timer-based fake pipeline execution or automatic SUCCESS transitions.
- Recorded project-fixture values must remain identifiable as recorded state; missing health, metrics, revisions, workloads, logs, policies, or rollouts stay unknown/empty.
- Phase 5A owns the `devops.v1` domain model and explorer. Phase 5B owns recorded-state diagnostics, `GITOPS/...` context, and remediation guidance. Phase 6 owns the unified contextual CLI. Phase 7 may overlay only whitelisted scenario mutations for the selected browser session; provider execution remains prohibited.


## Unified CLI invariants

- `UnifiedCliService` derives output from canonical normalized Lab state, an optional Phase 7 session scenario overlay, or explicit CLI metadata. It must never mutate canonical Lab state.
- Never import `child_process`, SSH/shell runners, or provider command executors into the portfolio CLI.
- Never fabricate ping/traceroute latency, uptime, process metrics, deployment success, benchmark results, or provider output.
- Familiar commands (`cisco`, `systemctl`, `kubectl`, `terraform`, etc.) may only act as aliases to recorded-state inspectors and must clearly preserve the non-executing boundary.
- `scenario list/status/run/verify/remediate/reset` may call the Phase 7 Scenario Engine. Those commands mutate only `LabScenarioRuntime` session metadata/overlay state, never external infrastructure or canonical Lab state.
- Context resolution must remain data-driven; do not hard-code flagship Lab slugs in the CLI.


## Phase 7 Scenario Engine invariants

- `Lab.normalizedState` is the immutable canonical baseline. Never store injected scenario faults back into that field.
- A runtime is scoped by opaque `sessionKey + labId`. `X-Lab-Session` selects a simulation session; it is not authentication or authorization.
- The client sends a scenario slug only. Load the persisted `LabScenario.actions` server-side; never accept arbitrary client mutation objects for execution.
- Apply only explicitly whitelisted mutation types in `scenario-mutators.ts`. Unknown action types must fail validation.
- Apply an ACTIVE runtime to a fresh cloned baseline on each read so visual workspaces, operations APIs, and CLI resolve the same session state.
- `REMEDIATED` and `VERIFIED` runtimes must resolve to the canonical baseline. `reset` deletes the runtime; it does not need to restore canonical state because canonical state was never changed.
- Scenario verification may assert the injected recorded-state condition and the recovery boundary. It must not claim an external command succeeded.
- Never import `child_process`, SSH clients, network/device executors, Kubernetes/cloud provider clients, or arbitrary evaluation into the Scenario Engine.
- If a stored runtime action no longer matches the canonical Lab model, fail safe to the canonical baseline with a warning; do not corrupt public Lab reads.
- Keep scenario behavior data-driven across projects/Labs. Do not branch on flagship project names or slugs inside the reusable engine.
- Scenario runtimes have a basic 24-hour opportunistic retention cleanup on new scenario starts. Stronger distributed abuse controls, quotas, and scheduled cleanup remain Phase 9 deployment hardening.

## Phase 8 Portfolio Orchestrator invariants

- `AdminOrchestrator` is the single writable Project/Lab control surface. Do not restore a competing legacy Project/Lab editor.
- All Orchestrator routes require persisted ADMIN or SUPER_ADMIN authorization; permanent deletion is SUPER_ADMIN-only.
- New Projects and Labs are always DRAFT. Only validated Orchestrator workflows may set `Project.status=PUBLISHED` or `Lab.status=READY`.
- Every orchestrator-managed Project/Lab write uses the expected revision. A stale revision is a 409 conflict, never a last-write-wins overwrite.
- Canonical input, topology, scenario, normalized-state, and artifact-association edits must reject active Phase 7 runtimes until an Admin explicitly resets them.
- Validation and preview are side-effect-free and reuse the existing Lab Manifest, domain adapters, scenario mutators, and public mappers.
- Import accepts bounded versioned JSON only, never executes/fetches imported content, and always persists DRAFT state transactionally.
- Export excludes users, sessions, audit rows, scenario runtimes, credentials, storage keys, environment values, and unsupported claims about stored bytes or verified hashes.
- Packet Tracer companion JSON is supported as a canonical data format; arbitrary `.pkt` binary parsing remains unsupported and reference-only.
- `PH2A-DEFER-004` remains OPEN unless genuine byte storage, calculated hashes, retrieval, deletion, and access control are implemented and verified.
