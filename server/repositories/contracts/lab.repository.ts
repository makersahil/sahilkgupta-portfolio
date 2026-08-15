import type {
  LabAggregate,
  LabArtifactReference,
  LabDomain,
  LabEvidenceKind,
  LabEvidenceRecord,
  LabInputRecord,
  LabInputSourceKind,
  LabKind,
  LabLinkRecord,
  LabNodeRecord,
  LabRecord,
  LabRunbookStepRecord,
  LabScenarioRecord,
  LabStatus,
} from '../../types/lab-platform.js';

export interface LabListQuery {
  projectId?: string;
  projectSlug?: string;
  domain?: LabDomain;
  kind?: LabKind;
  status?: LabStatus;
  publishedProjectOnly?: boolean;
}

export interface CreateLabInput {
  slug: string;
  title: string;
  summary?: string | null;
  domain: LabDomain;
  kind: LabKind;
  status: LabStatus;
  projectId: string;
  isInteractive: boolean;
  manifestVersion: string;
  capabilities: string[];
  normalizedState?: unknown;
  metadata?: unknown;
}

export type UpdateLabInput = Partial<Omit<CreateLabInput, 'projectId'>> & { projectId?: string };

export interface CreateLabSourceInput {
  inputKey: string;
  inputType: string;
  label: string;
  description?: string | null;
  sourceKind: LabInputSourceKind;
  schemaVersion: string;
  payload?: unknown;
  externalUrl?: string | null;
  artifactId?: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export type UpdateLabSourceInput = Partial<CreateLabSourceInput>;

export interface LabNodeInput {
  nodeKey: string;
  label: string;
  kind: string;
  description?: string | null;
  position?: unknown;
  configuration?: unknown;
  metadata?: unknown;
}

export interface LabLinkInput {
  linkKey: string;
  sourceNodeKey: string;
  targetNodeKey: string;
  label?: string | null;
  kind?: string | null;
  configuration?: unknown;
  metadata?: unknown;
}

export interface CreateLabScenarioInput {
  slug: string;
  title: string;
  summary: string;
  description?: string | null;
  order: number;
  isEnabled: boolean;
  baselineState?: unknown;
  actions?: unknown;
  expectedObservations?: unknown;
  verificationCriteria?: unknown;
}
export type UpdateLabScenarioInput = Partial<CreateLabScenarioInput>;

export interface CreateLabRunbookStepInput {
  order: number;
  title: string;
  description?: string | null;
  command?: string | null;
  expectedObservation?: string | null;
}
export type UpdateLabRunbookStepInput = Partial<CreateLabRunbookStepInput>;

export interface CreateLabEvidenceInput {
  kind: LabEvidenceKind;
  title: string;
  description?: string | null;
  content?: unknown;
  artifactId?: string | null;
  externalUrl?: string | null;
  isPublic: boolean;
  sortOrder: number;
}
export type UpdateLabEvidenceInput = Partial<CreateLabEvidenceInput>;

export interface LabRepository {
  findAll(query?: LabListQuery): Promise<LabRecord[]>;
  findById(id: string): Promise<LabRecord | null>;
  findBySlug(slug: string): Promise<LabRecord | null>;
  findAggregateById(id: string): Promise<LabAggregate | null>;
  findAggregateBySlug(slug: string): Promise<LabAggregate | null>;
  findProjectById(id: string): Promise<LabAggregate['project']>;
  findProjectBySlug(slug: string): Promise<LabAggregate['project']>;
  findArtifactById(id: string): Promise<LabArtifactReference | null>;

  create(input: CreateLabInput): Promise<LabRecord>;
  update(id: string, input: UpdateLabInput): Promise<LabRecord | null>;
  delete(id: string): Promise<boolean>;

  createInput(labId: string, input: CreateLabSourceInput): Promise<LabInputRecord>;
  updateInput(labId: string, inputId: string, input: UpdateLabSourceInput): Promise<LabInputRecord | null>;
  deleteInput(labId: string, inputId: string): Promise<boolean>;

  replaceTopology(labId: string, nodes: LabNodeInput[], links: LabLinkInput[]): Promise<{ nodes: LabNodeRecord[]; links: LabLinkRecord[] }>;

  createScenario(labId: string, input: CreateLabScenarioInput): Promise<LabScenarioRecord>;
  updateScenario(labId: string, scenarioId: string, input: UpdateLabScenarioInput): Promise<LabScenarioRecord | null>;
  deleteScenario(labId: string, scenarioId: string): Promise<boolean>;

  createRunbookStep(labId: string, input: CreateLabRunbookStepInput): Promise<LabRunbookStepRecord>;
  updateRunbookStep(labId: string, stepId: string, input: UpdateLabRunbookStepInput): Promise<LabRunbookStepRecord | null>;
  deleteRunbookStep(labId: string, stepId: string): Promise<boolean>;

  createEvidence(labId: string, projectId: string, input: CreateLabEvidenceInput): Promise<LabEvidenceRecord>;
  updateEvidence(labId: string, evidenceId: string, input: UpdateLabEvidenceInput): Promise<LabEvidenceRecord | null>;
  deleteEvidence(labId: string, evidenceId: string): Promise<boolean>;
}
