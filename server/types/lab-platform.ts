export type LabDomain = 'NETWORKING' | 'LINUX' | 'DEVOPS';
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
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface LabRunbookStepRecord {
  id: string;
  labId: string;
  order: number;
  title: string;
  description: string | null;
  command: string | null;
  expectedObservation: string | null;
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
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

export interface LabManifestInputDescriptor {
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
}

export interface LabManifestEvidence {
  id: string;
  kind: LabEvidenceKind;
  title: string;
  description: string | null;
  content: unknown;
  externalUrl: string | null;
  sortOrder: number;
  artifact: LabArtifactReference | null;
}

export interface CanonicalLabManifestV1 {
  schemaVersion: '1.0';
  lab: {
    id: string;
    slug: string;
    title: string;
    summary: string | null;
    domain: LabDomain;
    kind: LabKind;
    status: LabStatus;
    isInteractive: boolean;
    capabilities: string[];
  };
  project: LabProjectIdentity | null;
  inputs: LabManifestInputDescriptor[];
  normalizedState: unknown;
  topology: {
    nodes: LabNodeRecord[];
    links: LabLinkRecord[];
  };
  scenarios: LabScenarioRecord[];
  runbook: LabRunbookStepRecord[];
  evidence: LabManifestEvidence[];
  artifacts: LabArtifactReference[];
}
