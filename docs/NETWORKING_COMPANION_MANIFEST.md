# Networking Companion Manifest v1

`networking.companion-manifest.v1` is the supported portable JSON representation for creating a canonical Networking Lab without pretending to parse an arbitrary Packet Tracer binary.

It contains:

- Lab identity and capabilities
- one primary registered Networking input
- normalized `networking.v1` state
- `LabNode` and `LabLink` records
- provenance
- optional Packet Tracer filename/size/hash metadata labeled `referenceOnly`

The importer validates the manifest through Lab Manifest v1, the real Networking adapter, and shared operational-topology rules. It never opens, parses, or invents topology from a `.pkt` file. A `.pkt` can only be registered as reference metadata unless a future verified binary adapter is implemented.

Example: `docs/schemas/networking.companion-manifest.v1.example.json`.
