import type { Project } from './index.js';
import type {
  CanonicalLabManifestV1,
  LabAggregate,
  LabArtifactReference,
  LabDomain,
  LabEvidenceRecord,
  LabKind,
  LabStatus,
} from './lab-platform.js';
import type { DevOpsLabState } from './devops.js';
import type { LinuxLabState } from './linux.js';
import type { NetworkingLabState } from './networking.js';

export type OrchestratorProjectPublicationStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type OrchestratorProjectLifecycleStatus = 'COMPLETED' | 'IN_PROGRESS' | 'ARCHIVED' | 'PLANNED';
export type OrchestratorProjectFormat = 'CISCO_PKT_LAB' | 'RHCSA_MATRIX' | 'DEVOPS_PIPELINE' | 'STANDARD';
export type OrchestratorValidationSeverity = 'ERROR' | 'WARNING' | 'INFO';
export type OrchestratorValidationScope =
  | 'PROJECT'
  | 'LAB'
  | 'INPUT'
  | 'TOPOLOGY'
  | 'SCENARIO'
  | 'RUNBOOK'
  | 'EVIDENCE'
  | 'ARTIFACT'
  | 'PUBLIC_PREVIEW';

export interface OrchestratorValidationFinding {
  code: string;
  severity: OrchestratorValidationSeverity;
  scope: OrchestratorValidationScope;
  path: string;
  message: string;
  projectId: string;
  labId?: string;
  entityId?: string;
  remediation?: string;
}

export interface OrchestratorValidationReport {
  valid: boolean;
  generatedAt: string;
  projectId: string;
  projectRevision: number;
  labRevisions: Record<string, number>;
  errors: number;
  warnings: number;
  findings: OrchestratorValidationFinding[];
}

export interface OrchestratorCategorySummary {
  id: string;
  name: string;
  slug: string;
  domain: LabDomain | null;
  status: OrchestratorProjectPublicationStatus;
}

export interface OrchestratorProjectRecord {
  id: string;
  slug: string;
  title: string;
  domain: LabDomain;
  summary: string;
  descriptionMarkdown: string | null;
  mission: string | null;
  architectureSummary: string | null;
  whatIBuilt: string | null;
  publicationStatus: OrchestratorProjectPublicationStatus;
  lifecycleStatus: OrchestratorProjectLifecycleStatus;
  formatType: OrchestratorProjectFormat;
  featured: boolean;
  sortOrder: number;
  revision: number;
  coverImageUrl: string | null;
  architectureSvg: string | null;
  liveUrl: string | null;
  githubUrl: string | null;
  packetTracerFile: string | null;
  topologyConfigJson: string | null;
  metrics: unknown;
  technologies: string[];
  tags: string[];
  categoryId: string | null;
  category: OrchestratorCategorySummary | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrchestratorLabRecord {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  domain: LabDomain;
  kind: LabKind;
  status: LabStatus;
  sortOrder: number;
  revision: number;
  projectId: string | null;
  isInteractive: boolean;
  manifestVersion: string;
  capabilities: string[];
  normalizedState: unknown;
  metadata: unknown;
  activeRuntimeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrchestratorProjectRunbookStep {
  id: string;
  projectId: string;
  order: number;
  title: string;
  description: string | null;
  command: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrchestratorProjectAggregate {
  project: OrchestratorProjectRecord;
  labs: Array<OrchestratorLabRecord & { aggregate: LabAggregate }>;
  runbookSteps: OrchestratorProjectRunbookStep[];
  evidence: LabEvidenceRecord[];
  artifacts: LabArtifactReference[];
}

export interface OrchestratorDashboardSummary {
  projects: {
    total: number;
    byStatus: Record<OrchestratorProjectPublicationStatus, number>;
    byDomain: Record<LabDomain, number>;
  };
  labs: {
    total: number;
    byStatus: Record<LabStatus, number>;
    byDomain: Record<LabDomain, number>;
    missingPrimaryInput: number;
  };
  activeScenarioRuntimes: number;
  recentAuditEvents: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    createdAt: string;
    actor: string | null;
  }>;
}

export interface OrchestratorProjectCreateInput {
  title: string;
  slug: string;
  domain: LabDomain;
  summary: string;
  descriptionMarkdown?: string | null;
  mission?: string | null;
  architectureSummary?: string | null;
  whatIBuilt?: string | null;
  lifecycleStatus?: OrchestratorProjectLifecycleStatus;
  formatType?: OrchestratorProjectFormat;
  featured?: boolean;
  sortOrder?: number;
  coverImageUrl?: string | null;
  architectureSvg?: string | null;
  liveUrl?: string | null;
  githubUrl?: string | null;
  packetTracerFile?: string | null;
  topologyConfigJson?: string | null;
  metrics?: unknown;
  technologies?: string[];
  tags?: string[];
  categoryId: string;
}

export type OrchestratorProjectUpdateInput = Partial<Omit<OrchestratorProjectCreateInput, 'domain' | 'categoryId'>> & {
  domain?: LabDomain;
  categoryId?: string;
  expectedRevision: number;
};

export interface OrchestratorLabCreateInput {
  slug: string;
  title: string;
  summary?: string | null;
  isInteractive?: boolean;
  manifestVersion?: string;
  capabilities?: string[];
  normalizedState?: unknown;
  metadata?: unknown;
  sortOrder?: number;
}

export type OrchestratorLabUpdateInput = Partial<OrchestratorLabCreateInput> & {
  expectedRevision: number;
};

export interface OrchestratorReorderItem {
  id: string;
  sortOrder: number;
  expectedRevision: number;
}

export interface OrchestratorMarkReadyRequest {
  expectedRevision: number;
}

export interface OrchestratorPublishRequest {
  expectedProjectRevision: number;
  expectedLabRevisions: Record<string, number>;
  readyLabIds: string[];
}

export interface OrchestratorDuplicateProjectRequest {
  slug?: string;
  title?: string;
}

export interface OrchestratorDuplicateLabRequest {
  projectId?: string;
  slug?: string;
  title?: string;
}

export interface OrchestratorProjectPreviewLab {
  lab: OrchestratorLabRecord;
  labRevision: number;
  manifest: CanonicalLabManifestV1;
  domainState: NetworkingLabState | LinuxLabState | DevOpsLabState;
  scenarioSummary: Array<{ id: string; slug: string; title: string; enabled: boolean }>;
  cliContexts: Array<{ contextId: string; prompt: string; domain: LabDomain }>;
  warnings: string[];
}

export interface OrchestratorProjectPreview {
  project: Project;
  projectPublicationStatus: OrchestratorProjectPublicationStatus;
  projectRevision: number;
  validation: OrchestratorValidationReport;
  labs: OrchestratorProjectPreviewLab[];
}

export type PortfolioBundleConflictMode = 'REJECT' | 'RENAME';
export type PortfolioBundleSchemaVersion =
  | 'portfolio.project-bundle.v1'
  | 'portfolio.lab-bundle.v1'
  | 'networking.companion-manifest.v1';

export interface SafeArtifactReferenceBundle {
  id?: string;
  fileName: string;
  originalName?: string | null;
  mimeType: string;
  sizeBytes?: number | null;
  storageProvider?: string | null;
  publicUrl?: string | null;
  isPublic: boolean;
  referenceOnly: true;
}

export interface PortfolioLabBundleV1 {
  schemaVersion: 'portfolio.lab-bundle.v1';
  exportedAt?: string;
  lab: {
    slug: string;
    title: string;
    summary: string | null;
    domain: LabDomain;
    kind: LabKind;
    isInteractive: boolean;
    manifestVersion: string;
    capabilities: string[];
    normalizedState: unknown;
    metadata: unknown;
    sortOrder: number;
  };
  inputs: Array<{
    inputKey: string;
    inputType: string;
    label: string;
    description: string | null;
    sourceKind: 'INLINE' | 'EXTERNAL' | 'ARTIFACT_REFERENCE';
    schemaVersion: string;
    payload: unknown;
    externalUrl: string | null;
    artifactReference: SafeArtifactReferenceBundle | null;
    isPrimary: boolean;
    sortOrder: number;
  }>;
  topology: {
    nodes: Array<{
      nodeKey: string;
      label: string;
      kind: string;
      description: string | null;
      position: unknown;
      configuration: unknown;
      metadata: unknown;
    }>;
    links: Array<{
      linkKey: string;
      sourceNodeKey: string;
      targetNodeKey: string;
      label: string | null;
      kind: string | null;
      configuration: unknown;
      metadata: unknown;
    }>;
  };
  scenarios: Array<{
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
  }>;
  runbook: Array<{
    order: number;
    title: string;
    description: string | null;
    command: string | null;
    expectedObservation: string | null;
  }>;
  evidence: Array<{
    kind: string;
    title: string;
    description: string | null;
    content: unknown;
    externalUrl: string | null;
    artifactReference: SafeArtifactReferenceBundle | null;
    isPublic: boolean;
    sortOrder: number;
  }>;
  artifacts: SafeArtifactReferenceBundle[];
}

export interface PortfolioProjectBundleV1 {
  schemaVersion: 'portfolio.project-bundle.v1';
  exportedAt?: string;
  project: {
    slug: string;
    title: string;
    domain: LabDomain;
    summary: string;
    descriptionMarkdown: string | null;
    mission: string | null;
    architectureSummary: string | null;
    whatIBuilt: string | null;
    lifecycleStatus: OrchestratorProjectLifecycleStatus;
    formatType: OrchestratorProjectFormat;
    featured: boolean;
    sortOrder: number;
    coverImageUrl: string | null;
    architectureSvg: string | null;
    liveUrl: string | null;
    githubUrl: string | null;
    packetTracerFile: string | null;
    topologyConfigJson: string | null;
    metrics: unknown;
    technologies: string[];
    tags: string[];
    categorySlug: string;
    categoryId?: string;
  };
  labs: PortfolioLabBundleV1[];
  runbook: Array<{
    order: number;
    title: string;
    description: string | null;
    command: string | null;
  }>;
  evidence: PortfolioLabBundleV1['evidence'];
  artifacts: SafeArtifactReferenceBundle[];
}

export interface NetworkingCompanionManifestV1 {
  schemaVersion: 'networking.companion-manifest.v1';
  lab: PortfolioLabBundleV1['lab'] & { domain: 'NETWORKING'; kind: 'NETWORK_TOPOLOGY' };
  input: PortfolioLabBundleV1['inputs'][number];
  topology: PortfolioLabBundleV1['topology'];
  packetTracerReference?: {
    fileName: string;
    sizeBytes?: number | null;
    sha256?: string | null;
    referenceOnly: true;
  };
}

export interface OrchestratorImportDryRunRequest {
  bundle: unknown;
  conflictMode?: PortfolioBundleConflictMode;
  targetProjectId?: string;
}

export interface OrchestratorImportDryRunResult {
  valid: boolean;
  schemaVersion: PortfolioBundleSchemaVersion | null;
  conflictMode: PortfolioBundleConflictMode;
  proposedProjectSlug: string | null;
  proposedLabSlugs: string[];
  errors: string[];
  warnings: string[];
  counts: Record<string, number>;
}

export interface OrchestratorImportResult {
  projectId: string | null;
  labIds: string[];
  dryRun: OrchestratorImportDryRunResult;
}

export interface OrchestratorArtifactAdminRecord extends LabArtifactReference {
  sizeBytes: number | null;
  storageProvider: string;
  sha256: string | null;
  createdAt: string;
  updatedAt: string;
  referencedByInputs: number;
  referencedByEvidence: number;
}
