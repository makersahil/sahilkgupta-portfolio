import { ConflictError, NotFoundError, ValidationError } from '../../lib/errors.js';
import type {
  CreateLabEvidenceInput,
  CreateLabInput,
  CreateLabRunbookStepInput,
  CreateLabScenarioInput,
  CreateLabSourceInput,
  LabLinkInput,
  LabListQuery,
  LabNodeInput,
  LabRepository,
  UpdateLabEvidenceInput,
  UpdateLabInput,
  UpdateLabRunbookStepInput,
  UpdateLabScenarioInput,
  UpdateLabSourceInput,
} from '../../repositories/contracts/lab.repository.js';
import type {
  LabAggregate,
  LabDomain,
  LabEvidenceKind,
  LabInputRecord,
  LabInputSourceKind,
  LabKind,
  LabRecord,
  LabStatus,
} from '../../types/lab-platform.js';
import { getLabInputType, listLabInputTypes } from './lab-input-registry.js';
import { portfolioOrchestratorRepository } from '../../repositories/prisma/portfolio-orchestrator.repository.js';

const LAB_DOMAINS = new Set<LabDomain>(['NETWORKING', 'LINUX', 'DEVOPS']);
const LAB_KINDS = new Set<LabKind>(['NETWORK_TOPOLOGY', 'LINUX_SYSTEM', 'DEVOPS_PIPELINE']);
const LAB_STATUSES = new Set<LabStatus>(['DRAFT', 'READY', 'ARCHIVED']);
const INPUT_SOURCE_KINDS = new Set<LabInputSourceKind>(['INLINE', 'EXTERNAL', 'ARTIFACT_REFERENCE']);
const EVIDENCE_KINDS = new Set<LabEvidenceKind>([
  'CONFIGURATION', 'COMMAND_OUTPUT', 'TOPOLOGY', 'RUNBOOK', 'SCREENSHOT', 'ARTIFACT', 'LINK', 'OTHER',
]);
const KIND_BY_DOMAIN: Record<LabDomain, LabKind> = {
  NETWORKING: 'NETWORK_TOPOLOGY',
  LINUX: 'LINUX_SYSTEM',
  DEVOPS: 'DEVOPS_PIPELINE',
};
const IDENTIFIER_PATTERN = /^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/;
const KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,99}$/;

function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new ValidationError(`${field} is required`, { field });
  return value.trim();
}
function optionalText(value: string | null | undefined): string | null | undefined {
  if (value === undefined || value === null) return value;
  const normalized = value.trim();
  return normalized || null;
}
function integer(value: number, field: string, min = 0): number {
  if (!Number.isInteger(value) || value < min) throw new ValidationError(`${field} must be an integer >= ${min}`, { field });
  return value;
}
function assertSlug(value: string, field: string): string {
  const normalized = text(value, field);
  if (!IDENTIFIER_PATTERN.test(normalized)) throw new ValidationError(`${field} must be a lowercase kebab-case identifier`, { field });
  return normalized;
}
function assertKey(value: string, field: string): string {
  const normalized = text(value, field);
  if (!KEY_PATTERN.test(normalized)) throw new ValidationError(`${field} contains unsupported characters`, { field });
  return normalized;
}
function assertHttpUrl(value: string | null | undefined, field: string): string {
  const normalized = text(value, field);
  try {
    const url = new URL(normalized);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('unsupported protocol');
  } catch {
    throw new ValidationError(`${field} must be an http(s) URL`, { field });
  }
  return normalized;
}
function capabilities(values: string[]): string[] {
  if (!Array.isArray(values) || values.some((entry) => typeof entry !== 'string')) {
    throw new ValidationError('capabilities must be an array of strings', { field: 'capabilities' });
  }
  return [...new Set(values.map((entry) => entry.trim()).filter(Boolean))];
}
function assertDomainKind(domain: LabDomain, kind: LabKind): void {
  if (!LAB_DOMAINS.has(domain)) throw new ValidationError('Unsupported lab domain', { domain });
  if (!LAB_KINDS.has(kind)) throw new ValidationError('Unsupported lab kind', { kind });
  if (KIND_BY_DOMAIN[domain] !== kind) {
    throw new ValidationError('Lab kind must match the project domain', { domain, kind, expectedKind: KIND_BY_DOMAIN[domain] });
  }
}

export class LabService {
  constructor(private readonly labs: LabRepository) {}

  listPublic(query: Omit<LabListQuery, 'status' | 'publishedProjectOnly'> = {}) {
    return this.labs.findAll({ ...query, status: 'READY', publishedProjectOnly: true });
  }

  listAdmin(query: LabListQuery = {}) {
    return this.labs.findAll(query);
  }

  listInputRegistry(domain: LabDomain) {
    if (!LAB_DOMAINS.has(domain)) throw new ValidationError('Unsupported lab domain', { domain });
    return listLabInputTypes(domain);
  }

  async getPublic(identifier: string): Promise<LabRecord> {
    const lab = await this.findLab(identifier);
    if (lab.status !== 'READY' || !lab.project || lab.project.status !== 'PUBLISHED') throw new NotFoundError('Lab not found');
    return lab;
  }

  async getAdmin(identifier: string): Promise<LabAggregate> {
    return this.findAggregate(identifier);
  }

  async create(input: CreateLabInput): Promise<LabRecord> {
    const project = await this.requireProject(input.projectId);
    const duplicate = await this.labs.findBySlug(input.slug);
    if (duplicate) throw new ConflictError('A lab with this slug already exists');
    if (input.status !== 'DRAFT') throw new ValidationError('Admin Lab creation must start in DRAFT; use the Orchestrator readiness workflow');
    const normalized = this.validateLabInput({ ...input, status: 'DRAFT' }, project.domain);
    return this.labs.create({ ...normalized, projectId: project.id });
  }

  async update(id: string, input: UpdateLabInput): Promise<LabRecord> {
    const current = await this.labs.findById(id);
    if (!current) throw new NotFoundError('Lab not found');
    const project = await this.requireProject(input.projectId ?? current.projectId);
    if (input.slug !== undefined) {
      const duplicate = await this.labs.findBySlug(input.slug);
      if (duplicate && duplicate.id !== id) throw new ConflictError('A lab with this slug already exists');
    }
    if (input.status !== undefined && input.status !== current.status) {
      throw new ValidationError('Use the Orchestrator readiness/archive workflow to change Lab status');
    }
    if (
      input.domain !== undefined || input.kind !== undefined || input.projectId !== undefined ||
      input.manifestVersion !== undefined || input.capabilities !== undefined ||
      input.normalizedState !== undefined || input.metadata !== undefined
    ) {
      await this.assertNoActiveRuntime(id);
    }
    const merged: CreateLabInput = {
      slug: input.slug ?? current.slug,
      title: input.title ?? current.title,
      summary: input.summary !== undefined ? input.summary : current.summary,
      domain: input.domain ?? current.domain,
      kind: input.kind ?? current.kind,
      status: current.status,
      sortOrder: input.sortOrder ?? current.sortOrder,
      projectId: project.id,
      isInteractive: input.isInteractive ?? current.isInteractive,
      manifestVersion: input.manifestVersion ?? current.manifestVersion,
      capabilities: input.capabilities ?? current.capabilities,
      normalizedState: input.normalizedState !== undefined ? input.normalizedState : current.normalizedState,
      metadata: input.metadata !== undefined ? input.metadata : current.metadata,
    };
    const normalized = this.validateLabInput(merged, project.domain);
    if (project.id !== current.projectId) {
      await this.assertAggregateCompatibility(id, project.id, project.domain);
    }
    const updated = await this.labs.update(id, { ...normalized, projectId: project.id });
    if (!updated) throw new NotFoundError('Lab not found');
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.assertNoActiveRuntime(id);
    if (!(await this.labs.delete(id))) throw new NotFoundError('Lab not found');
  }

  async createInput(labId: string, input: CreateLabSourceInput): Promise<LabInputRecord> {
    await this.assertNoActiveRuntime(labId);
    const lab = await this.requireAggregate(labId);
    const normalized = await this.validateSourceInput(lab, input);
    if (lab.inputs.some((entry) => entry.inputKey === normalized.inputKey)) throw new ConflictError('A lab input with this key already exists');
    if (normalized.isPrimary && lab.inputs.some((entry) => entry.isPrimary)) throw new ConflictError('A lab may have only one primary input');
    return this.labs.createInput(labId, normalized);
  }

  async updateInput(labId: string, inputId: string, input: UpdateLabSourceInput): Promise<LabInputRecord> {
    await this.assertNoActiveRuntime(labId);
    const lab = await this.requireAggregate(labId);
    const current = lab.inputs.find((entry) => entry.id === inputId);
    if (!current) throw new NotFoundError('Lab input not found');
    const merged: CreateLabSourceInput = {
      inputKey: input.inputKey ?? current.inputKey,
      inputType: input.inputType ?? current.inputType,
      label: input.label ?? current.label,
      description: input.description !== undefined ? input.description : current.description,
      sourceKind: input.sourceKind ?? current.sourceKind,
      schemaVersion: input.schemaVersion ?? current.schemaVersion,
      payload: input.payload !== undefined ? input.payload : current.payload,
      externalUrl: input.externalUrl !== undefined ? input.externalUrl : current.externalUrl,
      artifactId: input.artifactId !== undefined ? input.artifactId : current.artifactId,
      isPrimary: input.isPrimary ?? current.isPrimary,
      sortOrder: input.sortOrder ?? current.sortOrder,
    };
    if (input.sourceKind && input.sourceKind !== current.sourceKind) {
      if (input.sourceKind !== 'INLINE' && input.payload === undefined) merged.payload = undefined;
      if (input.sourceKind !== 'EXTERNAL' && input.externalUrl === undefined) merged.externalUrl = null;
      if (input.sourceKind !== 'ARTIFACT_REFERENCE' && input.artifactId === undefined) merged.artifactId = null;
    }
    const normalized = await this.validateSourceInput(lab, merged);
    if (lab.inputs.some((entry) => entry.id !== inputId && entry.inputKey === normalized.inputKey)) throw new ConflictError('A lab input with this key already exists');
    if (normalized.isPrimary && lab.inputs.some((entry) => entry.id !== inputId && entry.isPrimary)) throw new ConflictError('A lab may have only one primary input');
    const updated = await this.labs.updateInput(labId, inputId, normalized);
    if (!updated) throw new NotFoundError('Lab input not found');
    return updated;
  }

  async deleteInput(labId: string, inputId: string): Promise<void> {
    await this.assertNoActiveRuntime(labId);
    await this.requireLab(labId);
    if (!(await this.labs.deleteInput(labId, inputId))) throw new NotFoundError('Lab input not found');
  }

  async replaceTopology(labId: string, nodes: LabNodeInput[], links: LabLinkInput[]) {
    await this.assertNoActiveRuntime(labId);
    await this.requireLab(labId);
    if (nodes.length > 500) throw new ValidationError('A lab topology may contain at most 500 nodes');
    if (links.length > 2000) throw new ValidationError('A lab topology may contain at most 2000 links');
    const nodeKeys = new Set<string>();
    const cleanNodes = nodes.map((node) => {
      const nodeKey = assertKey(node.nodeKey, 'nodeKey');
      if (nodeKeys.has(nodeKey)) throw new ValidationError('Topology node keys must be unique', { nodeKey });
      nodeKeys.add(nodeKey);
      return { ...node, nodeKey, label: text(node.label, 'label'), kind: text(node.kind, 'kind'), description: optionalText(node.description) };
    });
    const linkKeys = new Set<string>();
    const cleanLinks = links.map((link) => {
      const linkKey = assertKey(link.linkKey, 'linkKey');
      if (linkKeys.has(linkKey)) throw new ValidationError('Topology link keys must be unique', { linkKey });
      linkKeys.add(linkKey);
      const sourceNodeKey = assertKey(link.sourceNodeKey, 'sourceNodeKey');
      const targetNodeKey = assertKey(link.targetNodeKey, 'targetNodeKey');
      if (!nodeKeys.has(sourceNodeKey) || !nodeKeys.has(targetNodeKey)) throw new ValidationError('Topology links must reference node keys in the same payload', { linkKey });
      return { ...link, linkKey, sourceNodeKey, targetNodeKey, label: optionalText(link.label), kind: optionalText(link.kind) };
    });
    return this.labs.replaceTopology(labId, cleanNodes, cleanLinks);
  }

  async createScenario(labId: string, input: CreateLabScenarioInput) {
    await this.assertNoActiveRuntime(labId);
    const lab = await this.requireAggregate(labId);
    const normalized = this.validateScenario(input);
    if (lab.scenarios.some((entry) => entry.slug === normalized.slug)) throw new ConflictError('A scenario with this slug already exists in this lab');
    return this.labs.createScenario(labId, normalized);
  }

  async updateScenario(labId: string, scenarioId: string, input: UpdateLabScenarioInput) {
    await this.assertNoActiveRuntime(labId);
    const lab = await this.requireAggregate(labId);
    const current = lab.scenarios.find((entry) => entry.id === scenarioId);
    if (!current) throw new NotFoundError('Lab scenario not found');
    const merged = this.validateScenario({
      slug: input.slug ?? current.slug,
      title: input.title ?? current.title,
      summary: input.summary ?? current.summary,
      description: input.description !== undefined ? input.description : current.description,
      order: input.order ?? current.order,
      isEnabled: input.isEnabled ?? current.isEnabled,
      baselineState: input.baselineState !== undefined ? input.baselineState : current.baselineState,
      actions: input.actions !== undefined ? input.actions : current.actions,
      expectedObservations: input.expectedObservations !== undefined ? input.expectedObservations : current.expectedObservations,
      verificationCriteria: input.verificationCriteria !== undefined ? input.verificationCriteria : current.verificationCriteria,
    });
    if (lab.scenarios.some((entry) => entry.id !== scenarioId && entry.slug === merged.slug)) throw new ConflictError('A scenario with this slug already exists in this lab');
    const updated = await this.labs.updateScenario(labId, scenarioId, merged);
    if (!updated) throw new NotFoundError('Lab scenario not found');
    return updated;
  }

  async deleteScenario(labId: string, scenarioId: string): Promise<void> {
    await this.assertNoActiveRuntime(labId);
    await this.requireLab(labId);
    if (!(await this.labs.deleteScenario(labId, scenarioId))) throw new NotFoundError('Lab scenario not found');
  }

  async createRunbookStep(labId: string, input: CreateLabRunbookStepInput) {
    const lab = await this.requireAggregate(labId);
    const normalized = this.validateRunbook(input);
    if (lab.runbookSteps.some((entry) => entry.order === normalized.order)) throw new ConflictError('A runbook step with this order already exists');
    return this.labs.createRunbookStep(labId, normalized);
  }

  async updateRunbookStep(labId: string, stepId: string, input: UpdateLabRunbookStepInput) {
    const lab = await this.requireAggregate(labId);
    const current = lab.runbookSteps.find((entry) => entry.id === stepId);
    if (!current) throw new NotFoundError('Lab runbook step not found');
    const merged = this.validateRunbook({
      order: input.order ?? current.order,
      title: input.title ?? current.title,
      description: input.description !== undefined ? input.description : current.description,
      command: input.command !== undefined ? input.command : current.command,
      expectedObservation: input.expectedObservation !== undefined ? input.expectedObservation : current.expectedObservation,
    });
    if (lab.runbookSteps.some((entry) => entry.id !== stepId && entry.order === merged.order)) throw new ConflictError('A runbook step with this order already exists');
    const updated = await this.labs.updateRunbookStep(labId, stepId, merged);
    if (!updated) throw new NotFoundError('Lab runbook step not found');
    return updated;
  }

  async deleteRunbookStep(labId: string, stepId: string): Promise<void> {
    await this.requireLab(labId);
    if (!(await this.labs.deleteRunbookStep(labId, stepId))) throw new NotFoundError('Lab runbook step not found');
  }

  async createEvidence(labId: string, input: CreateLabEvidenceInput) {
    const lab = await this.requireAggregate(labId);
    if (!lab.projectId) throw new ValidationError('Evidence requires a project-backed lab');
    const normalized = await this.validateEvidence(lab, input);
    return this.labs.createEvidence(labId, lab.projectId, normalized);
  }

  async updateEvidence(labId: string, evidenceId: string, input: UpdateLabEvidenceInput) {
    const lab = await this.requireAggregate(labId);
    const current = lab.evidence.find((entry) => entry.id === evidenceId);
    if (!current) throw new NotFoundError('Lab evidence not found');
    const merged = await this.validateEvidence(lab, {
      kind: input.kind ?? current.kind,
      title: input.title ?? current.title,
      description: input.description !== undefined ? input.description : current.description,
      content: input.content !== undefined ? input.content : current.content,
      artifactId: input.artifactId !== undefined ? input.artifactId : current.artifactId,
      externalUrl: input.externalUrl !== undefined ? input.externalUrl : current.externalUrl,
      isPublic: input.isPublic ?? current.isPublic,
      sortOrder: input.sortOrder ?? current.sortOrder,
    });
    const updated = await this.labs.updateEvidence(labId, evidenceId, merged);
    if (!updated) throw new NotFoundError('Lab evidence not found');
    return updated;
  }

  async deleteEvidence(labId: string, evidenceId: string): Promise<void> {
    await this.requireLab(labId);
    if (!(await this.labs.deleteEvidence(labId, evidenceId))) throw new NotFoundError('Lab evidence not found');
  }

  private validateLabInput(input: CreateLabInput, projectDomain: LabDomain): CreateLabInput {
    const slug = assertSlug(input.slug, 'slug');
    const title = text(input.title, 'title');
    if (!LAB_STATUSES.has(input.status)) throw new ValidationError('Unsupported lab status', { status: input.status });
    if (input.domain !== projectDomain) throw new ValidationError('Lab domain must match its project domain', { labDomain: input.domain, projectDomain });
    assertDomainKind(input.domain, input.kind);
    if (input.manifestVersion !== '1.0') throw new ValidationError('Only Lab Manifest v1.0 is supported', { manifestVersion: input.manifestVersion });
    return { ...input, slug, title, summary: optionalText(input.summary), sortOrder: integer(input.sortOrder ?? 0, 'sortOrder'), capabilities: capabilities(input.capabilities) };
  }

  private async validateSourceInput(lab: LabAggregate, input: CreateLabSourceInput): Promise<CreateLabSourceInput> {
    const inputKey = assertKey(input.inputKey, 'inputKey');
    const inputType = text(input.inputType, 'inputType').toUpperCase();
    getLabInputType(lab.domain, inputType);
    const label = text(input.label, 'label');
    if (!INPUT_SOURCE_KINDS.has(input.sourceKind)) throw new ValidationError('Unsupported lab input source kind', { sourceKind: input.sourceKind });
    const schemaVersion = text(input.schemaVersion, 'schemaVersion');
    integer(input.sortOrder, 'sortOrder');
    let payload = input.payload;
    let externalUrl = input.externalUrl ?? null;
    let artifactId = input.artifactId ?? null;
    if (input.sourceKind === 'INLINE') {
      if (payload === undefined || payload === null) throw new ValidationError('INLINE lab inputs require payload');
      if (externalUrl || artifactId) throw new ValidationError('INLINE lab inputs cannot also reference an external URL or artifact');
    } else if (input.sourceKind === 'EXTERNAL') {
      externalUrl = assertHttpUrl(externalUrl, 'externalUrl');
      if (payload !== undefined && payload !== null) throw new ValidationError('EXTERNAL lab inputs cannot contain inline payload');
      if (artifactId) throw new ValidationError('EXTERNAL lab inputs cannot also reference an artifact');
      payload = null;
    } else {
      artifactId = text(artifactId, 'artifactId');
      if ((payload !== undefined && payload !== null) || externalUrl) throw new ValidationError('ARTIFACT_REFERENCE inputs cannot also contain payload or externalUrl');
      await this.assertArtifactScope(lab, artifactId);
      payload = null;
      externalUrl = null;
    }
    return { ...input, inputKey, inputType, label, description: optionalText(input.description), schemaVersion, payload, externalUrl, artifactId, sortOrder: input.sortOrder };
  }

  private validateScenario(input: CreateLabScenarioInput): CreateLabScenarioInput {
    return { ...input, slug: assertSlug(input.slug, 'slug'), title: text(input.title, 'title'), summary: text(input.summary, 'summary'), description: optionalText(input.description), order: integer(input.order, 'order') };
  }

  private validateRunbook(input: CreateLabRunbookStepInput): CreateLabRunbookStepInput {
    return { ...input, order: integer(input.order, 'order', 1), title: text(input.title, 'title'), description: optionalText(input.description), command: optionalText(input.command), expectedObservation: optionalText(input.expectedObservation) };
  }

  private async validateEvidence(lab: LabAggregate, input: CreateLabEvidenceInput): Promise<CreateLabEvidenceInput> {
    if (!EVIDENCE_KINDS.has(input.kind)) throw new ValidationError('Unsupported evidence kind', { kind: input.kind });
    const artifactId = input.artifactId ? text(input.artifactId, 'artifactId') : null;
    if (artifactId) await this.assertArtifactScope(lab, artifactId);
    const externalUrl = input.externalUrl ? assertHttpUrl(input.externalUrl, 'externalUrl') : null;
    return { ...input, title: text(input.title, 'title'), description: optionalText(input.description), artifactId, externalUrl, sortOrder: integer(input.sortOrder ?? 0, 'sortOrder') };
  }

  private async requireProject(projectId: string | null | undefined) {
    const id = text(projectId, 'projectId');
    const project = await this.labs.findProjectById(id);
    if (!project) throw new ValidationError('projectId does not identify an existing project', { projectId: id });
    return project;
  }

  private async findLab(identifier: string): Promise<LabRecord> {
    const lab = await this.labs.findById(identifier) ?? await this.labs.findBySlug(identifier);
    if (!lab) throw new NotFoundError('Lab not found');
    return lab;
  }

  private async requireLab(id: string): Promise<LabRecord> {
    const lab = await this.labs.findById(id);
    if (!lab) throw new NotFoundError('Lab not found');
    return lab;
  }

  private async findAggregate(identifier: string): Promise<LabAggregate> {
    const lab = await this.labs.findAggregateById(identifier) ?? await this.labs.findAggregateBySlug(identifier);
    if (!lab) throw new NotFoundError('Lab not found');
    return lab;
  }

  private requireAggregate(id: string): Promise<LabAggregate> {
    return this.findAggregate(id);
  }

  private async assertNoActiveRuntime(labId: string): Promise<void> {
    const count = await portfolioOrchestratorRepository.activeRuntimeCount(labId);
    if (count > 0) {
      throw new ConflictError(`Lab has ${count} active scenario runtime(s). Reset them through the Portfolio Orchestrator before changing canonical state.`);
    }
  }

  private async assertArtifactScope(lab: LabAggregate, artifactId: string): Promise<void> {
    const artifact = await this.labs.findArtifactById(artifactId);
    if (!artifact) throw new ValidationError('artifactId does not identify an existing artifact', { artifactId });
    if (artifact.labId !== lab.id && artifact.projectId !== lab.projectId) {
      throw new ValidationError('Artifact must belong to this lab or its project', { artifactId, labId: lab.id, projectId: lab.projectId });
    }
  }

  private async assertAggregateCompatibility(labId: string, nextProjectId: string, nextDomain: LabDomain): Promise<void> {
    const aggregate = await this.requireAggregate(labId);
    for (const input of aggregate.inputs) {
      try {
        getLabInputType(nextDomain, input.inputType);
      } catch {
        throw new ValidationError('Lab cannot be reassigned because an existing input type is incompatible with the new project domain', { inputId: input.id, inputType: input.inputType, nextDomain });
      }
    }
    const referenced = [
      ...aggregate.inputs.flatMap((entry) => entry.artifactId ? [entry.artifactId] : []),
      ...aggregate.evidence.flatMap((entry) => entry.artifactId ? [entry.artifactId] : []),
    ];
    for (const artifactId of new Set(referenced)) {
      const artifact = await this.labs.findArtifactById(artifactId);
      if (artifact && artifact.labId !== labId && artifact.projectId !== nextProjectId) {
        throw new ValidationError('Lab cannot be reassigned while referenced artifacts belong to another project', { artifactId, nextProjectId });
      }
    }
  }
}
