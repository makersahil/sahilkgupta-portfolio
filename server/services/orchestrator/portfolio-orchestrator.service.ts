import { ConflictError, NotFoundError, ValidationError } from '../../lib/errors.js';
import type {
  ArtifactAdminQuery,
  ArtifactAdminUpdate,
  PortfolioOrchestratorRepository,
  RevisionWriteResult,
} from '../../repositories/contracts/portfolio-orchestrator.repository.js';
import { portfolioOrchestratorRepository } from '../../repositories/prisma/portfolio-orchestrator.repository.js';
import { PrismaCategoryRepository } from '../../repositories/prisma/category.repository.js';
import type {
  OrchestratorDuplicateLabRequest,
  OrchestratorDuplicateProjectRequest,
  OrchestratorImportDryRunRequest,
  OrchestratorLabCreateInput,
  OrchestratorLabUpdateInput,
  OrchestratorProjectCreateInput,
  OrchestratorProjectUpdateInput,
  OrchestratorPublishRequest,
  OrchestratorReorderItem,
} from '../../types/orchestrator.js';
import type { LabDomain } from '../../types/lab-platform.js';
import { PortfolioBundleService, portfolioBundleService } from './portfolio-bundle.service.js';
import { PortfolioPreviewService, portfolioPreviewService } from './portfolio-preview.service.js';
import { PortfolioValidationService, portfolioValidationService } from './portfolio-validation.service.js';

const categories = new PrismaCategoryRepository();
const SLUG = /^[a-z0-9][a-z0-9-]{1,118}[a-z0-9]$/;

function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new ValidationError(`${field} is required`);
  return value.trim();
}

function optionalText(value: string | null | undefined): string | null | undefined {
  if (value === undefined || value === null) return value;
  return value.trim() || null;
}

function slug(value: string, field: string): string {
  const parsed = text(value, field);
  if (!SLUG.test(parsed)) throw new ValidationError(`${field} must be lowercase kebab-case`);
  return parsed;
}

function integer(value: number | undefined, field: string, fallback = 0): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < 0) throw new ValidationError(`${field} must be a non-negative integer`);
  return value;
}

function strings(value: string[] | undefined): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) throw new ValidationError('Expected an array of strings');
  return [...new Set(value.map((entry) => entry.trim()).filter(Boolean))];
}

function httpUrl(value: string | null | undefined, field: string): string | null | undefined {
  const normalized = optionalText(value);
  if (!normalized) return normalized;
  try {
    const parsed = new URL(normalized);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('unsupported');
  } catch {
    throw new ValidationError(`${field} must be an http(s) URL`);
  }
  return normalized;
}

function jsonSafe(value: unknown, field: string): unknown {
  if (value === undefined) return value;
  try {
    return JSON.parse(JSON.stringify(value)) as unknown;
  } catch {
    throw new ValidationError(`${field} must be JSON-safe`);
  }
}

function resolveWrite<T>(result: RevisionWriteResult<T>, entity: string): T {
  if (result.status === 'OK') return result.value;
  if (result.status === 'NOT_FOUND') throw new NotFoundError(`${entity} not found`);
  throw new ConflictError(`${entity} changed since it was loaded. Reload and review the latest revision.`);
}

function canonicalMutation(input: OrchestratorLabUpdateInput): boolean {
  return input.normalizedState !== undefined || input.metadata !== undefined || input.manifestVersion !== undefined || input.capabilities !== undefined;
}

export class PortfolioOrchestratorService {
  constructor(
    private readonly repository: PortfolioOrchestratorRepository = portfolioOrchestratorRepository,
    private readonly validation: PortfolioValidationService = portfolioValidationService,
    private readonly preview: PortfolioPreviewService = portfolioPreviewService,
    private readonly bundles: PortfolioBundleService = portfolioBundleService,
  ) {}

  dashboard() { return this.repository.dashboard(); }
  listProjects() { return this.repository.listProjects(); }

  async getProject(projectId: string) {
    const aggregate = await this.repository.getProjectAggregate(text(projectId, 'projectId'));
    if (!aggregate) throw new NotFoundError('Project not found');
    return aggregate;
  }

  async getLab(labId: string) {
    const aggregate = await this.repository.getLabAggregate(text(labId, 'labId'));
    if (!aggregate) throw new NotFoundError('Lab not found');
    return aggregate;
  }

  async createProject(input: OrchestratorProjectCreateInput) {
    const normalized = await this.normalizeProjectCreate(input);
    if (await this.repository.findProjectBySlug(normalized.slug)) throw new ConflictError('A Project with this slug already exists');
    return this.repository.createDraftProject(normalized);
  }

  async updateProject(projectId: string, input: OrchestratorProjectUpdateInput) {
    const current = await this.getProject(projectId);
    const normalized: OrchestratorProjectUpdateInput = { expectedRevision: integer(input.expectedRevision, 'expectedRevision') };
    if (input.title !== undefined) normalized.title = text(input.title, 'title');
    if (input.slug !== undefined) {
      normalized.slug = slug(input.slug, 'slug');
      const duplicate = await this.repository.findProjectBySlug(normalized.slug);
      if (duplicate && duplicate.id !== projectId) throw new ConflictError('A Project with this slug already exists');
    }
    if (input.summary !== undefined) normalized.summary = text(input.summary, 'summary');
    if (input.descriptionMarkdown !== undefined) normalized.descriptionMarkdown = optionalText(input.descriptionMarkdown);
    if (input.mission !== undefined) normalized.mission = optionalText(input.mission);
    if (input.architectureSummary !== undefined) normalized.architectureSummary = optionalText(input.architectureSummary);
    if (input.whatIBuilt !== undefined) normalized.whatIBuilt = optionalText(input.whatIBuilt);
    if (input.lifecycleStatus !== undefined) {
      if (!['COMPLETED', 'IN_PROGRESS', 'ARCHIVED', 'PLANNED'].includes(input.lifecycleStatus)) throw new ValidationError('Unsupported lifecycleStatus');
      if (input.lifecycleStatus === 'ARCHIVED') throw new ValidationError('Use the Orchestrator archive workflow instead of editing lifecycleStatus to ARCHIVED');
      normalized.lifecycleStatus = input.lifecycleStatus;
    }
    if (input.formatType !== undefined) normalized.formatType = input.formatType;
    if (input.featured !== undefined) normalized.featured = Boolean(input.featured);
    if (input.sortOrder !== undefined) normalized.sortOrder = integer(input.sortOrder, 'sortOrder');
    if (input.coverImageUrl !== undefined) normalized.coverImageUrl = httpUrl(input.coverImageUrl, 'coverImageUrl');
    if (input.liveUrl !== undefined) normalized.liveUrl = httpUrl(input.liveUrl, 'liveUrl');
    if (input.githubUrl !== undefined) normalized.githubUrl = httpUrl(input.githubUrl, 'githubUrl');
    if (input.architectureSvg !== undefined) normalized.architectureSvg = optionalText(input.architectureSvg);
    if (input.packetTracerFile !== undefined) normalized.packetTracerFile = optionalText(input.packetTracerFile);
    if (input.topologyConfigJson !== undefined) normalized.topologyConfigJson = optionalText(input.topologyConfigJson);
    if (input.metrics !== undefined) normalized.metrics = jsonSafe(input.metrics, 'metrics');
    if (input.technologies !== undefined) normalized.technologies = strings(input.technologies);
    if (input.tags !== undefined) normalized.tags = strings(input.tags);

    let nextDomain: LabDomain = current.project.domain;
    let nextCategoryId = current.project.categoryId;
    if (input.categoryId !== undefined || input.domain !== undefined) {
      nextCategoryId = input.categoryId ?? current.project.categoryId;
      if (!nextCategoryId) throw new ValidationError('categoryId is required');
      const category = await categories.findById(nextCategoryId);
      if (!category || !category.domain) throw new ValidationError('categoryId does not identify a domain Category');
      nextDomain = input.domain ?? category.domain;
      if (category.domain !== nextDomain) throw new ValidationError('Project domain must match Category domain');
      if (current.labs.some((entry) => entry.status !== 'ARCHIVED' && entry.domain !== nextDomain)) throw new ConflictError('Archive or migrate incompatible Labs before changing Project domain');
      normalized.categoryId = nextCategoryId;
      normalized.domain = nextDomain;
    }
    return resolveWrite(await this.repository.updateProject(projectId, normalized), 'Project');
  }

  async createLab(projectId: string, input: OrchestratorLabCreateInput) {
    const project = await this.getProject(projectId);
    const normalized: OrchestratorLabCreateInput = {
      slug: slug(input.slug, 'slug'),
      title: text(input.title, 'title'),
      summary: optionalText(input.summary),
      isInteractive: input.isInteractive ?? true,
      manifestVersion: input.manifestVersion?.trim() || '1.0',
      capabilities: strings(input.capabilities),
      normalizedState: jsonSafe(input.normalizedState, 'normalizedState'),
      metadata: jsonSafe(input.metadata, 'metadata'),
      sortOrder: integer(input.sortOrder, 'sortOrder'),
    };
    if (normalized.manifestVersion !== '1.0') throw new ValidationError('Only Lab Manifest 1.0 is supported');
    if (await this.repository.findLabBySlug(normalized.slug)) throw new ConflictError('A Lab with this slug already exists');
    if (project.project.publicationStatus === 'ARCHIVED') throw new ConflictError('Restore the Project to DRAFT before adding Labs');
    return this.repository.createDraftLab(projectId, normalized);
  }

  async updateLab(labId: string, input: OrchestratorLabUpdateInput) {
    const current = await this.getLab(labId);
    if (canonicalMutation(input)) await this.assertNoActiveRuntime(labId);
    const normalized: OrchestratorLabUpdateInput = { expectedRevision: integer(input.expectedRevision, 'expectedRevision') };
    if (input.slug !== undefined) {
      normalized.slug = slug(input.slug, 'slug');
      const duplicate = await this.repository.findLabBySlug(normalized.slug);
      if (duplicate && duplicate.id !== labId) throw new ConflictError('A Lab with this slug already exists');
    }
    if (input.title !== undefined) normalized.title = text(input.title, 'title');
    if (input.summary !== undefined) normalized.summary = optionalText(input.summary);
    if (input.isInteractive !== undefined) normalized.isInteractive = Boolean(input.isInteractive);
    if (input.manifestVersion !== undefined) {
      normalized.manifestVersion = text(input.manifestVersion, 'manifestVersion');
      if (normalized.manifestVersion !== '1.0') throw new ValidationError('Only Lab Manifest 1.0 is supported');
    }
    if (input.capabilities !== undefined) normalized.capabilities = strings(input.capabilities);
    if (input.normalizedState !== undefined) normalized.normalizedState = jsonSafe(input.normalizedState, 'normalizedState');
    if (input.metadata !== undefined) normalized.metadata = jsonSafe(input.metadata, 'metadata');
    if (input.sortOrder !== undefined) normalized.sortOrder = integer(input.sortOrder, 'sortOrder');
    if (current.status === 'ARCHIVED' && Object.keys(normalized).length > 1) throw new ConflictError('Restore or duplicate an archived Lab before editing it');
    return resolveWrite(await this.repository.updateLab(labId, normalized), 'Lab');
  }

  validateProject(projectId: string) { return this.validation.validateProject(projectId, false); }
  validateLab(labId: string) { return this.validation.validateLab(labId, false); }
  previewProject(projectId: string) { return this.preview.previewProject(projectId); }
  previewLab(labId: string) { return this.preview.previewLab(labId); }

  async markLabReady(labId: string, expectedRevision: number) {
    await this.assertNoActiveRuntime(labId);
    const report = await this.validation.validateLab(labId, true);
    if (!report.valid) throw new ValidationError('Lab validation failed', { report });
    return { lab: resolveWrite(await this.repository.markLabReady(labId, integer(expectedRevision, 'expectedRevision')), 'Lab'), validation: report };
  }

  async publishProject(projectId: string, request: OrchestratorPublishRequest) {
    const aggregate = await this.getProject(projectId);
    const selected = [...new Set(request.readyLabIds.map((entry) => text(entry, 'readyLabIds')))];
    if (selected.length === 0) throw new ValidationError('At least one Lab must be selected for publication');
    const selectedLabs = aggregate.labs.filter((entry) => selected.includes(entry.id));
    if (selectedLabs.length !== selected.length) throw new ValidationError('Every selected Lab must belong to the Project');
    if (selectedLabs.some((entry) => entry.status === 'ARCHIVED')) throw new ValidationError('Archived Labs cannot be selected for publication');
    const alreadyReadyButUnselected = aggregate.labs.filter((entry) => entry.status === 'READY' && !selected.includes(entry.id));
    if (alreadyReadyButUnselected.length > 0) {
      throw new ConflictError('Every existing READY Lab must remain selected or be archived before republishing the Project.');
    }
    const aggregateLabIds = new Set(aggregate.labs.map((entry) => entry.id));
    const suppliedLabIds = Object.keys(request.expectedLabRevisions);
    if (suppliedLabIds.length !== aggregate.labs.length || suppliedLabIds.some((labId) => !aggregateLabIds.has(labId))) {
      throw new ValidationError('expectedLabRevisions must contain the complete current Project Lab snapshot');
    }
    for (const lab of aggregate.labs) {
      const expected = request.expectedLabRevisions[lab.id];
      if (!Number.isInteger(expected) || expected < 1) {
        throw new ValidationError(`expectedLabRevisions is missing a valid revision for Lab ${lab.id}`);
      }
      if (expected !== lab.revision) throw new ConflictError(`Lab ${lab.id} changed since validation/preview. Reload before publishing.`);
    }
    if (integer(request.expectedProjectRevision, 'expectedProjectRevision') !== aggregate.project.revision) {
      throw new ConflictError('Project changed since validation/preview. Reload before publishing.');
    }
    const report = await this.validation.validateProject(projectId, true, selected);
    if (!report.valid) throw new ValidationError('Project publication validation failed', { report });
    for (const lab of selectedLabs) {
      await this.assertNoActiveRuntime(lab.id);
    }
    const result = resolveWrite(
      await this.repository.publishProject(
        projectId,
        integer(request.expectedProjectRevision, 'expectedProjectRevision'),
        request.expectedLabRevisions,
        selected,
      ),
      'Project',
    );
    return { ...result, validation: report, preview: await this.preview.previewProject(projectId) };
  }

  archiveProject(projectId: string, expectedRevision: number) {
    return this.repository.archiveProject(projectId, integer(expectedRevision, 'expectedRevision')).then((result) => resolveWrite(result, 'Project'));
  }

  restoreProject(projectId: string, expectedRevision: number, lifecycleStatus: 'COMPLETED' | 'IN_PROGRESS' | 'PLANNED') {
    if (!['COMPLETED', 'IN_PROGRESS', 'PLANNED'].includes(lifecycleStatus)) throw new ValidationError('Unsupported lifecycleStatus for restore');
    return this.repository.restoreProject(projectId, integer(expectedRevision, 'expectedRevision'), lifecycleStatus).then((result) => resolveWrite(result, 'Project'));
  }

  async archiveLab(labId: string, expectedRevision: number) {
    return resolveWrite(await this.repository.archiveLab(labId, integer(expectedRevision, 'expectedRevision')), 'Lab');
  }

  async resetLabRuntimes(labId: string) {
    const count = await this.repository.resetLabRuntimes(labId);
    if (count === null) throw new NotFoundError('Lab not found');
    return { deletedRuntimes: count };
  }

  async duplicateProject(projectId: string, input: OrchestratorDuplicateProjectRequest) {
    if (input.slug !== undefined) input.slug = slug(input.slug, 'slug');
    const result = await this.repository.duplicateProject(projectId, input);
    if (!result) throw new NotFoundError('Project not found');
    return result;
  }

  async duplicateLab(labId: string, input: OrchestratorDuplicateLabRequest) {
    if (input.slug !== undefined) input.slug = slug(input.slug, 'slug');
    if (input.projectId) {
      const source = await this.getLab(labId);
      const destination = await this.getProject(input.projectId);
      if (source.domain !== destination.project.domain) throw new ValidationError('Destination Project domain must match the Lab domain');
    }
    const result = await this.repository.duplicateLab(labId, input);
    if (!result) throw new NotFoundError('Lab not found');
    return result;
  }

  reorderProjects(items: OrchestratorReorderItem[]) {
    this.validateReorder(items);
    return this.repository.reorderProjects(items);
  }

  async reorderLabs(projectId: string, items: OrchestratorReorderItem[]) {
    await this.getProject(projectId);
    this.validateReorder(items);
    return this.repository.reorderLabs(projectId, items);
  }

  async deleteProjectPermanent(projectId: string, confirmation: string) {
    const aggregate = await this.getProject(projectId);
    if (text(confirmation, 'confirmation') !== aggregate.project.title) throw new ValidationError('Typed confirmation must exactly match the Project title');
    if (!['DRAFT', 'ARCHIVED'].includes(aggregate.project.publicationStatus)) throw new ConflictError('Only DRAFT or ARCHIVED Projects may be permanently deleted');
    for (const lab of aggregate.labs) if (await this.repository.activeRuntimeCount(lab.id)) throw new ConflictError('Reset active Lab runtimes before permanent Project deletion');
    if (!(await this.repository.deleteProjectPermanent(projectId))) throw new NotFoundError('Project not found');
  }

  async deleteLabPermanent(labId: string, confirmation: string) {
    const lab = await this.getLab(labId);
    if (text(confirmation, 'confirmation') !== lab.title) throw new ValidationError('Typed confirmation must exactly match the Lab title');
    if (!['DRAFT', 'ARCHIVED'].includes(lab.status)) throw new ConflictError('Only DRAFT or ARCHIVED Labs may be permanently deleted');
    await this.assertNoActiveRuntime(labId);
    if (!(await this.repository.deleteLabPermanent(labId))) throw new NotFoundError('Lab not found');
  }

  async exportProject(projectId: string) {
    const bundle = await this.repository.exportProjectBundle(projectId);
    if (!bundle) throw new NotFoundError('Project not found');
    return bundle;
  }

  async exportLab(labId: string) {
    const bundle = await this.repository.exportLabBundle(labId);
    if (!bundle) throw new NotFoundError('Lab not found');
    return bundle;
  }

  async exportNetworkingCompanion(labId: string) {
    const bundle = await this.repository.exportNetworkingCompanion(labId);
    if (!bundle) throw new NotFoundError('Lab not found');
    return bundle;
  }

  importDryRun(request: OrchestratorImportDryRunRequest) { return this.bundles.dryRun(request); }
  importBundle(request: OrchestratorImportDryRunRequest) { return this.bundles.import(request); }

  listArtifacts(query: ArtifactAdminQuery = {}) { return this.repository.listArtifacts(query); }

  async getArtifact(artifactId: string) {
    const artifact = await this.repository.getArtifact(artifactId);
    if (!artifact) throw new NotFoundError('Artifact not found');
    return artifact;
  }

  async updateArtifact(artifactId: string, input: ArtifactAdminUpdate) {
    const current = await this.getArtifact(artifactId);
    if (input.publicUrl !== undefined) input.publicUrl = httpUrl(input.publicUrl, 'publicUrl');
    if (input.originalName !== undefined) input.originalName = optionalText(input.originalName);
    if (input.mimeType !== undefined) input.mimeType = text(input.mimeType, 'mimeType');
    const nextLabId = input.labId === undefined ? current.labId : input.labId;
    let nextProjectId = input.projectId === undefined ? current.projectId : input.projectId;
    const affectedLabs = new Set([current.labId, nextLabId].filter((value): value is string => Boolean(value)));
    for (const affectedLabId of affectedLabs) await this.assertNoActiveRuntime(affectedLabId);
    if (nextLabId) {
      const lab = await this.getLab(nextLabId);
      if (!lab.projectId) throw new ValidationError('Artifact Lab must belong to a Project');
      if (nextProjectId === null) throw new ValidationError('An Artifact associated with a Lab must also reference that Lab Project');
      if (nextProjectId && lab.projectId !== nextProjectId) throw new ValidationError('Artifact Lab must belong to the selected Project');
      if (input.projectId === undefined) {
        nextProjectId = lab.projectId;
        input.projectId = lab.projectId;
      }
    }
    if (nextProjectId) await this.getProject(nextProjectId);
    const artifact = await this.repository.updateArtifact(artifactId, input);
    if (!artifact) throw new NotFoundError('Artifact not found');
    return artifact;
  }

  async deleteArtifact(artifactId: string) {
    const result = await this.repository.deleteArtifact(artifactId);
    if (result === 'NOT_FOUND') throw new NotFoundError('Artifact not found');
    if (result === 'CONFLICT') throw new ConflictError('Artifact is still referenced by Lab inputs or evidence');
  }

  private async normalizeProjectCreate(input: OrchestratorProjectCreateInput): Promise<OrchestratorProjectCreateInput> {
    const category = await categories.findById(text(input.categoryId, 'categoryId'));
    if (!category?.domain) throw new ValidationError('categoryId does not identify a domain Category');
    if (category.domain !== input.domain) throw new ValidationError('Project domain must match Category domain');
    if (input.lifecycleStatus === 'ARCHIVED') throw new ValidationError('New Projects must start as DRAFT, not ARCHIVED');
    return {
      title: text(input.title, 'title'),
      slug: slug(input.slug, 'slug'),
      domain: input.domain,
      summary: text(input.summary, 'summary'),
      descriptionMarkdown: optionalText(input.descriptionMarkdown),
      mission: optionalText(input.mission),
      architectureSummary: optionalText(input.architectureSummary),
      whatIBuilt: optionalText(input.whatIBuilt),
      lifecycleStatus: input.lifecycleStatus ?? 'PLANNED',
      formatType: input.formatType ?? 'STANDARD',
      featured: input.featured ?? false,
      sortOrder: integer(input.sortOrder, 'sortOrder'),
      coverImageUrl: httpUrl(input.coverImageUrl, 'coverImageUrl'),
      architectureSvg: optionalText(input.architectureSvg),
      liveUrl: httpUrl(input.liveUrl, 'liveUrl'),
      githubUrl: httpUrl(input.githubUrl, 'githubUrl'),
      packetTracerFile: optionalText(input.packetTracerFile),
      topologyConfigJson: optionalText(input.topologyConfigJson),
      metrics: jsonSafe(input.metrics, 'metrics'),
      technologies: strings(input.technologies),
      tags: strings(input.tags),
      categoryId: category.id,
    };
  }

  private async assertNoActiveRuntime(labId: string): Promise<void> {
    const count = await this.repository.activeRuntimeCount(labId);
    if (count > 0) throw new ConflictError(`Lab has ${count} active scenario runtime(s). Reset them explicitly before changing canonical state.`);
  }

  private validateReorder(items: OrchestratorReorderItem[]): void {
    if (!Array.isArray(items) || items.length === 0) throw new ValidationError('At least one reorder item is required');
    const ids = new Set<string>();
    const orders = new Set<number>();
    for (const item of items) {
      const id = text(item.id, 'id');
      const order = integer(item.sortOrder, 'sortOrder');
      integer(item.expectedRevision, 'expectedRevision');
      if (ids.has(id)) throw new ValidationError('Reorder contains a duplicate ID');
      if (orders.has(order)) throw new ValidationError('Reorder contains a duplicate sortOrder');
      ids.add(id);
      orders.add(order);
    }
  }
}

export const portfolioOrchestratorService = new PortfolioOrchestratorService();
