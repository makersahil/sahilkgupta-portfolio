# Dynamic Linux Engine Architecture

## Purpose

Phase 4 turns the Linux workspace into a reusable, data-driven RHEL operations experience. Public Linux workspaces are derived from persisted canonical Lab Manifest data rather than project-specific React markup.

The **multi-project requirement** is explicit: the engine supports multiple Linux projects and multiple Labs per project. Adding another supported RHEL/Linux Lab should normally require persisted Lab data and standardized inputs, not another custom frontend page.

## Runtime flow

```text
Published Linux Project
  -> READY LINUX_SYSTEM Lab
    -> Canonical Lab Manifest v1
      -> LinuxLabAdapter
        -> linux.v1 state
          -> LinuxService
            -> LinuxOperationsService
              -> /api/linux/labs/*
                -> LinuxLabExplorer / LinuxOperationsPanel
```

Routes and React components do not access Prisma directly. Both core inspection and operations consume the same normalized Lab state.

## linux.v1 host model

Each Linux Lab may contain one or more normalized hosts. The model supports:

- host identity, RHEL release, kernel, architecture, boot target, and recorded host state
- systemd service/unit snapshots
- block-device, LVM, filesystem, mount, and `/etc/fstab` state
- SELinux mode, policy, booleans, ports, and contexts
- NetworkManager/interface, address, route, gateway, and DNS state
- recorded journal/log extracts when supplied
- configuration snapshots
- verification records
- provenance and standardized input descriptors

The canonical seed normalizes the existing **RHEL 9.4** project fixture into this model.

## Phase 4B recorded-state operations

`LinuxOperationsService` adds an investigation layer over `linux.v1`. It derives health checks and diagnostic findings from persisted state only. It covers:

- failed or unexpectedly inactive systemd services
- explicit degraded/unmounted storage and LVM state
- `/etc/fstab` versus recorded mount alignment when both snapshots exist
- SELinux mode drift and recorded AVC denial correlation
- recorded interface-down/default-route conditions
- warning/error signals from recorded journal/log extracts
- evidence-linked suggested inspection commands and remediation guidance

Every finding is labeled `RECORDED_STATE_DIAGNOSTIC`. Suggested commands are guidance text; the service does not spawn a shell, SSH to a host, apply configuration, restart services, mount filesystems, change SELinux policy, or claim remediation success.

## Health model

Phase 4B health uses explicit recorded values and deliberately preserves unknown state. Checks are classified as:

```text
PASS
WARN
FAIL
UNKNOWN
```

The Lab/host operations summary becomes `HEALTHY`, `DEGRADED`, `CRITICAL`, or `UNKNOWN` based on those checks. Missing optional data is not silently converted into a passing result.

## Operator context

The engine exposes durable Lab/host context metadata. Phase 6 canonicalizes it into CLI contexts such as:

```text
RHEL/RHEL9-HARDENING-ENVIRONMENT/RHEL9-LAB-01>
```

The Phase 4B context API itself remains a recorded-state contract. Phase 6 consumes the same Lab/host metadata through the unified CLI; arbitrary shell execution remains disabled. Phase 7 session overlays are resolved by the Linux service before operations/CLI inspection.

## Scenario-ready contracts

Phase 4B surfaces persisted Lab scenario definitions without mutating them. The canonical Linux seed provides scenario-ready contracts for:

- systemd service failure
- SELinux denial investigation
- persistent mount failure
- network interface loss

Each scenario exposes expected observable signals. The Phase 4B operations view remains non-executing, while Phase 7 consumes enabled definitions through the shared session runtime for whitelisted mutation, active-scenario/recovery verification, remediation, and reset.

## Standardized Linux inputs

The existing Lab input registry remains the contract for supported Linux inputs:

- `SYSTEM_SNAPSHOT`
- `SYSTEMD_UNIT`
- `FSTAB`
- `STORAGE_SNAPSHOT`
- `SELINUX_AUDIT`
- `JOURNAL_EXTRACT`
- `NETWORK_CONFIG`
- `ANSIBLE`
- `CONFIG_BUNDLE`

The engine consumes normalized state produced from these contracts. It does not claim arbitrary parsing of every Linux bundle format.

## Public API

```text
GET /api/linux/labs
GET /api/linux/labs/:identifier
GET /api/linux/labs/:identifier/hosts/:hostKey
GET /api/linux/labs/:identifier/operations?hostKey=:hostKey
GET /api/linux/labs/:identifier/context?hostKey=:hostKey
```

Only READY Linux Labs belonging to published projects are exposed through the public Linux engine.

## Truthfulness boundary

Phase 4 renders and reasons about **recorded state**. It is not a live SSH agent, a systemd emulator, or production telemetry collector.

When data is absent, the engine returns empty/unknown state and says so. It does not invent:

- CPU or memory utilization
- live process/service state
- current journal entries
- live filesystem pressure
- measured compliance percentages
- host/network reachability
- remediation success

## Phase boundaries

Phase 4A provides the normalized host model and dynamic inspection workspace.

Phase 4B provides recorded-state health analysis, investigation findings, remediation guidance, RHEL operator-context contracts, and scenario-ready definitions.

Phase 6 provides the unified contextual CLI over Linux state. Phase 7 adds session-scoped scenario overlays that are visible to both the Linux workspace and CLI without spawning a shell or rewriting canonical state.
