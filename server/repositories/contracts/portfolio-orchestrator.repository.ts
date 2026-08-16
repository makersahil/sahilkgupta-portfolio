import type {
  NetworkingCompanionManifestV1,
  OrchestratorArtifactAdminRecord,
  OrchestratorDashboardSummary,
  OrchestratorDuplicateLabRequest,
  OrchestratorDuplicateProjectRequest,
  OrchestratorLabCreateInput,
  OrchestratorLabRecord,
  OrchestratorLabUpdateInput,
  OrchestratorProjectAggregate,
  OrchestratorProjectCreateInput,
  OrchestratorProjectRecord,
  OrchestratorProjectUpdateInput,
  OrchestratorReorderItem,
  PortfolioLabBundleV1,
  PortfolioProjectBundleV1,
} from '../../types/orchestrator.js';
import type { LabAggregate } from '../../types/lab-platform.js';

export type RevisionWriteResult<T> =
  | { status: 'OK'; value: T }
  | { status: 'NOT_FOUND' }
  | { status: 'CONFLICT'; currentRevision: number };

export interface ArtifactAdminQuery {
  projectId?: string;
  labId?: string;
  isPublic?: boolean;
  mimeType?: string;
  storageProvider?: string;
}

export interface ArtifactAdminUpdate {
  expectedUpdatedAt?: string;
  projectId?: string | null;
  labId?: string | null;
  isPublic?: boolean;
  publicUrl?: string | null;
  originalName?: string | null;
  mimeType?: string;
}

export interface ProjectPublicationWrite {
  project: OrchestratorProjectRecord;
  labs: OrchestratorLabRecord[];
}

export interface PortfolioOrchestratorRepository {
  dashboard(): Promise<OrchestratorDashboardSummary>;
  listProjects(): Promise<OrchestratorProjectRecord[]>;
  findProjectBySlug(slug: string): Promise<OrchestratorProjectRecord | null>;
  findLabBySlug(slug: string): Promise<OrchestratorLabRecord | null>;
  getProjectAggregate(projectId: string): Promise<OrchestratorProjectAggregate | null>;
  getLabAggregate(labId: string): Promise<LabAggregate | null>;

  createDraftProject(input: OrchestratorProjectCreateInput): Promise<OrchestratorProjectAggregate>;
  updateProject(
    projectId: string,
    input: OrchestratorProjectUpdateInput,
  ): Promise<RevisionWriteResult<OrchestratorProjectAggregate>>;
  createDraftLab(projectId: string, input: OrchestratorLabCreateInput): Promise<OrchestratorProjectAggregate>;
  updateLab(labId: string, input: OrchestratorLabUpdateInput): Promise<RevisionWriteResult<LabAggregate>>;

  bumpLabRevision(labId: string): Promise<number | null>;
  activeRuntimeCount(labId: string): Promise<number>;
  resetLabRuntimes(labId: string): Promise<number | null>;

  markLabReady(labId: string, expectedRevision: number): Promise<RevisionWriteResult<LabAggregate>>;
  publishProject(
    projectId: string,
    expectedProjectRevision: number,
    expectedLabRevisions: Record<string, number>,
    readyLabIds: string[],
  ): Promise<RevisionWriteResult<ProjectPublicationWrite>>;
  archiveProject(projectId: string, expectedRevision: number): Promise<RevisionWriteResult<OrchestratorProjectAggregate>>;
  restoreProject(projectId: string, expectedRevision: number, lifecycleStatus: 'COMPLETED' | 'IN_PROGRESS' | 'PLANNED'): Promise<RevisionWriteResult<OrchestratorProjectAggregate>>;
  archiveLab(labId: string, expectedRevision: number): Promise<RevisionWriteResult<{ lab: LabAggregate; deletedRuntimes: number }>>;

  duplicateProject(projectId: string, input: OrchestratorDuplicateProjectRequest): Promise<OrchestratorProjectAggregate | null>;
  duplicateLab(labId: string, input: OrchestratorDuplicateLabRequest): Promise<LabAggregate | null>;
  reorderProjects(items: OrchestratorReorderItem[]): Promise<OrchestratorProjectRecord[]>;
  reorderLabs(projectId: string, items: OrchestratorReorderItem[]): Promise<LabAggregate[]>;

  deleteProjectPermanent(projectId: string): Promise<boolean>;
  deleteLabPermanent(labId: string): Promise<boolean>;

  exportProjectBundle(projectId: string): Promise<PortfolioProjectBundleV1 | null>;
  exportLabBundle(labId: string): Promise<PortfolioLabBundleV1 | null>;
  exportNetworkingCompanion(labId: string): Promise<NetworkingCompanionManifestV1 | null>;
  importProjectBundle(bundle: PortfolioProjectBundleV1): Promise<OrchestratorProjectAggregate>;
  importLabBundle(projectId: string, bundle: PortfolioLabBundleV1): Promise<LabAggregate>;
  importNetworkingCompanion(projectId: string, bundle: NetworkingCompanionManifestV1): Promise<LabAggregate>;

  listArtifacts(query?: ArtifactAdminQuery): Promise<OrchestratorArtifactAdminRecord[]>;
  getArtifact(artifactId: string): Promise<OrchestratorArtifactAdminRecord | null>;
  updateArtifact(artifactId: string, input: ArtifactAdminUpdate): Promise<OrchestratorArtifactAdminRecord | null>;
  deleteArtifact(artifactId: string): Promise<'DELETED' | 'NOT_FOUND' | 'CONFLICT'>;
}
