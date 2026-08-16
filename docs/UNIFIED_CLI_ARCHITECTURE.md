# Unified Context-Aware CLI Architecture

## Purpose

Phase 6 replaces the legacy representative terminal with one shared, read-only command interpreter backed by the same persisted Lab state used by the Networking, Linux, and DevOps workspaces.

The CLI is **not** a browser shell and does not spawn local or remote operating-system/provider processes.

```text
Browser TerminalEmulator
        ↓
/api/terminal/bootstrap + /api/terminal/exec
        ↓
UnifiedCliService
        ↓
  ┌───────────────┬────────────────┬─────────────────┐
  │ NETOPS        │ RHEL           │ GITOPS          │
  │ Networking    │ Linux          │ DevOps          │
  │ services      │ services       │ services        │
  └───────────────┴────────────────┴─────────────────┘
        ↓
Canonical Lab Manifest / normalized recorded state
        ↓
Prisma repositories → PostgreSQL
```

## Context model

Phase 6 canonicalizes stable context identifiers from the domain operation-layer Lab/target metadata:

```text
PORTFOLIO>
NETOPS/<LAB> >
NETOPS/<LAB>/<DEVICE> >
RHEL/<LAB> >
RHEL/<LAB>/<HOST> >
GITOPS/<LAB> >
GITOPS/<LAB>/<PIPELINE> >
```

The actual prompt omits the spaces shown above, for example `NETOPS/CISCO-WAN-TOPOLOGY/R1>`.

The browser keeps only the selected `contextId`; every command request resolves that context again against public persisted Lab state. No authoritative infrastructure state is stored in browser local storage.

## Global commands

```text
help
ctx
ctx list [domain]
ctx use <context-id>
ctx targets
ctx target <key>
ctx lab
ctx root
inspect [area]
show <area>
show health
scenario list
evidence
clear
```

`scenario list` is intentionally read-only. Scenario mutation, remediation, verification, and reset are Phase 7 responsibilities.

## NETOPS commands

Recorded-state inspectors:

```text
show topology
show device [device-key]
show interfaces [device-key]
show routes [device-key]
show bgp
show ospf
show gateway
show vlans
show acls
show health
route <destination-ip> [device-key]
trace <source-device> <target-device> [protocol]
```

`trace` uses the existing deterministic recorded-state forwarding analysis. It does not send packets or fabricate latency, jitter, TTL, or packet-loss values.

Compatibility aliases such as `cisco show run`, `cisco show ip route`, and `cisco show vlan` resolve to recorded normalized state. IOS is not executed.

## RHEL commands

Recorded-state inspectors:

```text
show host
show services
show storage
show fstab
show selinux
show network
show logs
show configurations
show verification
show health
```

Read-only familiar aliases such as `sestatus`, `getenforce`, `lsblk`, `ip route`, `journalctl`, `uname`, and `systemctl status <unit>` resolve to persisted `linux.v1` data.

Mutating `systemctl` operations are rejected. The CLI does not start, stop, restart, enable, disable, mount, relabel, edit, or otherwise change a host.

## GITOPS commands

Recorded-state inspectors:

```text
show repository
show pipelines [pipeline-id]
show terraform
show kubernetes
show gitops
show helm
show network-policy
show observability
show health
```

Familiar read aliases such as `terraform plan`, `kubectl get ...`, `argocd app ...`, and `helm list` resolve to recorded state only. They do not invoke external binaries, clusters, controllers, cloud APIs, or CI/CD systems.

## Truthfulness guarantees

Phase 6 removes the old hard-coded terminal outputs that looked like live runtime measurements. The CLI must never invent:

- uptime, CPU, memory, process data, or package counts
- ICMP latency, jitter, packet loss, or traceroute hops
- deployment success or CI/CD execution
- Terraform apply/plan results that are not already recorded
- Kubernetes pod/node state not present in `devops.v1`
- live Cisco IOS output
- benchmark results
- SELinux remediations that were not executed

If evidence is missing, the CLI reports that it is not recorded or not represented.

## Execution boundary

`UnifiedCliService` performs command parsing and read-only interpretation only. It must not import or call `child_process`, SSH libraries, shell runners, provider SDK executors, or mutation APIs.

Phase 6 enables **CLI command execution against recorded portfolio state**, not operating-system or infrastructure command execution.

## Phase 7 boundary

Phase 7 will own shared mutable scenario state and commands such as scenario run/reset/remediation/verification. Until then, any scenario mutation request returns an explicit non-zero CLI result explaining that the operation is unavailable.
