export type Domain = 'NETWORKING' | 'LINUX' | 'DEVOPS';
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
  terminalTheme: 'green' | 'cyan' | 'amber' | 'violet' | 'emerald';
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
  protocol: 'C' | 'S' | 'O' | 'B' | 'D' | 'i'; // Connected, Static, OSPF, BGP, EIGRP, IS-IS
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

export type {
  CanonicalLabManifestV1,
  LabAggregate,
  LabArtifactReference,
  LabDomain,
  LabEvidenceKind,
  LabEvidenceRecord,
  LabInputRecord,
  LabInputSourceKind,
  LabKind,
  LabLinkRecord,
  LabManifestEvidence,
  LabManifestInputDescriptor,
  LabNodeRecord,
  LabProjectIdentity,
  LabRecord,
  LabRunbookStepRecord,
  LabScenarioRecord,
  LabStatus,
} from './lab-platform.js';

export type {
  CompatibilityTopologyData,
  CompatibilityTopologyLink,
  CompatibilityTopologyNode,
  NetworkingAclRuleState,
  NetworkingDeviceKind,
  NetworkingDeviceState,
  NetworkingInterfaceState,
  NetworkingLabState,
  NetworkingLabSummary,
  NetworkingLinkState,
  NetworkingOperationalStatus,
  NetworkingPathTrace,
  NetworkingPosition,
  NetworkingRouteState,
  NetworkingStateProvenance,
  NetworkingVerificationRecord,
  NetworkingVlanState,
} from './networking.js';
