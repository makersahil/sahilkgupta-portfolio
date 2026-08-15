# Dynamic Networking Engine

## Purpose

The Networking Engine renders and investigates any published `NETWORK_TOPOLOGY` Lab from persisted canonical Lab data. It is not coupled to the current Cisco WAN flagship project and does not require a project-specific React page.

```text
Published Networking Project
  → one or more READY NETWORK_TOPOLOGY Labs
    → standardized LabInputs
    → normalized networking.v1 state
    → persisted LabNode / LabLink topology
    → NetworkingLabAdapter
    → NetworkingService + NetworkingOperationsService
    → Network Control Plane UI
```

## Core state

The engine consumes existing canonical Lab Platform records:

- `Lab` identifies the project, domain, kind, capabilities, publication state, and normalized networking state.
- `LabInput` describes normalized topology/configuration sources and truthful artifact references.
- `LabNode` represents devices with position, interfaces, protocols, configuration snapshots, and operational status.
- `LabLink` represents persisted relationships and recorded link/interface state.
- `LabScenario` stores scenario-ready contracts; Phase 3B does not execute scenario mutations.
- Lab runbook and public evidence records remain part of the same experience.

The normalized `networking.v1` state can contain route snapshots, VLANs, structured ACL records, BGP neighbors, OSPF adjacencies, first-hop redundancy groups, verification checks, specifications, and provenance.

## Public APIs

Core state:

```text
GET  /api/network/labs
GET  /api/network/labs/:identifier
GET  /api/network/labs/:identifier/devices/:nodeKey
POST /api/network/labs/:identifier/trace
```

Investigation and operations:

```text
GET  /api/network/labs/:identifier/operations
GET  /api/network/labs/:identifier/route-lookup?destination=<ipv4>&deviceKey=<optional>
POST /api/network/labs/:identifier/analyze-path
GET  /api/network/labs/:identifier/context?deviceKey=<optional>
```

Compatibility endpoints remain temporarily available and are backed by the same persisted engine:

```text
GET  /api/network/topology
POST /api/network/simulate-packet
```

No route-local topology fixtures, random timings, or in-memory networking state are used.

## Investigation model

Phase 3B adds recorded-state investigation rather than pretending to be a live IOS/ASA emulator.

- BGP and OSPF views expose normalized neighbor/adjacency snapshots and their provenance.
- HSRP/VRRP/GLBP-compatible structures expose first-hop redundancy members and baseline roles.
- Health checks are derived from persisted device, interface, link, neighbor, gateway, and route state.
- Route lookup performs deterministic IPv4 longest-prefix matching over the persisted route snapshot.
- Operational path analysis compares topology reachability with recorded device/link/interface state.
- Structured ACL rules are evaluated only when device attachment, direction, interface, source, destination, and protocol/port can be matched deterministically. No implicit platform default is invented when the data is incomplete.
- No latency, convergence time, packet counters, or live neighbor telemetry is fabricated.

## Operator context contract

The engine exposes durable contexts such as:

```text
NETOPS/CISCO-WAN-TOPOLOGY>
NETOPS/R1>
```

The context lists available inspectors (`routes`, `bgp`, `ospf`, `gateway`, `health`, and so on) but `executionAvailable` remains `false`. Phase 6 will attach the unified CLI to this same contract instead of creating a separate networking state model.

## Scenario-ready state

Phase 3B persists enabled Networking scenario definitions for investigation workflows such as ISP failover, OSPF neighbor loss, HSRP gateway failover, and ACL-denial investigation. They carry baseline signals, mutation contracts, expected observations, and verification criteria.

These definitions are intentionally **not executed in Phase 3B**. Healthy→mutate→investigate→remediate→verify→reset execution belongs to the generic Scenario Engine in Phase 7. The UI labels these records as definitions only.

## Reachability scope

`trace` remains a deterministic topology reachability API for backward compatibility and visualization.

`analyze-path` is the Phase 3B recorded-state investigation API. It can report `FORWARDABLE`, `BLOCKED`, `UNREACHABLE`, or `INDETERMINATE` from persisted state. An incomplete route/ACL snapshot produces an indeterminate or non-evaluated result rather than a fabricated decision.

## Packet Tracer truthfulness

`PACKET_TRACER` remains a reference input type. The public explorer uses normalized persisted records and does not claim arbitrary `.pkt` binary parsing. A genuinely supported importer/exporter may later create canonical records from a verified artifact or companion manifest, but the renderer and investigation engine remain independent of that importer.

## Multi-project requirement

Adding another supported Networking project should normally require:

1. A published Networking Project.
2. One or more READY `NETWORK_TOPOLOGY` Labs.
3. Standardized LabInputs.
4. Persisted nodes, links, and normalized Networking state.

No new project-specific Networking component should be required.

## Verification

Durable checks:

```text
npm run test:networking:static
npm run test:networking
npm run test:networking:http
npm run test:networking:operations
npm run test:networking:operations:http
```

The complete project gate remains:

```text
npm run verify
```
