# Dynamic DevOps Engine Architecture

## Phase 5A scope

Phase 5A replaces the static DevOps pipeline visualizer with a reusable, multi-project and multi-Lab engine driven by canonical Lab Manifest v1 data and normalized `devops.v1` state.

```text
Project
  -> 0..N DevOps Labs
      -> canonical Lab Manifest v1
      -> DevOpsLabAdapter
      -> devops.v1 recorded state
      -> DevOpsService
      -> /api/devops
      -> Delivery Control Plane UI
```

The reusable engine does not branch on the flagship project slug. A new READY DevOps Lab under a published DEVOPS project can render through the same service and UI when its normalized state follows the supported contract.

## Normalized state

`devops.v1` can represent only the modules that a Lab actually contains:

- repository branch/revision metadata
- CI/CD pipelines and recorded stages
- Terraform/IaC file snapshots
- Kubernetes clusters and workload snapshots
- ArgoCD/GitOps reconciliation snapshots
- Helm release/package snapshots
- Cilium/network-policy observations
- observability snapshots
- architecture layers and recorded fixture notes

Missing modules stay empty and are not invented. A Terraform-only Lab does not automatically gain Kubernetes, ArgoCD, Helm, Cilium, or observability state.

## Truthfulness boundary

Phase 5A is a recorded-state explorer. It does not run pipelines, Terraform, kubectl, Helm, ArgoCD, Cilium, or cloud APIs. Recorded project-fixture values are labeled as recorded state and are not presented as live production telemetry. Missing metrics, cluster state, logs, rollouts, health, and policy data remain unknown/empty instead of becoming synthetic success values.

The old browser-side fake pipeline replay has been removed. Pipeline stages render from persisted normalized state and no `setTimeout`-driven success sequence is used.

## Canonical seed

The existing GitOps/Kubernetes/Terraform project fixture is normalized into `devops.v1` and split into domain inputs such as `CI_PIPELINE`, `TERRAFORM`, `KUBERNETES_MANIFEST`, `HELM`, `ARGOCD`, `CILIUM_POLICY`, and `OBSERVABILITY_SNAPSHOT` when supporting recorded data exists.

This does not claim live cluster access. The canonical seed is a reproducible recorded project fixture.

## Public API

```text
GET /api/devops/labs
GET /api/devops/labs/:identifier
GET /api/devops/labs/:identifier/pipelines/:pipelineId
```

Public reads require a READY Lab connected to a published DEVOPS project, consistent with the canonical Lab platform.

## Phase 5B boundary

Phase 5B adds recorded-state DevOps investigation and operations: pipeline failure reasoning, Terraform drift/state investigation, Kubernetes workload/rollout health, ArgoCD drift, Helm/Cilium inspection, observability correlation, remediation guidance, `GITOPS/...` operator contexts, and scenario-ready definitions.

Phase 6 owns unified contextual CLI execution. Phase 7 owns shared mutable scenario run/remediation/reset behavior.
