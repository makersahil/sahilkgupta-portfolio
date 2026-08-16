import { Prisma, type PrismaClient } from '@prisma/client';

import { ConflictError, ValidationError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import type {
  ArtifactAdminQuery,
  ArtifactAdminUpdate,
  PortfolioOrchestratorRepository,
  ProjectPublicationWrite,
  RevisionWriteResult,
} from '../contracts/portfolio-orchestrator.repository.js';
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
  SafeArtifactReferenceBundle,
} from '../../types/orchestrator.js';
import type {
  LabAggregate,
  LabArtifactReference,
  LabEvidenceRecord,
  LabInputRecord,
  LabLinkRecord,
  LabNodeRecord,
  LabRecord,
  LabRunbookStepRecord,
  LabScenarioRecord,
} from '../../types/lab-platform.js';

const categorySelect = {
  id: true,
  name: true,
  slug: true,
  domain: true,
  status: true,
} satisfies Prisma.CategorySelect;

const projectIdentitySelect = {
  id: true,
  slug: true,
  title: true,
  domain: true,
  status: true,
} satisfies Prisma.ProjectSelect;

const artifactSelect = {
  id: true,
  fileName: true,
  originalName: true,
  mimeType: true,
  publicUrl: true,
  projectId: true,
  labId: true,
  isPublic: true,
  sizeBytes: true,
  storageProvider: true,
  sha256: true,
} satisfies Prisma.ArtifactSelect;

const labAggregateInclude = {
  project: { select: projectIdentitySelect },
  inputs: {
    include: { artifact: { select: artifactSelect } },
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
  },
  nodes: { orderBy: { createdAt: 'asc' as const } },
  links: { orderBy: { createdAt: 'asc' as const } },
  scenarios: { orderBy: [{ order: 'asc' as const }, { createdAt: 'asc' as const }] },
  scenarioRuntimes: { select: { id: true, status: true } },
  runbookSteps: { orderBy: [{ order: 'asc' as const }, { createdAt: 'asc' as const }] },
  evidence: {
    include: { artifact: { select: artifactSelect } },
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
  },
  artifacts: { select: artifactSelect, orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.LabInclude;

const projectAggregateInclude = {
  category: { select: categorySelect },
  labs: {
    include: labAggregateInclude,
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
  },
  runbookSteps: { orderBy: [{ order: 'asc' as const }, { createdAt: 'asc' as const }] },
  evidence: {
    include: { artifact: { select: artifactSelect } },
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
  },
  artifacts: { select: artifactSelect, orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.ProjectInclude;

type LabAggregateRow = Prisma.LabGetPayload<{ include: typeof labAggregateInclude }>;
type ProjectAggregateRow = Prisma.ProjectGetPayload<{ include: typeof projectAggregateInclude }>;
type ProjectRow = Prisma.ProjectGetPayload<{ include: { category: { select: typeof categorySelect } } }>;
type ArtifactAdminRow = Prisma.ArtifactGetPayload<{
  include: { _count: { select: { labInputs: true; evidence: true } } };
}>;

function jsonWrite(value: unknown | undefined): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.DbNull;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function mapArtifact(row: Prisma.ArtifactGetPayload<{ select: typeof artifactSelect }>): LabArtifactReference {
  return { ...row };
}

function mapInput(row: LabAggregateRow['inputs'][number]): LabInputRecord {
  return {
    id: row.id,
    labId: row.labId,
    inputKey: row.inputKey,
    inputType: row.inputType,
    label: row.label,
    description: row.description,
    sourceKind: row.sourceKind,
    schemaVersion: row.schemaVersion,
    payload: row.payload,
    externalUrl: row.externalUrl,
    artifactId: row.artifactId,
    isPrimary: row.isPrimary,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    artifact: row.artifact ? mapArtifact(row.artifact) : null,
  };
}

function mapNode(row: LabAggregateRow['nodes'][number]): LabNodeRecord {
  return { ...row };
}

function mapLink(row: LabAggregateRow['links'][number]): LabLinkRecord {
  return { ...row };
}

function mapScenario(row: LabAggregateRow['scenarios'][number]): LabScenarioRecord {
  return { ...row };
}

function mapRunbook(row: LabAggregateRow['runbookSteps'][number]): LabRunbookStepRecord {
  return { ...row };
}

function mapEvidence(row: LabAggregateRow['evidence'][number] | ProjectAggregateRow['evidence'][number]): LabEvidenceRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    labId: row.labId,
    kind: row.kind,
    title: row.title,
    description: row.description,
    content: row.content,
    artifactId: row.artifactId,
    externalUrl: row.externalUrl,
    isPublic: row.isPublic,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    artifact: row.artifact ? mapArtifact(row.artifact) : null,
  };
}

function mapLabRecord(row: LabAggregateRow): OrchestratorLabRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    domain: row.domain,
    kind: row.kind,
    status: row.status,
    sortOrder: row.sortOrder,
    revision: row.revision,
    projectId: row.projectId,
    isInteractive: row.isInteractive,
    manifestVersion: row.manifestVersion,
    capabilities: [...row.capabilities],
    normalizedState: row.normalizedState,
    metadata: row.metadata,
    activeRuntimeCount: row.scenarioRuntimes.filter((entry) => entry.status === 'ACTIVE').length,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapLabAggregate(row: LabAggregateRow): LabAggregate {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    domain: row.domain,
    kind: row.kind,
    status: row.status,
    sortOrder: row.sortOrder,
    revision: row.revision,
    projectId: row.projectId,
    isInteractive: row.isInteractive,
    manifestVersion: row.manifestVersion,
    capabilities: [...row.capabilities],
    normalizedState: row.normalizedState,
    metadata: row.metadata,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    project: row.project,
    inputs: row.inputs.map(mapInput),
    nodes: row.nodes.map(mapNode),
    links: row.links.map(mapLink),
    scenarios: row.scenarios.map(mapScenario),
    runbookSteps: row.runbookSteps.map(mapRunbook),
    evidence: row.evidence.map(mapEvidence),
    artifacts: row.artifacts.map(mapArtifact),
  };
}

function mapProject(row: ProjectRow | ProjectAggregateRow): OrchestratorProjectRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    domain: row.domain,
    summary: row.summary,
    descriptionMarkdown: row.descriptionMarkdown,
    mission: row.mission,
    architectureSummary: row.architectureSummary,
    whatIBuilt: row.whatIBuilt,
    publicationStatus: row.status,
    lifecycleStatus: row.lifecycleStatus,
    formatType: row.formatType,
    featured: row.featured,
    sortOrder: row.sortOrder,
    revision: row.revision,
    coverImageUrl: row.coverImageUrl,
    architectureSvg: row.architectureSvg,
    liveUrl: row.liveUrl,
    githubUrl: row.githubUrl,
    packetTracerFile: row.packetTracerFile,
    topologyConfigJson: row.topologyConfigJson,
    metrics: row.metrics,
    technologies: [...row.technologies],
    tags: [...row.tags],
    categoryId: row.categoryId,
    category: row.category
      ? {
          id: row.category.id,
          name: row.category.name,
          slug: row.category.slug,
          domain: row.category.domain,
          status: row.category.status,
        }
      : null,
    publishedAt: iso(row.publishedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapProjectAggregate(row: ProjectAggregateRow): OrchestratorProjectAggregate {
  return {
    project: mapProject(row),
    labs: row.labs.map((lab) => ({ ...mapLabRecord(lab), aggregate: mapLabAggregate(lab) })),
    runbookSteps: row.runbookSteps.map((step) => ({
      id: step.id,
      projectId: step.projectId,
      order: step.order,
      title: step.title,
      description: step.description,
      command: step.command,
      createdAt: step.createdAt.toISOString(),
      updatedAt: step.updatedAt.toISOString(),
    })),
    evidence: row.evidence.map(mapEvidence),
    artifacts: row.artifacts.map(mapArtifact),
  };
}

function mapArtifactAdmin(row: ArtifactAdminRow): OrchestratorArtifactAdminRecord {
  return {
    id: row.id,
    fileName: row.fileName,
    originalName: row.originalName,
    mimeType: row.mimeType,
    publicUrl: row.publicUrl,
    projectId: row.projectId,
    labId: row.labId,
    isPublic: row.isPublic,
    sizeBytes: row.sizeBytes,
    storageProvider: row.storageProvider,
    sha256: row.sha256,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    referencedByInputs: row._count.labInputs,
    referencedByEvidence: row._count.evidence,
  };
}

function uniqueSlug(base: string, existing: Set<string>): string {
  let candidate = `${base}-copy`;
  let suffix = 2;
  while (existing.has(candidate)) {
    candidate = `${base}-copy-${suffix}`;
    suffix += 1;
  }
  existing.add(candidate);
  return candidate;
}

function safeArtifactBundle(row: LabArtifactReference & Partial<{ sizeBytes: number; storageProvider: string }>): SafeArtifactReferenceBundle {
  return {
    fileName: row.fileName,
    originalName: row.originalName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes ?? null,
    storageProvider: row.storageProvider ?? 'REFERENCE',
    publicUrl: row.publicUrl,
    isPublic: row.isPublic,
    referenceOnly: true,
  };
}

function evidenceBundleFromRecord(entry: LabEvidenceRecord): PortfolioLabBundleV1['evidence'][number] {
  return {
    kind: entry.kind,
    title: entry.title,
    description: entry.description,
    content: entry.content,
    externalUrl: entry.externalUrl,
    artifactReference: entry.artifact ? safeArtifactBundle(entry.artifact) : null,
    isPublic: entry.isPublic,
    sortOrder: entry.sortOrder,
  };
}

function labBundleFromAggregate(lab: LabAggregate): PortfolioLabBundleV1 {
  return {
    schemaVersion: 'portfolio.lab-bundle.v1',
    exportedAt: new Date().toISOString(),
    lab: {
      slug: lab.slug,
      title: lab.title,
      summary: lab.summary,
      domain: lab.domain,
      kind: lab.kind,
      isInteractive: lab.isInteractive,
      manifestVersion: lab.manifestVersion,
      capabilities: [...lab.capabilities],
      normalizedState: lab.normalizedState,
      metadata: lab.metadata,
      sortOrder: lab.sortOrder,
    },
    inputs: lab.inputs.map((entry) => ({
      inputKey: entry.inputKey,
      inputType: entry.inputType,
      label: entry.label,
      description: entry.description,
      sourceKind: entry.sourceKind,
      schemaVersion: entry.schemaVersion,
      payload: entry.sourceKind === 'INLINE' ? entry.payload : null,
      externalUrl: entry.sourceKind === 'EXTERNAL' ? entry.externalUrl : null,
      artifactReference: entry.artifact ? safeArtifactBundle(entry.artifact) : null,
      isPrimary: entry.isPrimary,
      sortOrder: entry.sortOrder,
    })),
    topology: {
      nodes: lab.nodes.map((entry) => ({
        nodeKey: entry.nodeKey,
        label: entry.label,
        kind: entry.kind,
        description: entry.description,
        position: entry.position,
        configuration: entry.configuration,
        metadata: entry.metadata,
      })),
      links: lab.links.map((entry) => ({
        linkKey: entry.linkKey,
        sourceNodeKey: entry.sourceNodeKey,
        targetNodeKey: entry.targetNodeKey,
        label: entry.label,
        kind: entry.kind,
        configuration: entry.configuration,
        metadata: entry.metadata,
      })),
    },
    scenarios: lab.scenarios.map((entry) => ({
      slug: entry.slug,
      title: entry.title,
      summary: entry.summary,
      description: entry.description,
      order: entry.order,
      isEnabled: entry.isEnabled,
      baselineState: entry.baselineState,
      actions: entry.actions,
      expectedObservations: entry.expectedObservations,
      verificationCriteria: entry.verificationCriteria,
    })),
    runbook: lab.runbookSteps.map((entry) => ({
      order: entry.order,
      title: entry.title,
      description: entry.description,
      command: entry.command,
      expectedObservation: entry.expectedObservation,
    })),
    evidence: lab.evidence.map(evidenceBundleFromRecord),
    artifacts: lab.artifacts.map(safeArtifactBundle),
  };
}

async function nextAvailableProjectSlug(tx: Prisma.TransactionClient, requested: string): Promise<string> {
  const rows = await tx.project.findMany({ select: { slug: true } });
  return uniqueSlug(requested, new Set(rows.map((row) => row.slug)));
}

async function nextAvailableLabSlug(tx: Prisma.TransactionClient, requested: string): Promise<string> {
  const rows = await tx.lab.findMany({ select: { slug: true } });
  return uniqueSlug(requested, new Set(rows.map((row) => row.slug)));
}

async function createReferenceArtifact(
  tx: Prisma.TransactionClient,
  reference: SafeArtifactReferenceBundle,
  projectId: string,
  labId: string | null,
): Promise<string> {
  const publicUrl = reference.publicUrl?.trim() || null;
  const requestedProvider = reference.storageProvider?.trim().toUpperCase();
  const storageProvider = requestedProvider === 'S3_REFERENCE'
    ? 'S3_REFERENCE'
    : publicUrl
      ? 'EXTERNAL'
      : 'REFERENCE';
  const storageKey = publicUrl ?? `reference:${projectId}:${labId ?? 'project'}:${reference.fileName}`;
  const row = await tx.artifact.create({
    data: {
      fileName: reference.fileName,
      originalName: reference.originalName ?? null,
      mimeType: reference.mimeType,
      storageProvider,
      storageKey,
      sizeBytes: Number.isInteger(reference.sizeBytes) && (reference.sizeBytes ?? 0) >= 0 ? reference.sizeBytes ?? 0 : 0,
      sha256: null,
      publicUrl,
      projectId,
      labId,
      isPublic: reference.isPublic,
    },
  });
  return row.id;
}

async function createLabBundleRows(
  tx: Prisma.TransactionClient,
  project: { id: string; domain: 'NETWORKING' | 'LINUX' | 'DEVOPS' },
  bundle: PortfolioLabBundleV1,
  forceSlug?: string,
): Promise<string> {
  const lab = await tx.lab.create({
    data: {
      slug: forceSlug ?? bundle.lab.slug,
      title: bundle.lab.title,
      summary: bundle.lab.summary,
      domain: project.domain,
      kind: bundle.lab.kind,
      status: 'DRAFT',
      sortOrder: bundle.lab.sortOrder,
      revision: 1,
      projectId: project.id,
      isInteractive: bundle.lab.isInteractive,
      manifestVersion: bundle.lab.manifestVersion,
      capabilities: bundle.lab.capabilities,
      normalizedState: jsonWrite(bundle.lab.normalizedState),
      metadata: jsonWrite(bundle.lab.metadata),
    },
  });

  const artifactIds = new Map<string, string>();
  for (const reference of bundle.artifacts) {
    const id = await createReferenceArtifact(tx, reference, project.id, lab.id);
    artifactIds.set(reference.fileName, id);
  }

  for (const input of bundle.inputs) {
    let artifactId: string | null = null;
    if (input.artifactReference) {
      artifactId = artifactIds.get(input.artifactReference.fileName) ?? await createReferenceArtifact(tx, input.artifactReference, project.id, lab.id);
    }
    await tx.labInput.create({
      data: {
        labId: lab.id,
        inputKey: input.inputKey,
        inputType: input.inputType,
        label: input.label,
        description: input.description,
        sourceKind: input.sourceKind,
        schemaVersion: input.schemaVersion,
        payload: input.sourceKind === 'INLINE' ? jsonWrite(input.payload) : Prisma.DbNull,
        externalUrl: input.sourceKind === 'EXTERNAL' ? input.externalUrl : null,
        artifactId: input.sourceKind === 'ARTIFACT_REFERENCE' ? artifactId : null,
        isPrimary: input.isPrimary,
        sortOrder: input.sortOrder,
      },
    });
  }

  if (bundle.topology.nodes.length > 0) {
    await tx.labNode.createMany({
      data: bundle.topology.nodes.map((entry) => ({
        labId: lab.id,
        nodeKey: entry.nodeKey,
        label: entry.label,
        kind: entry.kind,
        description: entry.description,
        position: jsonWrite(entry.position),
        configuration: jsonWrite(entry.configuration),
        metadata: jsonWrite(entry.metadata),
      })),
    });
  }
  if (bundle.topology.links.length > 0) {
    await tx.labLink.createMany({
      data: bundle.topology.links.map((entry) => ({
        labId: lab.id,
        linkKey: entry.linkKey,
        sourceNodeKey: entry.sourceNodeKey,
        targetNodeKey: entry.targetNodeKey,
        label: entry.label,
        kind: entry.kind,
        configuration: jsonWrite(entry.configuration),
        metadata: jsonWrite(entry.metadata),
      })),
    });
  }
  if (bundle.scenarios.length > 0) {
    await tx.labScenario.createMany({
      data: bundle.scenarios.map((entry) => ({
        labId: lab.id,
        slug: entry.slug,
        title: entry.title,
        summary: entry.summary,
        description: entry.description,
        order: entry.order,
        isEnabled: entry.isEnabled,
        baselineState: jsonWrite(entry.baselineState),
        actions: jsonWrite(entry.actions),
        expectedObservations: jsonWrite(entry.expectedObservations),
        verificationCriteria: jsonWrite(entry.verificationCriteria),
      })),
    });
  }
  if (bundle.runbook.length > 0) {
    await tx.labRunbookStep.createMany({
      data: bundle.runbook.map((entry) => ({ labId: lab.id, ...entry })),
    });
  }
  for (const evidence of bundle.evidence) {
    let artifactId: string | null = null;
    if (evidence.artifactReference) {
      artifactId = artifactIds.get(evidence.artifactReference.fileName) ?? await createReferenceArtifact(tx, evidence.artifactReference, project.id, lab.id);
    }
    await tx.evidence.create({
      data: {
        projectId: project.id,
        labId: lab.id,
        kind: evidence.kind as Prisma.EvidenceCreateInput['kind'],
        title: evidence.title,
        description: evidence.description,
        content: jsonWrite(evidence.content),
        artifactId,
        externalUrl: evidence.externalUrl,
        isPublic: evidence.isPublic,
        sortOrder: evidence.sortOrder,
      },
    });
  }
  return lab.id;
}

export class PrismaPortfolioOrchestratorRepository implements PortfolioOrchestratorRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  async dashboard(): Promise<OrchestratorDashboardSummary> {
    const [projects, labs, activeScenarioRuntimes, recentAudit] = await Promise.all([
      this.client.project.findMany({ select: { status: true, domain: true } }),
      this.client.lab.findMany({
        select: {
          status: true,
          domain: true,
          inputs: { where: { isPrimary: true }, select: { id: true, isPrimary: true }, take: 1 },
        },
      }),
      this.client.labScenarioRuntime.count({ where: { status: 'ACTIVE' } }),
      this.client.auditLog.findMany({
        include: { actorUser: { select: { displayName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);
    const byProjectStatus = { DRAFT: 0, PUBLISHED: 0, ARCHIVED: 0 };
    const byProjectDomain = { NETWORKING: 0, LINUX: 0, DEVOPS: 0 };
    for (const project of projects) {
      byProjectStatus[project.status] += 1;
      byProjectDomain[project.domain] += 1;
    }
    const byLabStatus = { DRAFT: 0, READY: 0, ARCHIVED: 0 };
    const byLabDomain = { NETWORKING: 0, LINUX: 0, DEVOPS: 0 };
    let missingPrimaryInput = 0;
    for (const lab of labs) {
      byLabStatus[lab.status] += 1;
      byLabDomain[lab.domain] += 1;
      if (!lab.inputs.some((input) => input.isPrimary)) missingPrimaryInput += 1;
    }
    return {
      projects: { total: projects.length, byStatus: byProjectStatus, byDomain: byProjectDomain },
      labs: { total: labs.length, byStatus: byLabStatus, byDomain: byLabDomain, missingPrimaryInput },
      activeScenarioRuntimes,
      recentAuditEvents: recentAudit.map((entry) => ({
        id: entry.id,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        createdAt: entry.createdAt.toISOString(),
        actor: entry.actorUser?.displayName ?? entry.actorUser?.email ?? null,
      })),
    };
  }

  async listProjects(): Promise<OrchestratorProjectRecord[]> {
    const rows = await this.client.project.findMany({
      include: { category: { select: categorySelect } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return rows.map(mapProject);
  }

  async findProjectBySlug(slug: string): Promise<OrchestratorProjectRecord | null> {
    const row = await this.client.project.findUnique({ where: { slug }, include: { category: { select: categorySelect } } });
    return row ? mapProject(row) : null;
  }

  async findLabBySlug(slug: string): Promise<OrchestratorLabRecord | null> {
    const row = await this.client.lab.findUnique({ where: { slug }, include: labAggregateInclude });
    return row ? mapLabRecord(row) : null;
  }

  async getProjectAggregate(projectId: string): Promise<OrchestratorProjectAggregate | null> {
    const row = await this.client.project.findUnique({ where: { id: projectId }, include: projectAggregateInclude });
    return row ? mapProjectAggregate(row) : null;
  }

  async getLabAggregate(labId: string): Promise<LabAggregate | null> {
    const row = await this.client.lab.findUnique({ where: { id: labId }, include: labAggregateInclude });
    return row ? mapLabAggregate(row) : null;
  }

  async createDraftProject(input: OrchestratorProjectCreateInput): Promise<OrchestratorProjectAggregate> {
    const row = await this.client.project.create({
      data: {
        slug: input.slug,
        title: input.title,
        domain: input.domain,
        summary: input.summary,
        descriptionMarkdown: input.descriptionMarkdown ?? null,
        mission: input.mission ?? null,
        architectureSummary: input.architectureSummary ?? null,
        whatIBuilt: input.whatIBuilt ?? null,
        status: 'DRAFT',
        lifecycleStatus: input.lifecycleStatus ?? 'PLANNED',
        formatType: input.formatType ?? 'STANDARD',
        featured: input.featured ?? false,
        sortOrder: input.sortOrder ?? 0,
        revision: 1,
        coverImageUrl: input.coverImageUrl ?? null,
        architectureSvg: input.architectureSvg ?? null,
        liveUrl: input.liveUrl ?? null,
        githubUrl: input.githubUrl ?? null,
        packetTracerFile: input.packetTracerFile ?? null,
        topologyConfigJson: input.topologyConfigJson ?? null,
        metrics: jsonWrite(input.metrics),
        technologies: input.technologies ?? [],
        tags: input.tags ?? [],
        categoryId: input.categoryId,
        publishedAt: null,
      },
      include: projectAggregateInclude,
    });
    return mapProjectAggregate(row);
  }

  async updateProject(projectId: string, input: OrchestratorProjectUpdateInput): Promise<RevisionWriteResult<OrchestratorProjectAggregate>> {
    const { expectedRevision, ...changes } = input;
    const result = await this.client.project.updateMany({
      where: { id: projectId, revision: expectedRevision },
      data: {
        ...(changes.slug !== undefined ? { slug: changes.slug } : {}),
        ...(changes.title !== undefined ? { title: changes.title } : {}),
        ...(changes.domain !== undefined ? { domain: changes.domain } : {}),
        ...(changes.summary !== undefined ? { summary: changes.summary } : {}),
        ...(changes.descriptionMarkdown !== undefined ? { descriptionMarkdown: changes.descriptionMarkdown } : {}),
        ...(changes.mission !== undefined ? { mission: changes.mission } : {}),
        ...(changes.architectureSummary !== undefined ? { architectureSummary: changes.architectureSummary } : {}),
        ...(changes.whatIBuilt !== undefined ? { whatIBuilt: changes.whatIBuilt } : {}),
        ...(changes.lifecycleStatus !== undefined ? { lifecycleStatus: changes.lifecycleStatus } : {}),
        ...(changes.formatType !== undefined ? { formatType: changes.formatType } : {}),
        ...(changes.featured !== undefined ? { featured: changes.featured } : {}),
        ...(changes.sortOrder !== undefined ? { sortOrder: changes.sortOrder } : {}),
        ...(changes.coverImageUrl !== undefined ? { coverImageUrl: changes.coverImageUrl } : {}),
        ...(changes.architectureSvg !== undefined ? { architectureSvg: changes.architectureSvg } : {}),
        ...(changes.liveUrl !== undefined ? { liveUrl: changes.liveUrl } : {}),
        ...(changes.githubUrl !== undefined ? { githubUrl: changes.githubUrl } : {}),
        ...(changes.packetTracerFile !== undefined ? { packetTracerFile: changes.packetTracerFile } : {}),
        ...(changes.topologyConfigJson !== undefined ? { topologyConfigJson: changes.topologyConfigJson } : {}),
        ...(changes.metrics !== undefined ? { metrics: jsonWrite(changes.metrics) } : {}),
        ...(changes.technologies !== undefined ? { technologies: changes.technologies } : {}),
        ...(changes.tags !== undefined ? { tags: changes.tags } : {}),
        ...(changes.categoryId !== undefined ? { categoryId: changes.categoryId } : {}),
        revision: { increment: 1 },
      },
    });
    if (result.count === 0) {
      const current = await this.client.project.findUnique({ where: { id: projectId }, select: { revision: true } });
      return current ? { status: 'CONFLICT', currentRevision: current.revision } : { status: 'NOT_FOUND' };
    }
    const updated = await this.getProjectAggregate(projectId);
    return updated ? { status: 'OK', value: updated } : { status: 'NOT_FOUND' };
  }

  async createDraftLab(projectId: string, input: OrchestratorLabCreateInput): Promise<OrchestratorProjectAggregate> {
    await this.client.$transaction(async (tx) => {
      const project = await tx.project.findUniqueOrThrow({ where: { id: projectId }, select: { domain: true } });
      const kind = project.domain === 'NETWORKING' ? 'NETWORK_TOPOLOGY' : project.domain === 'LINUX' ? 'LINUX_SYSTEM' : 'DEVOPS_PIPELINE';
      await tx.lab.create({
        data: {
          slug: input.slug,
          title: input.title,
          summary: input.summary ?? null,
          domain: project.domain,
          kind,
          status: 'DRAFT',
          sortOrder: input.sortOrder ?? 0,
          revision: 1,
          projectId,
          isInteractive: input.isInteractive ?? true,
          manifestVersion: input.manifestVersion ?? '1.0',
          capabilities: input.capabilities ?? [],
          normalizedState: jsonWrite(input.normalizedState),
          metadata: jsonWrite(input.metadata),
        },
      });
      await tx.project.update({ where: { id: projectId }, data: { revision: { increment: 1 } } });
    });
    return (await this.getProjectAggregate(projectId))!;
  }

  async updateLab(labId: string, input: OrchestratorLabUpdateInput): Promise<RevisionWriteResult<LabAggregate>> {
    const { expectedRevision, ...changes } = input;
    const result = await this.client.lab.updateMany({
      where: { id: labId, revision: expectedRevision },
      data: {
        ...(changes.slug !== undefined ? { slug: changes.slug } : {}),
        ...(changes.title !== undefined ? { title: changes.title } : {}),
        ...(changes.summary !== undefined ? { summary: changes.summary } : {}),
        ...(changes.isInteractive !== undefined ? { isInteractive: changes.isInteractive } : {}),
        ...(changes.manifestVersion !== undefined ? { manifestVersion: changes.manifestVersion } : {}),
        ...(changes.capabilities !== undefined ? { capabilities: changes.capabilities } : {}),
        ...(changes.normalizedState !== undefined ? { normalizedState: jsonWrite(changes.normalizedState) } : {}),
        ...(changes.metadata !== undefined ? { metadata: jsonWrite(changes.metadata) } : {}),
        ...(changes.sortOrder !== undefined ? { sortOrder: changes.sortOrder } : {}),
        revision: { increment: 1 },
      },
    });
    if (result.count === 0) {
      const current = await this.client.lab.findUnique({ where: { id: labId }, select: { revision: true } });
      return current ? { status: 'CONFLICT', currentRevision: current.revision } : { status: 'NOT_FOUND' };
    }
    const updated = await this.getLabAggregate(labId);
    return updated ? { status: 'OK', value: updated } : { status: 'NOT_FOUND' };
  }

  async bumpLabRevision(labId: string): Promise<number | null> {
    const result = await this.client.lab.updateMany({ where: { id: labId }, data: { revision: { increment: 1 } } });
    if (result.count === 0) return null;
    return (await this.client.lab.findUnique({ where: { id: labId }, select: { revision: true } }))?.revision ?? null;
  }

  activeRuntimeCount(labId: string): Promise<number> {
    return this.client.labScenarioRuntime.count({ where: { labId, status: 'ACTIVE' } });
  }

  async resetLabRuntimes(labId: string): Promise<number | null> {
    const exists = await this.client.lab.findUnique({ where: { id: labId }, select: { id: true } });
    if (!exists) return null;
    const result = await this.client.labScenarioRuntime.deleteMany({ where: { labId } });
    return result.count;
  }

  async markLabReady(labId: string, expectedRevision: number): Promise<RevisionWriteResult<LabAggregate>> {
    const result = await this.client.lab.updateMany({
      where: { id: labId, revision: expectedRevision },
      data: { status: 'READY', revision: { increment: 1 } },
    });
    if (result.count === 0) {
      const current = await this.client.lab.findUnique({ where: { id: labId }, select: { revision: true } });
      return current ? { status: 'CONFLICT', currentRevision: current.revision } : { status: 'NOT_FOUND' };
    }
    const value = await this.getLabAggregate(labId);
    return value ? { status: 'OK', value } : { status: 'NOT_FOUND' };
  }

  async publishProject(
    projectId: string,
    expectedProjectRevision: number,
    expectedLabRevisions: Record<string, number>,
    readyLabIds: string[],
  ): Promise<RevisionWriteResult<ProjectPublicationWrite>> {
    try {
      await this.client.$transaction(async (tx) => {
        const currentLabs = await tx.lab.findMany({ where: { projectId }, select: { id: true, revision: true } });
        const expectedIds = Object.keys(expectedLabRevisions);
        if (
          currentLabs.length !== expectedIds.length ||
          currentLabs.some((lab) => expectedLabRevisions[lab.id] !== lab.revision) ||
          expectedIds.some((labId) => !currentLabs.some((lab) => lab.id === labId))
        ) {
          throw new ConflictError('A Lab revision changed before publication');
        }
        const projectWrite = await tx.project.updateMany({
          where: { id: projectId, revision: expectedProjectRevision },
          data: { status: 'PUBLISHED', publishedAt: new Date(), revision: { increment: 1 } },
        });
        if (projectWrite.count !== 1) throw new ConflictError('Project revision changed before publication');
        for (const labId of readyLabIds) {
          const expected = expectedLabRevisions[labId];
          const labWrite = await tx.lab.updateMany({
            where: { id: labId, projectId, revision: expected },
            data: { status: 'READY', revision: { increment: 1 } },
          });
          if (labWrite.count !== 1) throw new ConflictError('A Lab revision changed before publication');
        }
      });
    } catch (error) {
      if (error instanceof ConflictError) {
        const current = await this.client.project.findUnique({ where: { id: projectId }, select: { revision: true } });
        return current ? { status: 'CONFLICT', currentRevision: current.revision } : { status: 'NOT_FOUND' };
      }
      throw error;
    }
    const aggregate = await this.getProjectAggregate(projectId);
    if (!aggregate) return { status: 'NOT_FOUND' };
    return {
      status: 'OK',
      value: { project: aggregate.project, labs: aggregate.labs.map(({ aggregate: _aggregate, ...lab }) => lab) },
    };
  }

  async archiveProject(projectId: string, expectedRevision: number): Promise<RevisionWriteResult<OrchestratorProjectAggregate>> {
    const result = await this.client.project.updateMany({
      where: { id: projectId, revision: expectedRevision },
      data: { status: 'ARCHIVED', lifecycleStatus: 'ARCHIVED', publishedAt: null, revision: { increment: 1 } },
    });
    if (result.count === 0) {
      const current = await this.client.project.findUnique({ where: { id: projectId }, select: { revision: true } });
      return current ? { status: 'CONFLICT', currentRevision: current.revision } : { status: 'NOT_FOUND' };
    }
    const value = await this.getProjectAggregate(projectId);
    return value ? { status: 'OK', value } : { status: 'NOT_FOUND' };
  }

  async restoreProject(
    projectId: string,
    expectedRevision: number,
    lifecycleStatus: 'COMPLETED' | 'IN_PROGRESS' | 'PLANNED',
  ): Promise<RevisionWriteResult<OrchestratorProjectAggregate>> {
    const result = await this.client.project.updateMany({
      where: { id: projectId, revision: expectedRevision },
      data: { status: 'DRAFT', lifecycleStatus, publishedAt: null, revision: { increment: 1 } },
    });
    if (result.count === 0) {
      const current = await this.client.project.findUnique({ where: { id: projectId }, select: { revision: true } });
      return current ? { status: 'CONFLICT', currentRevision: current.revision } : { status: 'NOT_FOUND' };
    }
    const value = await this.getProjectAggregate(projectId);
    return value ? { status: 'OK', value } : { status: 'NOT_FOUND' };
  }

  async archiveLab(labId: string, expectedRevision: number): Promise<RevisionWriteResult<{ lab: LabAggregate; deletedRuntimes: number }>> {
    let deletedRuntimes = 0;
    const result = await this.client.$transaction(async (tx) => {
      const write = await tx.lab.updateMany({
        where: { id: labId, revision: expectedRevision },
        data: { status: 'ARCHIVED', revision: { increment: 1 } },
      });
      if (write.count !== 1) return false;
      deletedRuntimes = (await tx.labScenarioRuntime.deleteMany({ where: { labId } })).count;
      return true;
    });
    if (!result) {
      const current = await this.client.lab.findUnique({ where: { id: labId }, select: { revision: true } });
      return current ? { status: 'CONFLICT', currentRevision: current.revision } : { status: 'NOT_FOUND' };
    }
    const lab = await this.getLabAggregate(labId);
    return lab ? { status: 'OK', value: { lab, deletedRuntimes } } : { status: 'NOT_FOUND' };
  }

  async duplicateProject(projectId: string, input: OrchestratorDuplicateProjectRequest): Promise<OrchestratorProjectAggregate | null> {
    const source = await this.client.project.findUnique({ where: { id: projectId }, include: projectAggregateInclude });
    if (!source) return null;
    const newId = await this.client.$transaction(async (tx) => {
      const slug = input.slug ?? await nextAvailableProjectSlug(tx, source.slug);
      const created = await tx.project.create({
        data: {
          slug,
          title: input.title?.trim() || `${source.title} Copy`,
          domain: source.domain,
          summary: source.summary,
          descriptionMarkdown: source.descriptionMarkdown,
          mission: source.mission,
          architectureSummary: source.architectureSummary,
          whatIBuilt: source.whatIBuilt,
          status: 'DRAFT',
          lifecycleStatus: source.lifecycleStatus === 'ARCHIVED' ? 'PLANNED' : source.lifecycleStatus,
          formatType: source.formatType,
          featured: false,
          sortOrder: source.sortOrder,
          revision: 1,
          coverImageUrl: source.coverImageUrl,
          architectureSvg: source.architectureSvg,
          liveUrl: source.liveUrl,
          githubUrl: source.githubUrl,
          packetTracerFile: source.packetTracerFile,
          topologyConfigJson: source.topologyConfigJson,
          metrics: jsonWrite(source.metrics),
          technologies: source.technologies,
          tags: source.tags,
          categoryId: source.categoryId,
          publishedAt: null,
        },
      });
      if (source.runbookSteps.length > 0) {
        await tx.projectRunbookStep.createMany({ data: source.runbookSteps.map((step) => ({ projectId: created.id, order: step.order, title: step.title, description: step.description, command: step.command })) });
      }
      const projectArtifactIds = new Map<string, string>();
      for (const artifact of source.artifacts.filter((entry) => entry.labId === null)) {
        const clonedArtifactId = await createReferenceArtifact(tx, safeArtifactBundle(mapArtifact(artifact)), created.id, null);
        projectArtifactIds.set(artifact.id, clonedArtifactId);
      }
      for (const lab of source.labs) {
        const labSlug = await nextAvailableLabSlug(tx, lab.slug);
        await createLabBundleRows(tx, created, labBundleFromAggregate(mapLabAggregate(lab)), labSlug);
      }
      for (const evidence of source.evidence.filter((entry) => entry.labId === null)) {
        await tx.evidence.create({
          data: {
            projectId: created.id,
            kind: evidence.kind,
            title: evidence.title,
            description: evidence.description,
            content: jsonWrite(evidence.content),
            artifactId: evidence.artifactId ? projectArtifactIds.get(evidence.artifactId) ?? null : null,
            externalUrl: evidence.externalUrl,
            isPublic: evidence.isPublic,
            sortOrder: evidence.sortOrder,
          },
        });
      }
      return created.id;
    }, { maxWait: 10_000, timeout: 30_000 });
    return this.getProjectAggregate(newId);
  }

  async duplicateLab(labId: string, input: OrchestratorDuplicateLabRequest): Promise<LabAggregate | null> {
    const source = await this.getLabAggregate(labId);
    if (!source) return null;
    const destinationProjectId = input.projectId ?? source.projectId;
    if (!destinationProjectId) return null;
    const createdId = await this.client.$transaction(async (tx) => {
      const project = await tx.project.findUniqueOrThrow({ where: { id: destinationProjectId }, select: { id: true, domain: true } });
      const bundle = labBundleFromAggregate(source);
      bundle.lab.title = input.title?.trim() || `${source.title} Copy`;
      const slug = input.slug ?? await nextAvailableLabSlug(tx, source.slug);
      const id = await createLabBundleRows(tx, project, bundle, slug);
      await tx.project.update({ where: { id: destinationProjectId }, data: { revision: { increment: 1 } } });
      return id;
    }, { maxWait: 10_000, timeout: 30_000 });
    return this.getLabAggregate(createdId);
  }

  async reorderProjects(items: OrchestratorReorderItem[]): Promise<OrchestratorProjectRecord[]> {
    await this.client.$transaction(async (tx) => {
      for (const item of items) {
        const write = await tx.project.updateMany({
          where: { id: item.id, revision: item.expectedRevision },
          data: { sortOrder: item.sortOrder, revision: { increment: 1 } },
        });
        if (write.count !== 1) throw new ConflictError(`Project revision conflict: ${item.id}`);
      }
    });
    return this.listProjects();
  }

  async reorderLabs(projectId: string, items: OrchestratorReorderItem[]): Promise<LabAggregate[]> {
    await this.client.$transaction(async (tx) => {
      for (const item of items) {
        const write = await tx.lab.updateMany({
          where: { id: item.id, projectId, revision: item.expectedRevision },
          data: { sortOrder: item.sortOrder, revision: { increment: 1 } },
        });
        if (write.count !== 1) throw new ConflictError(`Lab revision conflict: ${item.id}`);
      }
      await tx.project.update({ where: { id: projectId }, data: { revision: { increment: 1 } } });
    });
    const aggregate = await this.getProjectAggregate(projectId);
    return aggregate?.labs.map((entry) => entry.aggregate) ?? [];
  }

  async deleteProjectPermanent(projectId: string): Promise<boolean> {
    const result = await this.client.project.deleteMany({ where: { id: projectId } });
    return result.count > 0;
  }

  async deleteLabPermanent(labId: string): Promise<boolean> {
    const result = await this.client.lab.deleteMany({ where: { id: labId } });
    return result.count > 0;
  }

  async exportProjectBundle(projectId: string): Promise<PortfolioProjectBundleV1 | null> {
    const aggregate = await this.getProjectAggregate(projectId);
    if (!aggregate) return null;
    return {
      schemaVersion: 'portfolio.project-bundle.v1',
      exportedAt: new Date().toISOString(),
      project: {
        slug: aggregate.project.slug,
        title: aggregate.project.title,
        domain: aggregate.project.domain,
        summary: aggregate.project.summary,
        descriptionMarkdown: aggregate.project.descriptionMarkdown,
        mission: aggregate.project.mission,
        architectureSummary: aggregate.project.architectureSummary,
        whatIBuilt: aggregate.project.whatIBuilt,
        lifecycleStatus: aggregate.project.lifecycleStatus,
        formatType: aggregate.project.formatType,
        featured: aggregate.project.featured,
        sortOrder: aggregate.project.sortOrder,
        coverImageUrl: aggregate.project.coverImageUrl,
        architectureSvg: aggregate.project.architectureSvg,
        liveUrl: aggregate.project.liveUrl,
        githubUrl: aggregate.project.githubUrl,
        packetTracerFile: aggregate.project.packetTracerFile,
        topologyConfigJson: aggregate.project.topologyConfigJson,
        metrics: aggregate.project.metrics,
        technologies: aggregate.project.technologies,
        tags: aggregate.project.tags,
        categorySlug: aggregate.project.category?.slug ?? '',
        ...(aggregate.project.categoryId ? { categoryId: aggregate.project.categoryId } : {}),
      },
      labs: aggregate.labs.map((entry) => labBundleFromAggregate(entry.aggregate)),
      runbook: aggregate.runbookSteps.map((entry) => ({
        order: entry.order,
        title: entry.title,
        description: entry.description,
        command: entry.command,
      })),
      evidence: aggregate.evidence.filter((entry) => entry.labId === null).map(evidenceBundleFromRecord),
      artifacts: aggregate.artifacts.filter((entry) => entry.labId === null).map(safeArtifactBundle),
    };
  }

  async exportLabBundle(labId: string): Promise<PortfolioLabBundleV1 | null> {
    const aggregate = await this.getLabAggregate(labId);
    return aggregate ? labBundleFromAggregate(aggregate) : null;
  }

  async exportNetworkingCompanion(labId: string): Promise<NetworkingCompanionManifestV1 | null> {
    const aggregate = await this.getLabAggregate(labId);
    if (!aggregate) return null;
    if (aggregate.domain !== 'NETWORKING' || aggregate.kind !== 'NETWORK_TOPOLOGY') {
      throw new ValidationError('Networking companion export requires a NETWORKING topology Lab');
    }
    const bundle = labBundleFromAggregate(aggregate);
    const primary = bundle.inputs.find((entry) => entry.isPrimary);
    if (!primary) throw new ValidationError('Networking companion export requires one primary Lab input');
    const packetInput = bundle.inputs.find((entry) => entry.inputType === 'PACKET_TRACER');
    const packetPayload = packetInput?.payload && typeof packetInput.payload === 'object' && !Array.isArray(packetInput.payload)
      ? packetInput.payload as Record<string, unknown>
      : null;
    const packetFileName = packetPayload && typeof packetPayload.fileName === 'string' ? packetPayload.fileName : null;
    return {
      schemaVersion: 'networking.companion-manifest.v1',
      lab: bundle.lab as NetworkingCompanionManifestV1['lab'],
      input: primary,
      topology: bundle.topology,
      ...(packetFileName ? {
        packetTracerReference: {
          fileName: packetFileName,
          sizeBytes: typeof packetPayload?.sizeBytes === 'number' ? packetPayload.sizeBytes : null,
          sha256: typeof packetPayload?.sha256 === 'string' ? packetPayload.sha256 : null,
          referenceOnly: true,
        },
      } : {}),
    };
  }

  async importProjectBundle(bundle: PortfolioProjectBundleV1): Promise<OrchestratorProjectAggregate> {
    const id = await this.client.$transaction(async (tx) => {
      const category = await tx.category.findFirst({
        where: { slug: bundle.project.categorySlug, domain: bundle.project.domain },
        select: { id: true },
      });
      if (!category) throw new ValidationError(`Category not found for imported Project: ${bundle.project.categorySlug}`);
      const project = await tx.project.create({
        data: {
          slug: bundle.project.slug,
          title: bundle.project.title,
          domain: bundle.project.domain,
          summary: bundle.project.summary,
          descriptionMarkdown: bundle.project.descriptionMarkdown,
          mission: bundle.project.mission,
          architectureSummary: bundle.project.architectureSummary,
          whatIBuilt: bundle.project.whatIBuilt,
          status: 'DRAFT',
          lifecycleStatus: bundle.project.lifecycleStatus === 'ARCHIVED' ? 'PLANNED' : bundle.project.lifecycleStatus,
          formatType: bundle.project.formatType,
          featured: bundle.project.featured,
          sortOrder: bundle.project.sortOrder,
          revision: 1,
          coverImageUrl: bundle.project.coverImageUrl,
          architectureSvg: bundle.project.architectureSvg,
          liveUrl: bundle.project.liveUrl,
          githubUrl: bundle.project.githubUrl,
          packetTracerFile: bundle.project.packetTracerFile,
          topologyConfigJson: bundle.project.topologyConfigJson,
          metrics: jsonWrite(bundle.project.metrics),
          technologies: bundle.project.technologies,
          tags: bundle.project.tags,
          categoryId: category.id,
          publishedAt: null,
        },
      });
      const projectArtifactIds = new Map<string, string>();
      for (const reference of bundle.artifacts) {
        const artifactId = await createReferenceArtifact(tx, reference, project.id, null);
        projectArtifactIds.set(reference.fileName, artifactId);
      }
      if (bundle.runbook.length > 0) {
        await tx.projectRunbookStep.createMany({
          data: bundle.runbook.map((entry) => ({ projectId: project.id, ...entry })),
        });
      }
      for (const evidence of bundle.evidence) {
        let artifactId: string | null = null;
        if (evidence.artifactReference) {
          artifactId = projectArtifactIds.get(evidence.artifactReference.fileName)
            ?? await createReferenceArtifact(tx, evidence.artifactReference, project.id, null);
        }
        await tx.evidence.create({
          data: {
            projectId: project.id,
            labId: null,
            kind: evidence.kind as Prisma.EvidenceCreateInput['kind'],
            title: evidence.title,
            description: evidence.description,
            content: jsonWrite(evidence.content),
            artifactId,
            externalUrl: evidence.externalUrl,
            isPublic: evidence.isPublic,
            sortOrder: evidence.sortOrder,
          },
        });
      }
      for (const lab of bundle.labs) await createLabBundleRows(tx, project, lab);
      return project.id;
    }, { maxWait: 10_000, timeout: 30_000 });
    return (await this.getProjectAggregate(id))!;
  }

  async importLabBundle(projectId: string, bundle: PortfolioLabBundleV1): Promise<LabAggregate> {
    const id = await this.client.$transaction(async (tx) => {
      const project = await tx.project.findUniqueOrThrow({ where: { id: projectId }, select: { id: true, domain: true } });
      const labId = await createLabBundleRows(tx, project, bundle);
      await tx.project.update({ where: { id: projectId }, data: { revision: { increment: 1 } } });
      return labId;
    }, { maxWait: 10_000, timeout: 30_000 });
    return (await this.getLabAggregate(id))!;
  }

  async importNetworkingCompanion(projectId: string, bundle: NetworkingCompanionManifestV1): Promise<LabAggregate> {
    const labBundle: PortfolioLabBundleV1 = {
      schemaVersion: 'portfolio.lab-bundle.v1',
      lab: bundle.lab,
      inputs: [bundle.input],
      topology: bundle.topology,
      scenarios: [],
      runbook: [],
      evidence: [],
      artifacts: [],
    };
    if (bundle.packetTracerReference) {
      labBundle.inputs.push({
        inputKey: 'packet-tracer-reference',
        inputType: 'PACKET_TRACER',
        label: 'Packet Tracer Reference',
        description: 'Reference metadata only. The binary .pkt file is not parsed by the portfolio.',
        sourceKind: 'INLINE',
        schemaVersion: 'networking.reference.v1',
        payload: { ...bundle.packetTracerReference, referenceOnly: true },
        externalUrl: null,
        artifactReference: null,
        isPrimary: false,
        sortOrder: 100,
      });
    }
    return this.importLabBundle(projectId, labBundle);
  }

  async listArtifacts(query: ArtifactAdminQuery = {}): Promise<OrchestratorArtifactAdminRecord[]> {
    const rows = await this.client.artifact.findMany({
      where: {
        ...(query.projectId ? { projectId: query.projectId } : {}),
        ...(query.labId ? { labId: query.labId } : {}),
        ...(query.isPublic === undefined ? {} : { isPublic: query.isPublic }),
        ...(query.mimeType ? { mimeType: query.mimeType } : {}),
        ...(query.storageProvider ? { storageProvider: query.storageProvider } : {}),
      },
      include: { _count: { select: { labInputs: true, evidence: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapArtifactAdmin);
  }

  async getArtifact(artifactId: string): Promise<OrchestratorArtifactAdminRecord | null> {
    const row = await this.client.artifact.findUnique({
      where: { id: artifactId },
      include: { _count: { select: { labInputs: true, evidence: true } } },
    });
    return row ? mapArtifactAdmin(row) : null;
  }

  async updateArtifact(artifactId: string, input: ArtifactAdminUpdate): Promise<OrchestratorArtifactAdminRecord | null> {
    const updated = await this.client.$transaction(async (tx) => {
      const exists = await tx.artifact.findUnique({
        where: { id: artifactId },
        select: { id: true, updatedAt: true, projectId: true, labId: true },
      });
      if (!exists) return false;
      if (input.expectedUpdatedAt && exists.updatedAt.toISOString() !== input.expectedUpdatedAt) {
        throw new ConflictError('Artifact changed since it was loaded');
      }
      const nextProjectId = input.projectId === undefined ? exists.projectId : input.projectId;
      const nextLabId = input.labId === undefined ? exists.labId : input.labId;
      await tx.artifact.update({
        where: { id: artifactId },
        data: {
          ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
          ...(input.labId !== undefined ? { labId: input.labId } : {}),
          ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
          ...(input.publicUrl !== undefined ? { publicUrl: input.publicUrl } : {}),
          ...(input.originalName !== undefined ? { originalName: input.originalName } : {}),
          ...(input.mimeType !== undefined ? { mimeType: input.mimeType } : {}),
        },
      });
      for (const labId of new Set([exists.labId, nextLabId].filter((value): value is string => Boolean(value)))) {
        await tx.lab.update({ where: { id: labId }, data: { revision: { increment: 1 } } });
      }
      for (const projectId of new Set([exists.projectId, nextProjectId].filter((value): value is string => Boolean(value)))) {
        await tx.project.update({ where: { id: projectId }, data: { revision: { increment: 1 } } });
      }
      return true;
    });
    return updated ? this.getArtifact(artifactId) : null;
  }

  async deleteArtifact(artifactId: string): Promise<'DELETED' | 'NOT_FOUND' | 'CONFLICT'> {
    return this.client.$transaction(async (tx) => {
      const row = await tx.artifact.findUnique({
        where: { id: artifactId },
        include: { _count: { select: { labInputs: true, evidence: true } } },
      });
      if (!row) return 'NOT_FOUND' as const;
      if (row._count.labInputs > 0 || row._count.evidence > 0) return 'CONFLICT' as const;
      await tx.artifact.delete({ where: { id: artifactId } });
      if (row.labId) await tx.lab.update({ where: { id: row.labId }, data: { revision: { increment: 1 } } });
      if (row.projectId) await tx.project.update({ where: { id: row.projectId }, data: { revision: { increment: 1 } } });
      return 'DELETED' as const;
    });
  }
}

export const portfolioOrchestratorRepository = new PrismaPortfolioOrchestratorRepository();
