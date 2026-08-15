import type {
  CanonicalLabManifestV1,
  LabProjectIdentity,
  LabRunbookStepRecord,
} from './lab-platform.js';

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
  repository: DevOpsRepositoryState | null;
  pipelines: DevOpsPipelineState[];
  terraform: DevOpsTerraformState | null;
  kubernetes: {
    clusters: DevOpsKubernetesCluster[];
    workloads: DevOpsKubernetesWorkload[];
  };
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
