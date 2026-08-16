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

export type LinuxHostStatus = 'UP' | 'DOWN' | 'DEGRADED' | 'UNKNOWN';
export type LinuxServiceState = 'ACTIVE' | 'INACTIVE' | 'FAILED' | 'UNKNOWN';
export type LinuxMountState = 'MOUNTED' | 'UNMOUNTED' | 'DEGRADED' | 'UNKNOWN';
export type LinuxObservationSource = 'NORMALIZED_INPUT' | 'RECORDED_SNAPSHOT' | 'EXPECTED_CHECK';

export interface LinuxServiceRecord {
  unit: string;
  description: string | null;
  loadState: string | null;
  activeState: LinuxServiceState;
  subState: string | null;
  enabled: boolean | null;
  restartPolicy: string | null;
  user: string | null;
  configurationSnippet: string | null;
  source: LinuxObservationSource;
}

export interface LinuxBlockDeviceRecord {
  name: string;
  type: string;
  size: string | null;
  filesystem: string | null;
  mountPoint: string | null;
  parent: string | null;
  state: LinuxMountState;
}

export interface LinuxVolumeGroupRecord { name: string; size: string | null; free: string | null; physicalVolumes: string[]; }
export interface LinuxLogicalVolumeRecord { name: string; volumeGroup: string; size: string | null; layout: string | null; filesystem: string | null; mountPoint: string | null; state: LinuxMountState; }
export interface LinuxMountRecord { source: string; target: string; filesystem: string; options: string[]; state: LinuxMountState; }
export interface LinuxFstabEntry { source: string; target: string; filesystem: string; options: string[]; dump: number | null; pass: number | null; }
export interface LinuxSelinuxBoolean { name: string; enabled: boolean; }
export interface LinuxSelinuxPort { type: string; protocol: string; ports: string; }
export interface LinuxSelinuxContext { path: string; context: string; source: LinuxObservationSource; }
export interface LinuxSelinuxState {
  status: 'ENABLED' | 'DISABLED' | 'UNKNOWN';
  mode: 'ENFORCING' | 'PERMISSIVE' | 'DISABLED' | 'UNKNOWN';
  configuredMode: 'ENFORCING' | 'PERMISSIVE' | 'DISABLED' | 'UNKNOWN';
  policy: string | null;
  booleans: LinuxSelinuxBoolean[];
  ports: LinuxSelinuxPort[];
  contexts: LinuxSelinuxContext[];
  source: LinuxObservationSource;
}
export interface LinuxNetworkInterfaceRecord { name: string; type: string | null; state: 'UP' | 'DOWN' | 'UNKNOWN'; addresses: string[]; gateway: string | null; dns: string[]; connection: string | null; mtu: number | null; }
export interface LinuxRouteRecord { destination: string; gateway: string | null; interface: string | null; metric: number | null; protocol: string | null; }
export interface LinuxLogRecord { id: string; source: string; priority: string | null; timestamp: string | null; message: string; recorded: true; }
export interface LinuxConfigRecord { path: string; format: string; content: string; description: string | null; source: LinuxObservationSource; }
export interface LinuxVerificationRecord { id: string; title: string; command: string | null; recordedObservation: string | null; source: LinuxObservationSource | 'EVIDENCE_RECORD'; evidenceId: string | null; }

export interface LinuxHostState {
  key: string;
  label: string;
  hostname: string;
  osName: string | null;
  osVersion: string | null;
  kernelVersion: string | null;
  architecture: string | null;
  bootTarget: string | null;
  status: LinuxHostStatus;
  fipsMode: boolean | null;
  timeSynchronization: string | null;
  description: string | null;
  services: LinuxServiceRecord[];
  blockDevices: LinuxBlockDeviceRecord[];
  volumeGroups: LinuxVolumeGroupRecord[];
  logicalVolumes: LinuxLogicalVolumeRecord[];
  mounts: LinuxMountRecord[];
  fstab: LinuxFstabEntry[];
  selinux: LinuxSelinuxState;
  interfaces: LinuxNetworkInterfaceRecord[];
  routes: LinuxRouteRecord[];
  logs: LinuxLogRecord[];
  configurations: LinuxConfigRecord[];
  verificationRecords: LinuxVerificationRecord[];
  metadata: Record<string, unknown>;
}

export interface LinuxStateProvenance {
  sourceType: 'CANONICAL_MANIFEST' | 'NORMALIZED_PROJECT_FIXTURE' | 'LAB_HOST_RECORDS' | 'UNKNOWN';
  inputTypes: string[];
  notes: string[];
}

export interface LinuxLabSummary {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  project: LabProjectIdentity;
  capabilities: string[];
  hostCount: number;
  inputTypes: string[];
}

export interface LinuxLabState {
  schemaVersion: 'linux.v1';
  lab: { id: string; slug: string; title: string; summary: string | null; capabilities: string[] };
  project: LabProjectIdentity;
  inputs: CanonicalLabManifestV1['inputs'];
  overview: string | null;
  hosts: LinuxHostState[];
  runbook: LabRunbookStepRecord[];
  evidence: CanonicalLabManifestV1['evidence'];
  scenarios: CanonicalLabManifestV1['scenarios'];
  provenance: LinuxStateProvenance;
  warnings: string[];
}

export type LinuxHealthCategory = 'HOST' | 'SERVICE' | 'STORAGE' | 'FSTAB' | 'SELINUX' | 'NETWORK' | 'LOG' | 'DATA';
export type LinuxHealthStatus = 'PASS' | 'WARN' | 'FAIL' | 'UNKNOWN';
export interface LinuxHealthCheck {
  id: string;
  category: LinuxHealthCategory;
  status: LinuxHealthStatus;
  title: string;
  summary: string;
  relatedUnits: string[];
  relatedPaths: string[];
  relatedInterfaces: string[];
  evidence: string[];
}
export type LinuxInvestigationCategory = 'SERVICE' | 'STORAGE' | 'SELINUX' | 'NETWORK' | 'LOG';
export type LinuxFindingSeverity = 'INFO' | 'WARN' | 'CRITICAL';
export interface LinuxInvestigationFinding {
  id: string;
  category: LinuxInvestigationCategory;
  severity: LinuxFindingSeverity;
  title: string;
  summary: string;
  evidence: string[];
  suggestedCommands: string[];
  remediationGuidance: string[];
  relatedUnit: string | null;
  relatedPath: string | null;
  relatedInterface: string | null;
  interpretation: 'RECORDED_STATE_DIAGNOSTIC';
}
export interface LinuxScenarioReadiness {
  id: string;
  slug: string;
  title: string;
  summary: string;
  enabled: boolean;
  observableSignals: string[];
  executionAvailable: false;
}
export interface LinuxOperationsSnapshot {
  schemaVersion: 'linux.operations.v1';
  labId: string;
  labSlug: string;
  hostKey: string;
  hostname: string;
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'UNKNOWN';
  healthChecks: LinuxHealthCheck[];
  findings: LinuxInvestigationFinding[];
  scenarioReadiness: LinuxScenarioReadiness[];
  counts: { services: number; failedServices: number; mounts: number; problemMounts: number; interfaces: number; downInterfaces: number; recordedLogs: number; findings: number };
  executionAvailable: false;
  note: string;
}
export interface LinuxOperatorContext {
  contextId: string;
  prompt: string;
  scope: 'LAB' | 'HOST';
  lab: { id: string; slug: string; title: string };
  host: { key: string; hostname: string; osVersion: string | null } | null;
  availableInspectors: Array<'host' | 'services' | 'storage' | 'fstab' | 'selinux' | 'network' | 'logs' | 'configurations' | 'verification' | 'health' | 'scenarios' | 'evidence'>;
  executionAvailable: false;
  note: string;
}

export type DevOpsObservationSource = 'NORMALIZED_INPUT' | 'RECORDED_PROJECT_FIXTURE' | 'RECORDED_SNAPSHOT';
export type DevOpsStageStatus = 'SUCCESS' | 'RUNNING' | 'PENDING' | 'FAILED' | 'UNKNOWN';
export type DevOpsResourceStatus = 'READY' | 'DEGRADED' | 'FAILED' | 'UNKNOWN';

export interface DevOpsRepositoryState {
  name: string | null;
  branch: string | null;
  commitSha: string | null;
  source: DevOpsObservationSource;
}
export interface DevOpsPipelineStageState {
  id: string;
  name: string;
  tool: string | null;
  status: DevOpsStageStatus;
  durationSeconds: number | null;
  recordedOutput: string | null;
  artifacts: string[];
  source: DevOpsObservationSource;
}
export interface DevOpsPipelineState {
  id: string;
  name: string;
  framework: string | null;
  status: DevOpsStageStatus;
  stages: DevOpsPipelineStageState[];
  source: DevOpsObservationSource;
}
export interface DevOpsIaCFile {
  name: string;
  path: string;
  type: 'FILE' | 'DIRECTORY';
  size: string | null;
  content: string | null;
  source: DevOpsObservationSource;
}
export interface DevOpsTerraformState {
  present: boolean;
  workspace: string | null;
  backend: string | null;
  files: DevOpsIaCFile[];
  driftStatus: 'CLEAN' | 'DRIFTED' | 'ERROR' | 'UNKNOWN';
  driftSummary: string | null;
  recordedPlanOutput: string | null;
  source: DevOpsObservationSource;
}
export interface DevOpsKubernetesCluster {
  name: string;
  version: string | null;
  status: DevOpsResourceStatus;
  provider: string | null;
  source: DevOpsObservationSource;
}
export interface DevOpsKubernetesWorkload {
  kind: string;
  namespace: string | null;
  name: string;
  desiredReplicas: number | null;
  readyReplicas: number | null;
  status: DevOpsResourceStatus;
  image: string | null;
  source: DevOpsObservationSource;
}
export interface DevOpsGitOpsApplication {
  name: string;
  controller: string;
  syncStatus: 'SYNCED' | 'OUT_OF_SYNC' | 'UNKNOWN';
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'UNKNOWN';
  revision: string | null;
  destination: string | null;
  source: DevOpsObservationSource;
}
export interface DevOpsHelmRelease {
  name: string;
  namespace: string | null;
  chart: string | null;
  version: string | null;
  status: DevOpsResourceStatus;
  source: DevOpsObservationSource;
}
export interface DevOpsNetworkPolicyRecord {
  name: string;
  namespace: string | null;
  provider: string | null;
  status: 'ENFORCED' | 'RECORDED' | 'UNKNOWN';
  summary: string | null;
  source: DevOpsObservationSource;
}
export interface DevOpsObservabilitySnapshot {
  id: string;
  name: string;
  provider: string | null;
  status: 'PASS' | 'WARN' | 'FAIL' | 'UNKNOWN';
  summary: string | null;
  recordedOutput: string | null;
  source: DevOpsObservationSource;
}
export interface DevOpsArchitectureLayer {
  tier: string;
  description: string | null;
  technologies: string[];
  recordedMetric: string | null;
}
export interface DevOpsStateProvenance {
  sourceType: 'CANONICAL_MANIFEST' | 'NORMALIZED_PROJECT_FIXTURE' | 'UNKNOWN';
  inputTypes: string[];
  notes: string[];
}
export interface DevOpsLabSummary {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  project: LabProjectIdentity;
  capabilities: string[];
  pipelineCount: number;
  kubernetesClusterCount: number;
  inputTypes: string[];
}
export interface DevOpsLabState {
  schemaVersion: 'devops.v1';
  lab: { id: string; slug: string; title: string; summary: string | null; capabilities: string[] };
  project: LabProjectIdentity;
  inputs: CanonicalLabManifestV1['inputs'];
  overview: string | null;
  repository: DevOpsRepositoryState | null;
  pipelines: DevOpsPipelineState[];
  terraform: DevOpsTerraformState | null;
  kubernetes: { clusters: DevOpsKubernetesCluster[]; workloads: DevOpsKubernetesWorkload[] };
  gitops: DevOpsGitOpsApplication[];
  helm: DevOpsHelmRelease[];
  networkPolicies: DevOpsNetworkPolicyRecord[];
  observability: DevOpsObservabilitySnapshot[];
  architecture: DevOpsArchitectureLayer[];
  runbook: LabRunbookStepRecord[];
  evidence: CanonicalLabManifestV1['evidence'];
  scenarios: CanonicalLabManifestV1['scenarios'];
  provenance: DevOpsStateProvenance;
  warnings: string[];
}


export type DevOpsHealthCategory = 'PIPELINE' | 'TERRAFORM' | 'KUBERNETES' | 'GITOPS' | 'HELM' | 'NETWORK_POLICY' | 'OBSERVABILITY' | 'DATA';
export type DevOpsHealthStatus = 'PASS' | 'WARN' | 'FAIL' | 'UNKNOWN';

export interface DevOpsHealthCheck {
  id: string;
  category: DevOpsHealthCategory;
  status: DevOpsHealthStatus;
  title: string;
  summary: string;
  evidence: string[];
  relatedResources: string[];
}

export type DevOpsInvestigationCategory = 'PIPELINE' | 'TERRAFORM' | 'KUBERNETES' | 'GITOPS' | 'HELM' | 'NETWORK_POLICY' | 'OBSERVABILITY';
export type DevOpsFindingSeverity = 'INFO' | 'WARN' | 'CRITICAL';

export interface DevOpsInvestigationFinding {
  id: string;
  category: DevOpsInvestigationCategory;
  severity: DevOpsFindingSeverity;
  title: string;
  summary: string;
  evidence: string[];
  suggestedCommands: string[];
  remediationGuidance: string[];
  relatedResource: string | null;
  interpretation: 'RECORDED_STATE_DIAGNOSTIC';
}

export interface DevOpsScenarioReadiness {
  id: string;
  slug: string;
  title: string;
  summary: string;
  enabled: boolean;
  observableSignals: string[];
  executionAvailable: false;
}

export interface DevOpsOperationsSnapshot {
  schemaVersion: 'devops.operations.v1';
  labId: string;
  labSlug: string;
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'UNKNOWN';
  healthChecks: DevOpsHealthCheck[];
  findings: DevOpsInvestigationFinding[];
  scenarioReadiness: DevOpsScenarioReadiness[];
  counts: {
    pipelines: number;
    failedPipelines: number;
    workloads: number;
    problemWorkloads: number;
    gitopsApplications: number;
    outOfSyncApplications: number;
    observations: number;
    failingObservations: number;
    findings: number;
  };
  executionAvailable: false;
  note: string;
}

export interface DevOpsOperatorContext {
  contextId: string;
  prompt: string;
  scope: 'LAB' | 'PIPELINE';
  lab: { id: string; slug: string; title: string };
  pipeline: { id: string; name: string; status: DevOpsStageStatus } | null;
  availableInspectors: Array<'repository' | 'pipelines' | 'terraform' | 'kubernetes' | 'gitops' | 'helm' | 'network-policy' | 'observability' | 'health' | 'scenarios' | 'evidence'>;
  executionAvailable: false;
  note: string;
}
