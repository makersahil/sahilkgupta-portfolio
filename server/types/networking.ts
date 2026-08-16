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
export type NetworkingObservationSource = 'NORMALIZED_INPUT' | 'RECORDED_SNAPSHOT' | 'EXPECTED_CHECK';

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
  deviceKey: string | null;
  interface: string | null;
  direction: 'IN' | 'OUT' | 'UNKNOWN';
  sequence: number | null;
}

export interface NetworkingVerificationRecord {
  id: string;
  title: string;
  command: string | null;
  recordedObservation: string | null;
  source: 'EXPECTED_CHECK' | 'RECORDED_SNAPSHOT' | 'EVIDENCE_RECORD';
  evidenceId: string | null;
}

export interface NetworkingBgpNeighborState {
  id: string;
  deviceKey: string;
  peerDeviceKey: string | null;
  peerAddress: string;
  localAs: number | null;
  remoteAs: number | null;
  sessionType: 'EBGP' | 'IBGP' | 'UNKNOWN';
  state: string;
  health: NetworkingOperationalStatus;
  addressFamily: string | null;
  prefixesReceived: number | null;
  description: string | null;
  source: NetworkingObservationSource;
}

export interface NetworkingOspfNeighborState {
  id: string;
  deviceKey: string;
  peerDeviceKey: string | null;
  neighborId: string;
  neighborAddress: string | null;
  interface: string;
  area: string;
  state: string;
  role: string | null;
  health: NetworkingOperationalStatus;
  source: NetworkingObservationSource;
}

export interface NetworkingGatewayMemberState {
  deviceKey: string;
  role: 'ACTIVE' | 'STANDBY' | 'LISTEN' | 'UNKNOWN';
  priority: number | null;
  preempt: boolean | null;
  trackedInterfaces: string[];
  status: NetworkingOperationalStatus;
}

export interface NetworkingGatewayRedundancyState {
  id: string;
  protocol: 'HSRP' | 'VRRP' | 'GLBP' | 'UNKNOWN';
  group: number | null;
  virtualIp: string | null;
  members: NetworkingGatewayMemberState[];
  health: NetworkingOperationalStatus;
  source: NetworkingObservationSource;
}

export type NetworkingHealthCategory =
  | 'DEVICE'
  | 'INTERFACE'
  | 'LINK'
  | 'BGP'
  | 'OSPF'
  | 'GATEWAY'
  | 'ROUTING'
  | 'DATA';
export type NetworkingHealthStatus = 'PASS' | 'WARN' | 'FAIL' | 'UNKNOWN';

export interface NetworkingHealthCheck {
  id: string;
  category: NetworkingHealthCategory;
  status: NetworkingHealthStatus;
  title: string;
  summary: string;
  relatedDeviceKeys: string[];
  relatedLinkKeys: string[];
}

export interface NetworkingScenarioReadiness {
  id: string;
  slug: string;
  title: string;
  summary: string;
  enabled: boolean;
  observableSignals: string[];
  executionAvailable: boolean;
}

export interface NetworkingOperationsSnapshot {
  schemaVersion: 'networking.operations.v1';
  labId: string;
  labSlug: string;
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'UNKNOWN';
  bgpNeighbors: NetworkingBgpNeighborState[];
  ospfNeighbors: NetworkingOspfNeighborState[];
  gatewayRedundancy: NetworkingGatewayRedundancyState[];
  healthChecks: NetworkingHealthCheck[];
  scenarioReadiness: NetworkingScenarioReadiness[];
  counts: {
    devices: number;
    interfaces: number;
    links: number;
    routes: number;
    bgpNeighbors: number;
    ospfNeighbors: number;
    gatewayGroups: number;
  };
  note: string;
}

export interface NetworkingRouteLookup {
  labId: string;
  labSlug: string;
  destination: string;
  deviceKey: string | null;
  status: 'MATCH_FOUND' | 'NO_MATCH' | 'INVALID_DESTINATION';
  matchedRoute: NetworkingRouteState | null;
  prefixLength: number | null;
  interpretation: 'RECORDED_ROUTE_TABLE_LONGEST_PREFIX_MATCH';
  note: string;
}

export interface NetworkingPathBlocker {
  type: 'DEVICE_DOWN' | 'LINK_DOWN' | 'INTERFACE_DOWN' | 'ROUTE_DATA_INCOMPLETE';
  key: string;
  message: string;
}

export interface NetworkingAclAssessment {
  status: 'PERMIT' | 'DENY' | 'NO_MATCH' | 'NOT_EVALUATED';
  ruleId: string | null;
  ruleName: string | null;
  deviceKey: string | null;
  reason: string;
}

export interface NetworkingOperationalPathAnalysis {
  labId: string;
  labSlug: string;
  sourceDeviceKey: string;
  targetDeviceKey: string;
  protocol: string;
  status: 'FORWARDABLE' | 'BLOCKED' | 'UNREACHABLE' | 'INDETERMINATE';
  hops: string[];
  linkKeys: string[];
  blockers: NetworkingPathBlocker[];
  traversesFirewall: boolean;
  routeLookup: NetworkingRouteLookup | null;
  aclAssessment: NetworkingAclAssessment;
  interpretation: 'RECORDED_STATE_FORWARDING_ANALYSIS';
  note: string;
}

export interface NetworkingOperatorContext {
  contextId: string;
  prompt: string;
  scope: 'LAB' | 'DEVICE';
  lab: { id: string; slug: string; title: string };
  device: { key: string; label: string; kind: NetworkingDeviceKind } | null;
  availableInspectors: Array<
    | 'topology'
    | 'device'
    | 'interfaces'
    | 'routes'
    | 'bgp'
    | 'ospf'
    | 'gateway'
    | 'vlans'
    | 'acls'
    | 'health'
    | 'scenarios'
    | 'evidence'
  >;
  executionAvailable: boolean;
  note: string;
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
  bgpNeighbors: NetworkingBgpNeighborState[];
  ospfNeighbors: NetworkingOspfNeighborState[];
  gatewayRedundancy: NetworkingGatewayRedundancyState[];
  verificationRecords: NetworkingVerificationRecord[];
  specifications: {
    environment: string | null;
    protocols: string[];
    addressing: string[];
  };
  provenance: NetworkingStateProvenance;
  runbook: LabRunbookStepRecord[];
  evidence: CanonicalLabManifestV1['evidence'];
  scenarios: CanonicalLabManifestV1['scenarios'];
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
