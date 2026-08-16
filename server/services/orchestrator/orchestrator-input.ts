import { ValidationError } from '../../lib/errors.js';
import type { ArtifactAdminQuery, ArtifactAdminUpdate } from '../../repositories/contracts/portfolio-orchestrator.repository.js';
import type {
  OrchestratorDuplicateLabRequest,
  OrchestratorDuplicateProjectRequest,
  OrchestratorImportDryRunRequest,
  OrchestratorLabCreateInput,
  OrchestratorLabUpdateInput,
  OrchestratorProjectCreateInput,
  OrchestratorProjectLifecycleStatus,
  OrchestratorProjectUpdateInput,
  OrchestratorPublishRequest,
  OrchestratorReorderItem,
  PortfolioBundleConflictMode,
} from '../../types/orchestrator.js';
import type { LabDomain } from '../../types/lab-platform.js';

type Body = Record<string, unknown>;

function body(value: unknown): Body {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError('Request body must be a JSON object');
  }
  return value as Body;
}

function own(value: Body, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function stringValue(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new ValidationError(`${field} must be a string`);
  return value.trim();
}

function requiredString(value: Body, field: string): string {
  if (!own(value, field)) throw new ValidationError(`${field} is required`);
  const parsed = stringValue(value[field], field);
  if (!parsed) throw new ValidationError(`${field} is required`);
  return parsed;
}

function optionalString(value: Body, field: string): string | null | undefined {
  if (!own(value, field) || value[field] === undefined) return undefined;
  if (value[field] === null) return null;
  return stringValue(value[field], field) || null;
}

function booleanValue(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new ValidationError(`${field} must be a boolean`);
  return value;
}

function optionalBoolean(value: Body, field: string): boolean | undefined {
  if (!own(value, field) || value[field] === undefined) return undefined;
  return booleanValue(value[field], field);
}

function integerValue(value: unknown, field: string): number {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  if (!Number.isInteger(parsed) || parsed < 0) throw new ValidationError(`${field} must be a non-negative integer`);
  return parsed;
}

function requiredInteger(value: Body, field: string): number {
  if (!own(value, field)) throw new ValidationError(`${field} is required`);
  return integerValue(value[field], field);
}

function optionalInteger(value: Body, field: string): number | undefined {
  if (!own(value, field) || value[field] === undefined || value[field] === null || value[field] === '') return undefined;
  return integerValue(value[field], field);
}

function stringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new ValidationError(`${field} must be an array of strings`);
  }
  return value.map((entry) => entry.trim()).filter(Boolean);
}

function optionalStringArray(value: Body, field: string): string[] | undefined {
  if (!own(value, field) || value[field] === undefined || value[field] === null) return undefined;
  return stringArray(value[field], field);
}

function domainValue(value: unknown, field = 'domain'): LabDomain {
  const parsed = stringValue(value, field).toUpperCase();
  if (!['NETWORKING', 'LINUX', 'DEVOPS'].includes(parsed)) {
    throw new ValidationError(`${field} must be NETWORKING, LINUX, or DEVOPS`);
  }
  return parsed as LabDomain;
}

function optionalDomain(value: Body, field = 'domain'): LabDomain | undefined {
  if (!own(value, field) || value[field] === undefined) return undefined;
  return domainValue(value[field], field);
}

function lifecycleValue(value: unknown, field = 'lifecycleStatus'): OrchestratorProjectLifecycleStatus {
  const parsed = stringValue(value, field).toUpperCase();
  if (!['COMPLETED', 'IN_PROGRESS', 'ARCHIVED', 'PLANNED'].includes(parsed)) {
    throw new ValidationError(`${field} has an unsupported value`);
  }
  return parsed as OrchestratorProjectLifecycleStatus;
}

function formatValue(value: unknown, field = 'formatType'): OrchestratorProjectCreateInput['formatType'] {
  const parsed = stringValue(value, field).toUpperCase();
  if (!['CISCO_PKT_LAB', 'RHCSA_MATRIX', 'DEVOPS_PIPELINE', 'STANDARD'].includes(parsed)) {
    throw new ValidationError(`${field} has an unsupported value`);
  }
  return parsed as OrchestratorProjectCreateInput['formatType'];
}

function optionalJson(value: Body, field: string): unknown {
  return own(value, field) ? value[field] : undefined;
}

function requiredObject(value: Body, field: string): Record<string, unknown> {
  const candidate = value[field];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new ValidationError(`${field} must be an object`);
  }
  return candidate as Record<string, unknown>;
}

function conflictMode(value: unknown): PortfolioBundleConflictMode {
  if (value === undefined || value === null || value === '') return 'REJECT';
  const parsed = stringValue(value, 'conflictMode').toUpperCase();
  if (!['REJECT', 'RENAME'].includes(parsed)) throw new ValidationError('conflictMode must be REJECT or RENAME');
  return parsed as PortfolioBundleConflictMode;
}

export function parseOrchestratorProjectCreate(value: unknown): OrchestratorProjectCreateInput {
  const input = body(value);
  return {
    title: requiredString(input, 'title'),
    slug: requiredString(input, 'slug'),
    domain: domainValue(input.domain),
    summary: requiredString(input, 'summary'),
    categoryId: requiredString(input, 'categoryId'),
    descriptionMarkdown: optionalString(input, 'descriptionMarkdown'),
    mission: optionalString(input, 'mission'),
    architectureSummary: optionalString(input, 'architectureSummary'),
    whatIBuilt: optionalString(input, 'whatIBuilt'),
    lifecycleStatus: own(input, 'lifecycleStatus') ? lifecycleValue(input.lifecycleStatus) : undefined,
    formatType: own(input, 'formatType') ? formatValue(input.formatType) : undefined,
    featured: optionalBoolean(input, 'featured'),
    sortOrder: optionalInteger(input, 'sortOrder'),
    coverImageUrl: optionalString(input, 'coverImageUrl'),
    architectureSvg: optionalString(input, 'architectureSvg'),
    liveUrl: optionalString(input, 'liveUrl'),
    githubUrl: optionalString(input, 'githubUrl'),
    packetTracerFile: optionalString(input, 'packetTracerFile'),
    topologyConfigJson: optionalString(input, 'topologyConfigJson'),
    metrics: optionalJson(input, 'metrics'),
    technologies: optionalStringArray(input, 'technologies'),
    tags: optionalStringArray(input, 'tags'),
  };
}

export function parseOrchestratorProjectUpdate(value: unknown): OrchestratorProjectUpdateInput {
  const input = body(value);
  const output: OrchestratorProjectUpdateInput = { expectedRevision: requiredInteger(input, 'expectedRevision') };
  if (own(input, 'title')) output.title = requiredString(input, 'title');
  if (own(input, 'slug')) output.slug = requiredString(input, 'slug');
  if (own(input, 'domain')) output.domain = optionalDomain(input);
  if (own(input, 'summary')) output.summary = requiredString(input, 'summary');
  if (own(input, 'categoryId')) output.categoryId = requiredString(input, 'categoryId');
  for (const field of ['descriptionMarkdown', 'mission', 'architectureSummary', 'whatIBuilt', 'coverImageUrl', 'architectureSvg', 'liveUrl', 'githubUrl', 'packetTracerFile', 'topologyConfigJson'] as const) {
    if (own(input, field)) output[field] = optionalString(input, field);
  }
  if (own(input, 'lifecycleStatus')) output.lifecycleStatus = lifecycleValue(input.lifecycleStatus);
  if (own(input, 'formatType')) output.formatType = formatValue(input.formatType);
  if (own(input, 'featured')) output.featured = booleanValue(input.featured, 'featured');
  if (own(input, 'sortOrder')) output.sortOrder = requiredInteger(input, 'sortOrder');
  if (own(input, 'metrics')) output.metrics = input.metrics;
  if (own(input, 'technologies')) output.technologies = stringArray(input.technologies, 'technologies');
  if (own(input, 'tags')) output.tags = stringArray(input.tags, 'tags');
  return output;
}

export function parseOrchestratorLabCreate(value: unknown): OrchestratorLabCreateInput {
  const input = body(value);
  return {
    slug: requiredString(input, 'slug'),
    title: requiredString(input, 'title'),
    summary: optionalString(input, 'summary'),
    isInteractive: optionalBoolean(input, 'isInteractive'),
    manifestVersion: own(input, 'manifestVersion') ? requiredString(input, 'manifestVersion') : undefined,
    capabilities: optionalStringArray(input, 'capabilities'),
    normalizedState: optionalJson(input, 'normalizedState'),
    metadata: optionalJson(input, 'metadata'),
    sortOrder: optionalInteger(input, 'sortOrder'),
  };
}

export function parseOrchestratorLabUpdate(value: unknown): OrchestratorLabUpdateInput {
  const input = body(value);
  const output: OrchestratorLabUpdateInput = { expectedRevision: requiredInteger(input, 'expectedRevision') };
  if (own(input, 'slug')) output.slug = requiredString(input, 'slug');
  if (own(input, 'title')) output.title = requiredString(input, 'title');
  if (own(input, 'summary')) output.summary = optionalString(input, 'summary');
  if (own(input, 'isInteractive')) output.isInteractive = booleanValue(input.isInteractive, 'isInteractive');
  if (own(input, 'manifestVersion')) output.manifestVersion = requiredString(input, 'manifestVersion');
  if (own(input, 'capabilities')) output.capabilities = stringArray(input.capabilities, 'capabilities');
  if (own(input, 'normalizedState')) output.normalizedState = input.normalizedState;
  if (own(input, 'metadata')) output.metadata = input.metadata;
  if (own(input, 'sortOrder')) output.sortOrder = requiredInteger(input, 'sortOrder');
  return output;
}

export function parseExpectedRevision(value: unknown): number {
  return requiredInteger(body(value), 'expectedRevision');
}

export function parseDeleteConfirmation(value: unknown): string {
  return requiredString(body(value), 'confirmation');
}

export function parseRestoreDraft(value: unknown): { expectedRevision: number; lifecycleStatus: 'COMPLETED' | 'IN_PROGRESS' | 'PLANNED' } {
  const input = body(value);
  const lifecycleStatus = lifecycleValue(input.lifecycleStatus);
  if (lifecycleStatus === 'ARCHIVED') throw new ValidationError('Restore lifecycleStatus cannot be ARCHIVED');
  return { expectedRevision: requiredInteger(input, 'expectedRevision'), lifecycleStatus };
}

export function parsePublish(value: unknown): OrchestratorPublishRequest {
  const input = body(value);
  const revisions = requiredObject(input, 'expectedLabRevisions');
  const expectedLabRevisions: Record<string, number> = {};
  for (const [labId, revision] of Object.entries(revisions)) {
    const normalizedId = labId.trim();
    if (!normalizedId) throw new ValidationError('expectedLabRevisions contains an empty Lab ID');
    expectedLabRevisions[normalizedId] = integerValue(revision, `expectedLabRevisions.${normalizedId}`);
  }
  return {
    expectedProjectRevision: requiredInteger(input, 'expectedProjectRevision'),
    expectedLabRevisions,
    readyLabIds: stringArray(input.readyLabIds, 'readyLabIds'),
  };
}

export function parseProjectDuplicate(value: unknown): OrchestratorDuplicateProjectRequest {
  const input = body(value ?? {});
  return { slug: optionalString(input, 'slug') ?? undefined, title: optionalString(input, 'title') ?? undefined };
}

export function parseLabDuplicate(value: unknown): OrchestratorDuplicateLabRequest {
  const input = body(value ?? {});
  return {
    projectId: optionalString(input, 'projectId') ?? undefined,
    slug: optionalString(input, 'slug') ?? undefined,
    title: optionalString(input, 'title') ?? undefined,
  };
}

export function parseReorder(value: unknown): OrchestratorReorderItem[] {
  const input = body(value);
  if (!Array.isArray(input.items)) throw new ValidationError('items must be an array');
  return input.items.map((entry) => {
    const item = body(entry);
    return {
      id: requiredString(item, 'id'),
      sortOrder: requiredInteger(item, 'sortOrder'),
      expectedRevision: requiredInteger(item, 'expectedRevision'),
    } satisfies OrchestratorReorderItem;
  });
}

export function parseImport(value: unknown): OrchestratorImportDryRunRequest {
  const input = body(value);
  if (!own(input, 'bundle')) throw new ValidationError('bundle is required');
  return {
    bundle: input.bundle,
    conflictMode: conflictMode(input.conflictMode),
    targetProjectId: optionalString(input, 'targetProjectId') ?? undefined,
  };
}

export function parseArtifactUpdate(value: unknown): ArtifactAdminUpdate {
  const input = body(value);
  const output: ArtifactAdminUpdate = {};
  if (own(input, 'expectedUpdatedAt')) output.expectedUpdatedAt = requiredString(input, 'expectedUpdatedAt');
  if (own(input, 'projectId')) output.projectId = optionalString(input, 'projectId');
  if (own(input, 'labId')) output.labId = optionalString(input, 'labId');
  if (own(input, 'isPublic')) output.isPublic = booleanValue(input.isPublic, 'isPublic');
  if (own(input, 'publicUrl')) output.publicUrl = optionalString(input, 'publicUrl');
  if (own(input, 'originalName')) output.originalName = optionalString(input, 'originalName');
  if (own(input, 'mimeType')) output.mimeType = requiredString(input, 'mimeType');
  return output;
}

export function parseArtifactQuery(query: Record<string, unknown>): ArtifactAdminQuery {
  const output: ArtifactAdminQuery = {};
  for (const field of ['projectId', 'labId', 'mimeType', 'storageProvider'] as const) {
    const value = query[field];
    if (value === undefined) continue;
    if (typeof value !== 'string') throw new ValidationError(`${field} query parameter must be a string`);
    const normalized = value.trim();
    if (normalized) output[field] = normalized;
  }
  if (query.isPublic !== undefined) {
    if (query.isPublic === 'true') output.isPublic = true;
    else if (query.isPublic === 'false') output.isPublic = false;
    else throw new ValidationError('isPublic query parameter must be true or false');
  }
  return output;
}
