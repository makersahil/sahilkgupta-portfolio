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
- Domain engines may inspect and reason over persisted normalized state, but must not imply live infrastructure execution. Networking, Linux, DevOps, and the Phase 6 unified recorded-state CLI are implemented. The CLI executes portfolio inspection commands only; it must never spawn shells/provider binaries. Phase 7 owns shared mutable scenario execution/reset.
- Preserve one Project -> many Labs -> many Inputs/Scenarios/RunbookSteps/Evidence as the platform relationship model.


## Linux recorded-state operations invariants

- Treat `linux.v1` as recorded normalized Lab state, not live RHEL telemetry. Missing state stays UNKNOWN/empty instead of becoming a fabricated pass.
- Health findings and remediation guidance must cite persisted state and use `RECORDED_STATE_DIAGNOSTIC`; never claim a suggested command was executed.
- Do not disable SELinux as generic remediation. Prefer evidence-driven context/boolean/policy guidance.
- `RHEL/...` contexts are consumed by the Phase 6 unified recorded-state CLI; no shell/process execution is implied.
- Linux scenario definitions may describe future mutations, but Phase 4B must not mutate, remediate, or reset Lab state.

## DevOps recorded-state engine invariants

- Treat `devops.v1` as persisted recorded Lab state, not live CI/CD, cloud, Terraform, Kubernetes, ArgoCD, Helm, Cilium, or observability telemetry.
- Render only modules represented by the selected Lab. Do not add Kubernetes/GitOps views to a Terraform-only Lab by assumption.
- Do not reintroduce browser timer-based fake pipeline execution or automatic SUCCESS transitions.
- Recorded project-fixture values must remain identifiable as recorded state; missing health, metrics, revisions, workloads, logs, policies, or rollouts stay unknown/empty.
- Phase 5A owns the read-only `devops.v1` domain model and explorer. Phase 5B owns recorded-state diagnostics, `GITOPS/...` context, remediation guidance, and non-mutating scenario readiness. Phase 6 owns the unified read-only recorded-state CLI. Phase 7 owns shared mutable scenario execution/reset.


## Unified CLI invariants

- `UnifiedCliService` is read-only and must derive output from persisted normalized Lab state or explicit CLI metadata.
- Never import `child_process`, SSH/shell runners, or provider command executors into the portfolio CLI.
- Never fabricate ping/traceroute latency, uptime, process metrics, deployment success, benchmark results, or provider output.
- Familiar commands (`cisco`, `systemctl`, `kubectl`, `terraform`, etc.) may only act as aliases to recorded-state inspectors and must clearly preserve the non-executing boundary.
- `scenario list` is read-only in Phase 6. Scenario run/remediation/verification/reset belongs to Phase 7.
- Context resolution must remain data-driven; do not hard-code flagship Lab slugs in the CLI.
