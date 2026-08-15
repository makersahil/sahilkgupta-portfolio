import type {
  CanonicalLabManifestV1,
  LabProjectIdentity,
  LabRunbookStepRecord,
} from './lab-platform.js';

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

export interface LinuxVolumeGroupRecord {
  name: string;
  size: string | null;
  free: string | null;
  physicalVolumes: string[];
}

export interface LinuxLogicalVolumeRecord {
  name: string;
  volumeGroup: string;
  size: string | null;
  layout: string | null;
  filesystem: string | null;
  mountPoint: string | null;
  state: LinuxMountState;
}

export interface LinuxMountRecord {
  source: string;
  target: string;
  filesystem: string;
  options: string[];
  state: LinuxMountState;
}

export interface LinuxFstabEntry {
  source: string;
  target: string;
  filesystem: string;
  options: string[];
  dump: number | null;
  pass: number | null;
}

export interface LinuxSelinuxBoolean {
  name: string;
  enabled: boolean;
}

export interface LinuxSelinuxPort {
  type: string;
  protocol: string;
  ports: string;
}

export interface LinuxSelinuxContext {
  path: string;
  context: string;
  source: LinuxObservationSource;
}

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

export interface LinuxNetworkInterfaceRecord {
  name: string;
  type: string | null;
  state: 'UP' | 'DOWN' | 'UNKNOWN';
  addresses: string[];
  gateway: string | null;
  dns: string[];
  connection: string | null;
  mtu: number | null;
}

export interface LinuxRouteRecord {
  destination: string;
  gateway: string | null;
  interface: string | null;
  metric: number | null;
  protocol: string | null;
}

export interface LinuxLogRecord {
  id: string;
  source: string;
  priority: string | null;
  timestamp: string | null;
  message: string;
  recorded: true;
}

export interface LinuxConfigRecord {
  path: string;
  format: string;
  content: string;
  description: string | null;
  source: LinuxObservationSource;
}

export interface LinuxVerificationRecord {
  id: string;
  title: string;
  command: string | null;
  recordedObservation: string | null;
  source: LinuxObservationSource | 'EVIDENCE_RECORD';
  evidenceId: string | null;
}

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
  hosts: LinuxHostState[];
  runbook: LabRunbookStepRecord[];
  evidence: CanonicalLabManifestV1['evidence'];
  scenarios: CanonicalLabManifestV1['scenarios'];
  provenance: LinuxStateProvenance;
  warnings: string[];
}
