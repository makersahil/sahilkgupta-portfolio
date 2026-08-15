# Dynamic Linux Engine Architecture

## Purpose

Phase 4A replaces the fixed Linux showcase with a reusable, data-driven Linux Lab engine. Public Linux workspaces are derived from persisted canonical Lab Manifest data rather than project-specific React markup.

The **multi-project requirement** is explicit: the engine is designed for multiple Linux projects and multiple Labs per project. Adding another supported RHEL/Linux Lab should normally require persisted Lab data and standardized inputs, not another custom frontend page.

## Runtime flow

```text
Published Linux Project
  -> READY LINUX_SYSTEM Lab
    -> Canonical Lab Manifest v1
      -> LinuxLabAdapter
        -> linux.v1 state
          -> LinuxService
            -> /api/linux/labs/*
              -> LinuxLabExplorer
```

The adapter consumes:

- `Lab.normalizedState`
- `LabNode` host records
- Lab input descriptors
- runbook steps
- public evidence
- scenario definitions when present

The engine does not read Prisma directly from routes or React components.

## linux.v1 host model

Each Linux Lab may contain one or more normalized hosts. The Phase 4A model supports:

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

## Truthfulness boundary

Phase 4A renders **recorded state**. It is not a live SSH agent, a systemd emulator, or production telemetry collector.

When an input is absent, the engine returns an empty/unknown state and the UI says so. It does not invent:

- CPU or memory utilization
- live process/service state
- current journal entries
- live mount health
- measured compliance percentages
- host reachability
- remediation success

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

Phase 4A consumes normalized state produced from these contracts. It does not claim arbitrary parsing of every Linux bundle format.

## Public API

```text
GET /api/linux/labs
GET /api/linux/labs/:identifier
GET /api/linux/labs/:identifier/hosts/:hostKey
```

Only READY Linux Labs belonging to published projects are exposed through the public Linux engine.

## Phase boundaries

Phase 4A provides the core normalized host model and dynamic inspection workspace.

Phase 4B adds Linux investigation/operations such as service failure analysis, storage pressure/mount diagnosis, SELinux denial reasoning, journal investigation, network troubleshooting, health derivation, remediation guidance, operator-context contracts, and scenario-ready definitions.

Unified command execution remains Phase 6. Stateful scenario mutation/remediation/reset remains Phase 7.
