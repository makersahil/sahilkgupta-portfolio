# Phase 7 — Session-Scoped Scenario Engine

## Purpose

Phase 7 turns persisted Lab scenario definitions into an interactive scenario/investigation lifecycle without turning the portfolio into a remote infrastructure executor.

The engine supports the three existing normalized domain states:

- `networking.v1`
- `linux.v1`
- `devops.v1`

A visitor can start a supported scenario, inspect the resulting state or selected investigation through the visual workspace and Unified CLI, verify the active scenario contract, remediate back to the canonical baseline when applicable, verify recovery, and reset the session runtime.

## Truthfulness and safety boundary

The Scenario Engine is a **portfolio simulation runtime**.

It does not:

- SSH to a host or network device
- spawn a shell or provider process
- send packets
- run IOS commands
- run `systemctl`, `kubectl`, Terraform, Helm, ArgoCD, Cilium, or cloud APIs
- rewrite `Lab.normalizedState`
- claim live production telemetry

The canonical PostgreSQL Lab record remains the immutable baseline. Scenario state is a per-browser-session overlay derived from a persisted scenario definition.

## Runtime data model

Phase 7 adds `LabScenarioRuntime`.

```text
Lab
  ├─ normalizedState             canonical recorded baseline
  ├─ LabScenario[]               persisted scenario definitions
  └─ LabScenarioRuntime[]        session-scoped runtime metadata

LabScenarioRuntime
  sessionKey + labId             unique runtime scope
  scenarioId                     selected persisted scenario
  status                         ACTIVE | REMEDIATED | VERIFIED
  appliedActions                 server-side snapshot of scenario actions
  verification                   last verification result
  startedAt / remediatedAt / verifiedAt
```

The browser sends an opaque `X-Lab-Session` identifier. It is not authentication or authorization. It only selects the visitor's simulation overlay.

## State resolution

Every domain read follows this rule:

```text
canonical Lab state
  -> domain adapter/service
  -> normalized domain state
  -> ScenarioStateService
       no session / no ACTIVE runtime -> baseline unchanged
       ACTIVE runtime                 -> safe overlay on cloned baseline
  -> workspace / operations / CLI
```

The overlay is reapplied to a fresh baseline on each read. It is never written back into the canonical Lab state.

If a stored overlay no longer matches the current canonical Lab model, the public read fails safe to the canonical baseline and emits a warning instructing the user to reset/re-run the scenario.

## Lifecycle

### 1. Run

`POST /api/scenarios/labs/:identifier/run`

The client sends only a `scenarioSlug`. The server loads the persisted scenario and validates its stored action contract against the current canonical state before creating the runtime. The `sessionKey + labId` uniqueness constraint is enforced with atomic create semantics so concurrent starts cannot overwrite an existing runtime.

Status becomes `ACTIVE`.

### 2. Observe and troubleshoot

While `ACTIVE`, Networking/Linux/DevOps state reads, operations endpoints, and Unified CLI reads use the same session overlay.

This keeps visual state and CLI state synchronized.

### 3. Verify active scenario state

`POST /api/scenarios/labs/:identifier/verify`

For an `ACTIVE` runtime, the verifier checks the session state against the whitelisted mutation/selection contract. Results are persisted as `SCENARIO_STATE` verification output.

### 4. Remediate

`POST /api/scenarios/labs/:identifier/remediate`

Remediation deliberately does not execute a suggested shell/provider command. It changes the runtime status to `REMEDIATED`, which disables the overlay. The next state read resolves directly to the canonical baseline.

### 5. Verify recovery

Calling `/verify` after remediation checks that the session overlay is disabled and the state source is again the canonical recorded baseline. A passing recovery moves the runtime to `VERIFIED`.

### 6. Reset

`DELETE /api/scenarios/labs/:identifier/runtime`

Reset deletes the session runtime for that Lab. Canonical Lab state is unaffected because it was never modified.

## Safe mutation whitelist

The browser cannot submit arbitrary mutation instructions. Only persisted Admin-managed `LabScenario.actions` are loaded server-side, and each mutation type is explicitly whitelisted.

### Networking

- `SET_LINK_STATUS`
- `SET_OSPF_NEIGHBOR_STATE`
- `SET_DEVICE_STATUS`
- `SELECT_ACL_OBSERVATION`

Derived state may conservatively mark related recorded neighbor/gateway health as degraded/down when the direct mutation makes that conclusion deterministic.

### Linux

- `SET_SERVICE_STATE`
- `ADD_RECORDED_AVC_DENIAL`
- `SET_MOUNT_STATE`
- `SET_INTERFACE_STATE`

These modify only the cloned `linux.v1` snapshot for the session. No unit restart, mount operation, SELinux policy change, or network command is executed.

### DevOps

- `SET_PIPELINE_STAGE_STATUS`
- `SET_TERRAFORM_DRIFT_STATUS`
- `SET_WORKLOAD_READINESS`
- `SET_GITOPS_SYNC_STATUS`
- `SET_OBSERVATION_STATUS`
- `SET_NETWORK_POLICY_STATUS`

These modify only the cloned `devops.v1` snapshot. Workload, GitOps application, observability, and network-policy mutations require explicit persisted-record selectors; missing selectors fail closed instead of mutating the first record. No CI runner, Terraform provider, Kubernetes API, ArgoCD API, Helm command, or Cilium command is invoked.

Unknown mutation types fail validation.

## HTTP API

```text
GET    /api/scenarios/labs/:identifier
POST   /api/scenarios/labs/:identifier/run
POST   /api/scenarios/labs/:identifier/verify
POST   /api/scenarios/labs/:identifier/remediate
DELETE /api/scenarios/labs/:identifier/runtime
```

Mutation endpoints require `X-Lab-Session`. The public overview may be read without it, in which case no session runtime is selected.

## Runtime retention and abuse boundary

Phase 7 performs opportunistic cleanup of scenario runtime rows that have not been updated for 24 hours whenever a new scenario is started. This bounds normal stale-session accumulation without turning the portfolio into an infrastructure scheduler. `X-Lab-Session` remains an opaque simulation selector, not authentication. Distributed rate limiting, per-IP quotas, scheduled cleanup, and multi-instance abuse controls remain Phase 9 production hardening.

## Unified CLI integration

The Phase 6 CLI remains the single context-aware command interpreter. Phase 7 adds session lifecycle commands:

```text
scenario list
scenario status
scenario run <slug>
scenario verify
scenario remediate
scenario reset
```

When a runtime is active, the CLI context reports `SCENARIO_RUNTIME`; otherwise it reports `RECORDED_STATE`.

The CLI still blocks external execution. Familiar commands such as `systemctl`, `kubectl`, or `terraform` remain read aliases only where supported.

## Browser UI

`ScenarioControlPanel` appears in the Networking, Linux, and DevOps Lab explorers.

The same browser tab keeps its opaque Lab session identifier in `sessionStorage`, so an active runtime survives a page refresh. A separate browser session sees the canonical baseline unless it starts its own runtime.

## Verification coverage

Phase 7 adds:

- `test:scenarios:static`
- `test:scenarios`
- `test:scenarios:http`

The regression suite checks:

- runtime persistence and lifecycle
- session isolation
- canonical state immutability
- active-scenario verification
- remediation/recovery verification
- synchronized domain reads, including operational Networking topology rules
- deterministic DevOps mutation targeting
- concurrent scenario-start conflict handling
- CLI lifecycle integration
- no shell/provider execution boundary

The root `npm run verify` includes these checks.

## Intentional limitations

Phase 7 is not a real infrastructure executor. It does not provide multi-user collaboration, background scenario scheduling, arbitrary mutation code, or managed artifact byte storage.

Runtime expiration/cleanup policy can be tightened during production hardening if deployment traffic warrants it. The Phase 7 database model is intentionally small and session-scoped so a future cleanup job can remove stale rows without affecting canonical Labs.
