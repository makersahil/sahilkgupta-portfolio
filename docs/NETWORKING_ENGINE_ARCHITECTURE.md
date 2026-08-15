# Dynamic Networking Engine

## Purpose

The Networking Engine renders any published `NETWORK_TOPOLOGY` Lab from persisted canonical Lab data. It is not coupled to the current Cisco WAN flagship project and does not require a project-specific React page.

```text
Published Networking Project
  → one or more READY NETWORK_TOPOLOGY Labs
    → standardized LabInputs
    → normalized networking.v1 control-plane state
    → persisted LabNode / LabLink topology
    → NetworkingLabAdapter
    → NetworkingService
    → Network Control Plane UI
```

## Canonical state

Phase 3A uses existing canonical Lab Platform records:

- `Lab` identifies the project, domain, kind, capabilities, publication state, and normalized control-plane state.
- `LabInput` describes normalized topology/configuration sources and truthful artifact references.
- `LabNode` represents devices with position, interfaces, protocols, configuration snapshots, and operational status.
- `LabLink` represents persisted relationships and active/down link state.
- Lab runbook and public evidence records are included in the same public experience.

The normalized control-plane state uses `schemaVersion: networking.v1` and can contain routing entries, VLANs, ACLs, inspection checks, specifications, and provenance.

## Public APIs

```text
GET  /api/network/labs
GET  /api/network/labs/:identifier
GET  /api/network/labs/:identifier/devices/:nodeKey
POST /api/network/labs/:identifier/trace
```

Compatibility endpoints remain temporarily available, but are backed by the same persisted engine:

```text
GET  /api/network/topology
POST /api/network/simulate-packet
```

No route-local topology fixtures, random timings, or in-memory networking state are used.

## Reachability scope

Phase 3A path tracing is deterministic topology reachability over persisted active links. It does not claim protocol-accurate forwarding, ACL decision simulation, convergence timing, or failure mutation. Those capabilities are added in Phase 3B and the generic scenario engine.

## Packet Tracer truthfulness

`PACKET_TRACER` is a reference input type. The public explorer uses normalized persisted records and does not claim arbitrary `.pkt` binary parsing. A future supported importer may create canonical records from verified artifacts, but the renderer remains independent of that importer.

## Multi-project requirement

Adding another supported Networking project should normally require:

1. A published Networking Project.
2. One or more READY `NETWORK_TOPOLOGY` Labs.
3. Standardized LabInputs.
4. Persisted nodes, links, and normalized control-plane state.

No new project-specific Networking component should be required.

## Verification

Durable checks:

```text
npm run test:networking:static
npm run test:networking
npm run test:networking:http
```

The complete project gate remains:

```text
npm run verify
```
