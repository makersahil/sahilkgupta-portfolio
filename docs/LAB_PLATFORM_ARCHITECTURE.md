# Canonical Lab Platform

This document defines the durable data and API contract used by the portfolio's interactive infrastructure labs. It is product architecture, not a phase checklist.

## Relationship model

```text
Project
  -> 0..N Labs
      -> 0..N standardized LabInputs
      -> normalized state
      -> 0..N LabNodes / LabLinks
      -> 0..N LabScenarios
      -> 0..N LabRunbookSteps
      -> 0..N Evidence records
      -> 0..N Artifact metadata records
```

A Project owns the canonical domain (`NETWORKING`, `LINUX`, or `DEVOPS`). Every Lab must match its Project domain. A Project may own multiple Labs. Lab rendering and future domain engines must consume persisted normalized data rather than branch on flagship project names or slugs.

## Lab Manifest v1

`GET /api/labs/:identifier/manifest` returns the public canonical view for a READY lab whose Project is published. `GET /api/labs/admin/:identifier/manifest` provides the same public-shaped manifest for authenticated ADMIN/SUPER_ADMIN preview, including DRAFT labs.

Manifest v1 contains:

- lab identity, domain, kind, capabilities, and publication state;
- Project identity;
- safe input descriptors;
- normalized state;
- topology nodes and links;
- enabled scenarios;
- lab-level runbook steps;
- public evidence only;
- public artifact summaries only.

Raw inline LabInput payloads and raw external input URLs are deliberately not returned by the public-shaped manifest. Artifact storage keys are never part of the manifest contract.

## Standardized input registry

Input types are application-level contracts rather than database enums so supported types can evolve without a migration for every new adapter.

### Networking

- `PACKET_TRACER`
- `NETWORK_TOPOLOGY`
- `DEVICE_CONFIG`
- `ROUTING_SNAPSHOT`
- `PCAP_REFERENCE`

`PACKET_TRACER` is a reference/input contract. The application does not claim that arbitrary `.pkt` binaries are parsed.

### Linux

- `SYSTEM_SNAPSHOT`
- `SYSTEMD_UNIT`
- `FSTAB`
- `STORAGE_SNAPSHOT`
- `SELINUX_AUDIT`
- `JOURNAL_EXTRACT`
- `NETWORK_CONFIG`
- `ANSIBLE`
- `CONFIG_BUNDLE`

### DevOps

- `GIT_REPOSITORY`
- `CI_PIPELINE`
- `TERRAFORM`
- `KUBERNETES_MANIFEST`
- `HELM`
- `ARGOCD`
- `CILIUM_POLICY`
- `OBSERVABILITY_SNAPSHOT`

## Input source kinds

- `INLINE`: normalized JSON stored with the LabInput.
- `EXTERNAL`: validated HTTP(S) reference. Public manifests expose only that an external reference exists, not the raw URL.
- `ARTIFACT_REFERENCE`: points to a real Artifact record belonging to the same Lab or Project. This does not create or pretend to create file storage.

## APIs

Public:

- `GET /api/labs`
- `GET /api/labs/:identifier`
- `GET /api/labs/:identifier/manifest`
- `GET /api/labs/registry/:domain`

ADMIN/SUPER_ADMIN:

- Lab list/detail/create/update/delete
- LabInput create/update/delete
- topology replacement as one coherent node/link state update
- LabScenario create/update/delete
- LabRunbookStep create/update/delete
- Evidence metadata create/update/delete
- manifest preview

The Lab platform is Prisma/PostgreSQL-native. There is no parallel legacy Lab adapter.

## Publication and truthfulness rules

- Public Lab APIs expose only `READY` labs attached to `PUBLISHED` Projects.
- Public manifest evidence is restricted to `isPublic=true`.
- Disabled scenarios are omitted from public manifests.
- No API fabricates artifacts, hashes, parsing results, verification results, or runtime state.
- Compatibility fixtures are normalized seed snapshots only; they are not presented as live measurements.

## Durable regression coverage

- `npm run test:labs:static`
- `npm run test:labs`
- `npm run test:labs:manifest`
- `npm run test:labs:http`

These names are intentionally phase-independent because the checks remain useful for later Networking, Linux, DevOps, CLI, scenario, and Admin work.

## Admin orchestration

The authenticated Lab Builder is a configuration surface over the same canonical Lab repository/service APIs used by the platform. It does not maintain a second client-only Lab model.

ADMIN/SUPER_ADMIN can configure Project-linked Labs, standardized inputs, normalized state, topology, scenarios, runbooks, evidence metadata, and preview the canonical Manifest v1 before publication. Admin mutations are recorded in the persisted `AuditLog` service. See `docs/ADMIN_ORCHESTRATOR.md`.

## Consolidated verification

Routine regression validation is available through one durable command:

```bash
npm run verify
```

Individual Lab scripts remain available for targeted diagnosis after a failing consolidated step.
