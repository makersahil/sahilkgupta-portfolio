import type {
  CanonicalLabManifestV1,
  LabProjectIdentity,
  LabRunbookStepRecord,
} from './lab-platform.js';

export type NetworkingDeviceKind =
  | 'isp'
  | 'router'
  | 'multilayer_switch'
  | 'switch'
  | 'firewall'
  | 'server'
  | 'workstation'
  | 'endpoint'
  | 'unknown';

export type NetworkingOperationalStatus = 'UP' | 'DOWN' | 'STANDBY' | 'DEGRADED' | 'UNKNOWN';

export interface NetworkingPosition {
  x: number;
  y: number;
}

export interface NetworkingInterfaceState {
  name: string;
  address: string | null;
  subnet: string | null;
  status: NetworkingOperationalStatus;
  type: string | null;
  vlan: string | null;
  description: string | null;
}

export interface NetworkingDeviceState {
  key: string;
  label: string;
  kind: NetworkingDeviceKind;
  vendor: string | null;
  model: string | null;
  role: string | null;
  managementAddress: string | null;
  status: NetworkingOperationalStatus;
  position: NetworkingPosition;
  description: string | null;
  interfaces: NetworkingInterfaceState[];
  routingProtocols: string[];
  configurationSnippet: string | null;
  metadata: Record<string, unknown>;
}

export interface NetworkingLinkState {
  key: string;
  sourceDeviceKey: string;
  targetDeviceKey: string;
  label: string | null;
  kind: string | null;
  status: NetworkingOperationalStatus;
  speed: string | null;
  protocols: string[];
  sourceInterface: string | null;
  targetInterface: string | null;
  metadata: Record<string, unknown>;
}

export interface NetworkingRouteState {
  network: string;
  nextHop: string;
  interface: string;
  protocol: string;
  protocolName: string;
  administrativeDistance: number | null;
  metric: string | null;
  deviceKey: string | null;
}

export interface NetworkingVlanState {
  vlanId: number;
  name: string;
  status: NetworkingOperationalStatus;
  ports: string[];
}

export interface NetworkingAclRuleState {
  id: string;
  name: string;
  action: 'permit' | 'deny' | 'unknown';
  protocol: string;
  source: string;
  destination: string;
}

export interface NetworkingVerificationRecord {
  id: string;
  title: string;
  command: string | null;
  recordedObservation: string | null;
  source: 'EXPECTED_CHECK' | 'RECORDED_SNAPSHOT' | 'EVIDENCE_RECORD';
  evidenceId: string | null;
}

export interface NetworkingStateProvenance {
  sourceType: 'CANONICAL_MANIFEST' | 'NORMALIZED_PROJECT_FIXTURE' | 'LAB_TOPOLOGY_RECORDS' | 'UNKNOWN';
  packetTracerReference: {
    fileName: string;
    sizeBytes: number | null;
    recordedAt: string | null;
    referenceOnly: true;
  } | null;
  notes: string[];
}

export interface NetworkingLabSummary {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  project: LabProjectIdentity;
  capabilities: string[];
  deviceCount: number;
  linkCount: number;
  inputTypes: string[];
}

export interface NetworkingLabState {
  schemaVersion: 'networking.v1';
  lab: {
    id: string;
    slug: string;
    title: string;
    summary: string | null;
    capabilities: string[];
  };
  project: LabProjectIdentity;
  inputs: CanonicalLabManifestV1['inputs'];
  overview: string | null;
  devices: NetworkingDeviceState[];
  links: NetworkingLinkState[];
  routingTable: NetworkingRouteState[];
  vlans: NetworkingVlanState[];
  aclRules: NetworkingAclRuleState[];
  verificationRecords: NetworkingVerificationRecord[];
  specifications: {
    environment: string | null;
    protocols: string[];
    addressing: string[];
  };
  provenance: NetworkingStateProvenance;
  runbook: LabRunbookStepRecord[];
  evidence: CanonicalLabManifestV1['evidence'];
  warnings: string[];
}

export interface NetworkingPathTrace {
  labId: string;
  labSlug: string;
  sourceDeviceKey: string;
  targetDeviceKey: string;
  protocol: string;
  status: 'PATH_FOUND' | 'UNREACHABLE';
  hops: string[];
  linkKeys: string[];
  traversesFirewall: boolean;
  interpretation: 'TOPOLOGY_REACHABILITY';
  note: string;
}

export interface CompatibilityTopologyNode {
  id: string;
  name: string;
  type: NetworkingDeviceKind;
  ip: string;
  vlan: string | null;
  status: NetworkingOperationalStatus;
  x: number;
  y: number;
  details: string;
}

export interface CompatibilityTopologyLink {
  source: string;
  target: string;
  protocol: string;
  speed: string;
  active: boolean;
}

export interface CompatibilityTopologyData {
  nodes: CompatibilityTopologyNode[];
  links: CompatibilityTopologyLink[];
}
