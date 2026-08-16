# Dynamic DevOps Engine Architecture

## Purpose

The Dynamic DevOps Engine turns published DevOps Labs into reusable, data-driven delivery workspaces. It is not a CI runner, cloud control plane, Kubernetes client, Terraform executor, or live observability gateway.

Phase 5 is split into two bounded layers:

- **Phase 5A — Core Dynamic DevOps Engine:** canonical `devops.v1` recorded state, multi-project/multi-Lab APIs, and optional-module delivery inspection.
- **Phase 5B — DevOps Investigation and Operations:** evidence-backed health derivation, investigation findings, remediation guidance, durable `GITOPS/...` context contracts, and non-mutating scenario readiness.

```text
Project
  -> 0..N DevOps Labs
      -> canonical Lab Manifest v1
      -> DevOpsLabAdapter
      -> devops.v1 recorded state
      -> DevOpsService
      -> DevOpsOperationsService
      -> /api/devops
      -> Delivery Control Plane UI
```

The reusable engine does not branch on the flagship project slug. A new READY DevOps Lab under a published DEVOPS project can use the same service and UI when its normalized state follows the supported contract.

## Phase 5A normalized state

`devops.v1` can represent only the modules a Lab actually contains:

- repository branch/revision metadata
- CI/CD pipelines and recorded stages
- Terraform/IaC files and recorded drift/plan status
- Kubernetes clusters and workload snapshots
- ArgoCD/GitOps reconciliation snapshots
- Helm release/package snapshots
- Cilium/network-policy observations
- observability snapshots
- architecture layers and recorded fixture notes
- runbook, evidence, scenarios, and input provenance inherited from the canonical Lab Manifest

A Terraform-only Lab does not automatically gain Kubernetes, ArgoCD, Helm, Cilium, observability, or pipeline data. The UI and operations engine evaluate represented modules rather than manufacturing missing subsystems.

## Phase 5B operations model

`DevOpsOperationsService` consumes the same public `devops.v1` state as the Delivery Inspector and produces `devops.operations.v1`.

```text
devops.v1
  -> capability/input-aware module selection
  -> health checks
  -> investigation findings
  -> suggested inspection commands / remediation guidance
  -> scenario readiness
  -> GITOPS operator context
```

Health status is derived only from persisted recorded evidence:

- `PASS` — represented evidence explicitly records a healthy/successful state.
- `WARN` — represented evidence records degradation, pending/running delivery, drift, under-ready workloads, or similar warning conditions.
- `FAIL` — represented evidence records a failed pipeline/stage, failed cluster/workload, degraded GitOps application, failed observation, or other explicit failure condition.
- `UNKNOWN` — the represented module exists but the available evidence is inconclusive.

Modules not represented by the Lab are omitted from health evaluation. This prevents a Terraform-only Lab from becoming `UNKNOWN` simply because it has no Kubernetes or ArgoCD input. If no supported operational evidence is represented at all, the operations result is `UNKNOWN` rather than healthy.

Overall status is conservative:

```text
any FAIL    -> CRITICAL
else WARN   -> DEGRADED
else UNKNOWN-> UNKNOWN
else        -> HEALTHY
```

## Investigation findings

Phase 5B can derive findings for recorded conditions such as:

- CI/CD pipeline or stage failure
- Terraform drift or plan/state error
- Kubernetes failed/degraded/under-ready workload
- ArgoCD out-of-sync or degraded application
- failed/degraded Helm release
- Cilium/network-policy record whose enforcement is not proven
- warning/failing observability signal

Findings contain recorded evidence, a related resource, suggested inspection commands/steps, and remediation guidance. They are diagnostic output only. The server does not spawn a shell or invoke provider CLIs.

## Operator contexts

Phase 5B publishes stable Lab/pipeline context metadata consumed by Phase 6:

```text
GITOPS/<LAB>
GITOPS/<LAB>/<PIPELINE>
```

Examples:

```text
GITOPS/GITOPS-K8S-CLUSTER>
GITOPS/GITOPS-K8S-CLUSTER/DELIVERY>
```

The context response advertises inspectable domains such as repository, pipelines, Terraform, Kubernetes, GitOps, Helm, network policy, observability, health, scenarios, and evidence. `executionAvailable` is always `false` in Phase 5B.

## Scenario readiness

Persisted enabled Lab scenarios are exposed as non-mutating contracts with observable signals. The canonical DevOps seed includes definitions for:

- `pipeline-failure`
- `terraform-drift`
- `kubernetes-rollout-failure`
- `argocd-drift`
- `canary-failure`
- `cilium-policy-regression`

Phase 5B does not apply declared mutations itself. Phase 7 consumes enabled definitions through the shared Scenario Engine and applies whitelisted mutations to a session-scoped clone of canonical state; canonical PostgreSQL Lab state remains unchanged.

## Public API

Core Phase 5A reads:

```text
GET /api/devops/labs
GET /api/devops/labs/:identifier
GET /api/devops/labs/:identifier/pipelines/:pipelineId
```

Phase 5B recorded-state operations:

```text
GET /api/devops/labs/:identifier/operations
GET /api/devops/labs/:identifier/context
GET /api/devops/labs/:identifier/context?pipelineId=<pipeline-id>
```

Public reads continue to require a READY Lab attached to a published DEVOPS project, consistent with the canonical Lab platform.

## Persistence and truthfulness boundary

The engine remains on the persistent application path:

```text
Express route
  -> DevOpsService / DevOpsOperationsService
  -> LabManifestService
  -> LabRepository
  -> PrismaLabRepository
  -> PostgreSQL
```

There is no memory fallback and no project-specific persistence path.

The canonical GitOps/Kubernetes/Terraform project is a recorded portfolio fixture. It is not live production telemetry. The browser does not replay a timer-driven pipeline or create automatic SUCCESS transitions. Missing metrics, cluster state, drift results, policy enforcement, logs, revisions, or health remain empty/unknown unless recorded evidence supports them.

Phase 5B never executes pipelines, `terraform`, `kubectl`, `helm`, `argocd`, Cilium tooling, cloud CLIs, or observability queries. Command strings are inspection guidance for a later executor, not claims that commands were run.

## Phase boundaries

- **Phase 5A:** reusable `devops.v1` recorded-state model and Delivery Inspector.
- **Phase 5B:** recorded-state investigation, health, remediation guidance, `GITOPS/...` contexts, and scenario readiness.
- **Phase 6:** implemented unified contextual CLI over supported recorded-state inspectors and familiar read aliases.
- **Phase 7:** implemented session-scoped scenario mutation, remediation, active-scenario/recovery verification, and reset with provider execution disabled.
- **Phase 8/9:** broader artifact orchestration/import/storage and production hardening where appropriate.
