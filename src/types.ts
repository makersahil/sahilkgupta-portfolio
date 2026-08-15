export type CategoryTheme = 'green' | 'cyan' | 'amber' | 'violet' | 'emerald';
export type Domain = 'NETWORKING' | 'LINUX' | 'DEVOPS';
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR';
export type ProjectStatus = 'COMPLETED' | 'IN_PROGRESS' | 'ARCHIVED' | 'PLANNED';
export type InquiryStatus = 'NEW' | 'READ' | 'RESPONDED' | 'ARCHIVED';
export type ProjectFormatType = 'cisco_pkt_lab' | 'rhcsa_matrix' | 'devops_pipeline' | 'standard';

export interface Category {
  id: string;
  domain?: Domain;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  accentColor: string;
  terminalTheme: CategoryTheme;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

// Cisco .PKT Lab Data Structures
export interface CiscoInterface {
  name: string;
  ip: string;
  subnet: string;
  status: 'UP' | 'DOWN' | 'ADMIN_DOWN';
  vlan?: string;
  type: 'GigabitEthernet' | 'FastEthernet' | 'Serial' | 'Loopback' | 'VLAN_SVI';
}

export interface CiscoDevice {
  id: string;
  name: string;
  type: 'router' | 'multilayer_switch' | 'switch' | 'firewall' | 'server' | 'pc' | 'isp';
  model: string;
  mgmtIp: string;
  role: string;
  status: 'ONLINE' | 'STANDBY' | 'DEGRADED';
  interfaces: CiscoInterface[];
  routingProtocols: string[];
  runningConfigSnippet: string;
}

export interface CiscoRouteEntry {
  network: string;
  nextHop: string;
  interface: string;
  protocol: 'C' | 'S' | 'O' | 'B' | 'D' | 'i';
  protocolName: string;
  metric: string;
  ad: number;
}

export interface CiscoLabData {
  labTitle: string;
  pktFileName: string;
  pktFileSizeBytes?: number;
  uploadedAt?: string;
  xmlStructureVersion: string;
  topologyXmlSnippet: string;
  overviewSummary: string;
  devices: CiscoDevice[];
  routingTable: CiscoRouteEntry[];
  vlanDatabase: Array<{ vlanId: number; name: string; ports: string[]; status: string }>;
  aclRules: Array<{ id: string; name: string; action: 'permit' | 'deny'; protocol: string; source: string; destination: string }>;
  verificationTasks: Array<{ task: string; testCommand: string; expectedResult: string; passed: boolean }>;
}

// RHCSA Audit Matrix Data Structures
export interface RhcsaConfigFile {
  path: string;
  language: 'bash' | 'yaml' | 'ini' | 'systemd' | 'fstab';
  content: string;
  description: string;
}

export interface RhcsaObjective {
  id: string;
  domainCode: string;
  domainTitle: string;
  competency: string;
  examWeight: string;
  testedCommands: string[];
  configFiles: RhcsaConfigFile[];
  verificationCommand: string;
  verificationOutput: string;
  auditStatus: 'VERIFIED' | 'COMPLIANT' | 'HARDENED';
}

export interface RhcsaMatrixData {
  rhelVersion: string;
  kernelVersion: string;
  selinuxMode: 'Enforcing' | 'Permissive' | 'Disabled';
  fipsMode: boolean;
  totalCompetencies: number;
  verifiedCount: number;
  objectives: RhcsaObjective[];
}

// DevOps Multi-Pipeline & IaC Data Structures
export interface PipelineStage {
  id: string;
  name: string;
  icon: string;
  tool: string;
  durationSeconds: number;
  status: 'SUCCESS' | 'RUNNING' | 'PENDING' | 'FAILED';
  stdoutSnippet: string;
  artifactsProduced?: string[];
}

export interface IaCFileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: string;
  content?: string;
  children?: IaCFileNode[];
}

export interface DevOpsPipelineData {
  framework: 'GitOps (ArgoCD + Cilium + Helm)' | 'Terraform AWS EKS' | 'Ansible + Podman';
  gitCommitSha: string;
  branch: string;
  pipelineStages: PipelineStage[];
  iacTree: IaCFileNode[];
  architectureLayers: Array<{
    tier: string;
    description: string;
    technologies: string[];
    slaMetrics: string;
  }>;
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  summary: string;
  descriptionMarkdown: string;
  mission?: string;
  architectureSummary?: string;
  whatIBuilt?: string;
  categoryId: string;
  status: ProjectStatus;
  formatType?: ProjectFormatType;
  isFeatured: boolean;
  sortOrder: number;
  coverImageUrl?: string;
  architectureSvg?: string;
  liveUrl?: string;
  githubUrl?: string;
  packetTracerFile?: string;
  topologyConfigJson?: string;
  devopsStack: string[];
  tags: string[];
  metrics?: Record<string, string | number>;
  
  // Multi-Format Specialized Payloads
  ciscoLabData?: CiscoLabData;
  rhcsaMatrixData?: RhcsaMatrixData;
  devopsPipelineData?: DevOpsPipelineData;

  createdAt: string;
  updatedAt: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  contentMarkdown: string;
  categoryId: string;
  coverImageUrl?: string;
  readTimeMinutes: number;
  tags: string[];
  isPublished: boolean;
  publishedAt: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Certification {
  id: string;
  title: string;
  code: string;
  issuer: string;
  credentialId: string;
  verificationUrl?: string;
  badgeIcon: string;
  issueDate: string;
  expiryDate?: string;
  categoryId: string;
  skillsValidated: string[];
  syllabusBreakdown?: Array<{ domain: string; percentage: number; score?: string }>;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Skill {
  id: string;
  name: string;
  level: 'Expert' | 'Advanced' | 'Proficient';
  proficiencyPercent: number;
  yearsOfExperience: number;
  categoryId: string;
  iconName?: string;
  terminalSnippet?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaAsset {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  s3Key?: string;
  uploaderId?: string;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  lastLoginAt?: string;
}


export interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  category?: string;
  status: InquiryStatus;
  ipAddress?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TopologyNode {
  id: string;
  name: string;
  type: 'isp' | 'router' | 'multilayer_switch' | 'firewall' | 'server' | 'workstation' | 'switch' | 'pc' | 'endpoint' | 'unknown';
  ip: string;
  vlan: string | null;
  status: string;
  bgpAs?: number;
  x: number;
  y: number;
  details: string;
}

export interface TopologyLink {
  source: string;
  target: string;
  protocol: string;
  speed: string;
  active: boolean;
}

export interface TopologyData {
  nodes: TopologyNode[];
  links: TopologyLink[];
}

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
  position: { x: number; y: number };
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

export type NetworkingHealthCategory = 'DEVICE' | 'INTERFACE' | 'LINK' | 'BGP' | 'OSPF' | 'GATEWAY' | 'ROUTING' | 'DATA';
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
  executionAvailable: false;
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
  availableInspectors: Array<'topology' | 'device' | 'interfaces' | 'routes' | 'bgp' | 'ospf' | 'gateway' | 'vlans' | 'acls' | 'health' | 'scenarios' | 'evidence'>;
  executionAvailable: false;
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
  lab: { id: string; slug: string; title: string; summary: string | null; capabilities: string[] };
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
  specifications: { environment: string | null; protocols: string[]; addressing: string[] };
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

export type LabDomain = Domain;
export type LabKind = 'NETWORK_TOPOLOGY' | 'LINUX_SYSTEM' | 'DEVOPS_PIPELINE';
export type LabStatus = 'DRAFT' | 'READY' | 'ARCHIVED';
export type LabInputSourceKind = 'INLINE' | 'EXTERNAL' | 'ARTIFACT_REFERENCE';
export type LabEvidenceKind =
  | 'CONFIGURATION'
  | 'COMMAND_OUTPUT'
  | 'TOPOLOGY'
  | 'RUNBOOK'
  | 'SCREENSHOT'
  | 'ARTIFACT'
  | 'LINK'
  | 'OTHER';

export interface LabProjectIdentity {
  id: string;
  slug: string;
  title: string;
  domain: LabDomain;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

export interface LabRecord {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  domain: LabDomain;
  kind: LabKind;
  status: LabStatus;
  projectId: string | null;
  isInteractive: boolean;
  manifestVersion: string;
  capabilities: string[];
  normalizedState: unknown;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
  project?: LabProjectIdentity | null;
}

export interface LabArtifactReference {
  id: string;
  fileName: string;
  originalName: string | null;
  mimeType: string;
  publicUrl: string | null;
  projectId: string | null;
  labId: string | null;
  isPublic: boolean;
}

export interface LabInputRecord {
  id: string;
  labId: string;
  inputKey: string;
  inputType: string;
  label: string;
  description: string | null;
  sourceKind: LabInputSourceKind;
  schemaVersion: string;
  payload: unknown;
  externalUrl: string | null;
  artifactId: string | null;
  isPrimary: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  artifact?: LabArtifactReference | null;
}

export interface LabNodeRecord {
  id: string;
  labId: string;
  nodeKey: string;
  label: string;
  kind: string;
  description: string | null;
  position: unknown;
  configuration: unknown;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface LabLinkRecord {
  id: string;
  labId: string;
  linkKey: string;
  sourceNodeKey: string;
  targetNodeKey: string;
  label: string | null;
  kind: string | null;
  configuration: unknown;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface LabScenarioRecord {
  id: string;
  labId: string;
  slug: string;
  title: string;
  summary: string;
  description: string | null;
  order: number;
  isEnabled: boolean;
  baselineState: unknown;
  actions: unknown;
  expectedObservations: unknown;
  verificationCriteria: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface LabRunbookStepRecord {
  id: string;
  labId: string;
  order: number;
  title: string;
  description: string | null;
  command: string | null;
  expectedObservation: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LabEvidenceRecord {
  id: string;
  projectId: string | null;
  labId: string | null;
  kind: LabEvidenceKind;
  title: string;
  description: string | null;
  content: unknown;
  artifactId: string | null;
  externalUrl: string | null;
  isPublic: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  artifact?: LabArtifactReference | null;
}

export interface LabAggregate extends LabRecord {
  project: LabProjectIdentity | null;
  inputs: LabInputRecord[];
  nodes: LabNodeRecord[];
  links: LabLinkRecord[];
  scenarios: LabScenarioRecord[];
  runbookSteps: LabRunbookStepRecord[];
  evidence: LabEvidenceRecord[];
  artifacts: LabArtifactReference[];
}

export interface LabInputTypeDefinition {
  type: string;
  label: string;
  description: string;
}

export interface CanonicalLabManifestV1 {
  schemaVersion: '1.0';
  lab: Pick<LabRecord, 'id' | 'slug' | 'title' | 'summary' | 'domain' | 'kind' | 'status' | 'isInteractive' | 'capabilities'>;
  project: LabProjectIdentity | null;
  inputs: Array<{
    id: string;
    inputKey: string;
    inputType: string;
    label: string;
    description: string | null;
    sourceKind: LabInputSourceKind;
    schemaVersion: string;
    isPrimary: boolean;
    sortOrder: number;
    hasPayload: boolean;
    externalReference: boolean;
    artifact: LabArtifactReference | null;
  }>;
  normalizedState: unknown;
  topology: { nodes: LabNodeRecord[]; links: LabLinkRecord[] };
  scenarios: LabScenarioRecord[];
  runbook: LabRunbookStepRecord[];
  evidence: Array<{
    id: string;
    kind: LabEvidenceKind;
    title: string;
    description: string | null;
    content: unknown;
    externalUrl: string | null;
    sortOrder: number;
    artifact: LabArtifactReference | null;
  }>;
  artifacts: LabArtifactReference[];
}

export interface AdminAuditLog {
  id: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  createdAt: string;
  actorUser: {
    id: string;
    email: string;
    displayName: string;
    role: UserRole;
  } | null;
}
