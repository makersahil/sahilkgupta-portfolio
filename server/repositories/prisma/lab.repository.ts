import { Prisma, type PrismaClient } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';
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
} from '../contracts/lab.repository.js';
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

const projectSelect = {
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
} satisfies Prisma.ArtifactSelect;

const aggregateInclude = {
  project: { select: projectSelect },
  inputs: { include: { artifact: { select: artifactSelect } }, orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }] },
  nodes: { orderBy: { createdAt: 'asc' as const } },
  links: { orderBy: { createdAt: 'asc' as const } },
  scenarios: { orderBy: [{ order: 'asc' as const }, { createdAt: 'asc' as const }] },
  runbookSteps: { orderBy: [{ order: 'asc' as const }, { createdAt: 'asc' as const }] },
  evidence: { include: { artifact: { select: artifactSelect } }, orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }] },
  artifacts: { select: artifactSelect, orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.LabInclude;

type LabBareRow = Prisma.LabGetPayload<object>;
type LabWithProjectRow = Prisma.LabGetPayload<{ include: { project: { select: typeof projectSelect } } }>;
type AggregateRow = Prisma.LabGetPayload<{ include: typeof aggregateInclude }>;
type InputRow = Prisma.LabInputGetPayload<{ include: { artifact: { select: typeof artifactSelect } } }>;
type EvidenceRow = Prisma.EvidenceGetPayload<{ include: { artifact: { select: typeof artifactSelect } } }>;

function jsonWrite(value: unknown | undefined): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.DbNull;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function mapArtifact(row: Prisma.ArtifactGetPayload<{ select: typeof artifactSelect }>): LabArtifactReference {
  return { ...row };
}

function mapLab(row: LabBareRow | LabWithProjectRow | AggregateRow): LabRecord {
  const maybeProject = 'project' in row ? row.project : undefined;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    domain: row.domain,
    kind: row.kind,
    status: row.status,
    projectId: row.projectId,
    isInteractive: row.isInteractive,
    manifestVersion: row.manifestVersion,
    capabilities: [...row.capabilities],
    normalizedState: row.normalizedState,
    metadata: row.metadata,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...(maybeProject !== undefined ? { project: maybeProject } : {}),
  };
}

function mapInput(row: InputRow): LabInputRecord {
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

function mapNode(row: Prisma.LabNodeGetPayload<object>): LabNodeRecord {
  return { ...row };
}

function mapLink(row: Prisma.LabLinkGetPayload<object>): LabLinkRecord {
  return { ...row };
}

function mapScenario(row: Prisma.LabScenarioGetPayload<object>): LabScenarioRecord {
  return { ...row };
}

function mapRunbook(row: Prisma.LabRunbookStepGetPayload<object>): LabRunbookStepRecord {
  return { ...row };
}

function mapEvidence(row: EvidenceRow): LabEvidenceRecord {
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

function mapAggregate(row: AggregateRow): LabAggregate {
  return {
    ...mapLab(row),
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

export class PrismaLabRepository implements LabRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  async findAll(query: LabListQuery = {}): Promise<LabRecord[]> {
    const projectFilter = query.projectSlug || query.publishedProjectOnly
      ? {
          project: {
            is: {
              ...(query.projectSlug ? { slug: query.projectSlug } : {}),
              ...(query.publishedProjectOnly ? { status: 'PUBLISHED' as const } : {}),
            },
          },
        }
      : {};
    const rows = await this.client.lab.findMany({
      where: {
        ...(query.projectId ? { projectId: query.projectId } : {}),
        ...projectFilter,
        ...(query.domain ? { domain: query.domain } : {}),
        ...(query.kind ? { kind: query.kind } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      include: { project: { select: projectSelect } },
      orderBy: [{ createdAt: 'asc' }, { title: 'asc' }],
    });
    return rows.map(mapLab);
  }

  async findById(id: string): Promise<LabRecord | null> {
    const row = await this.client.lab.findUnique({ where: { id }, include: { project: { select: projectSelect } } });
    return row ? mapLab(row) : null;
  }

  async findBySlug(slug: string): Promise<LabRecord | null> {
    const row = await this.client.lab.findUnique({ where: { slug }, include: { project: { select: projectSelect } } });
    return row ? mapLab(row) : null;
  }

  async findAggregateById(id: string): Promise<LabAggregate | null> {
    const row = await this.client.lab.findUnique({ where: { id }, include: aggregateInclude });
    return row ? mapAggregate(row) : null;
  }

  async findAggregateBySlug(slug: string): Promise<LabAggregate | null> {
    const row = await this.client.lab.findUnique({ where: { slug }, include: aggregateInclude });
    return row ? mapAggregate(row) : null;
  }

  async findProjectById(id: string): Promise<LabAggregate['project']> {
    return this.client.project.findUnique({ where: { id }, select: projectSelect });
  }

  async findProjectBySlug(slug: string): Promise<LabAggregate['project']> {
    return this.client.project.findUnique({ where: { slug }, select: projectSelect });
  }

  async findArtifactById(id: string): Promise<LabArtifactReference | null> {
    const row = await this.client.artifact.findUnique({ where: { id }, select: artifactSelect });
    return row ? mapArtifact(row) : null;
  }

  async create(input: CreateLabInput): Promise<LabRecord> {
    const row = await this.client.lab.create({
      data: {
        slug: input.slug,
        title: input.title,
        summary: input.summary ?? null,
        domain: input.domain,
        kind: input.kind,
        status: input.status,
        projectId: input.projectId,
        isInteractive: input.isInteractive,
        manifestVersion: input.manifestVersion,
        capabilities: input.capabilities,
        normalizedState: jsonWrite(input.normalizedState),
        metadata: jsonWrite(input.metadata),
      },
      include: { project: { select: projectSelect } },
    });
    return mapLab(row);
  }

  async update(id: string, input: UpdateLabInput): Promise<LabRecord | null> {
    const exists = await this.client.lab.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return null;
    const row = await this.client.lab.update({
      where: { id },
      data: {
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.summary !== undefined ? { summary: input.summary } : {}),
        ...(input.domain !== undefined ? { domain: input.domain } : {}),
        ...(input.kind !== undefined ? { kind: input.kind } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
        ...(input.isInteractive !== undefined ? { isInteractive: input.isInteractive } : {}),
        ...(input.manifestVersion !== undefined ? { manifestVersion: input.manifestVersion } : {}),
        ...(input.capabilities !== undefined ? { capabilities: input.capabilities } : {}),
        ...(input.normalizedState !== undefined ? { normalizedState: jsonWrite(input.normalizedState) } : {}),
        ...(input.metadata !== undefined ? { metadata: jsonWrite(input.metadata) } : {}),
      },
      include: { project: { select: projectSelect } },
    });
    return mapLab(row);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.client.lab.deleteMany({ where: { id } });
    return result.count > 0;
  }

  async createInput(labId: string, input: CreateLabSourceInput): Promise<LabInputRecord> {
    const row = await this.client.labInput.create({
      data: {
        labId,
        inputKey: input.inputKey,
        inputType: input.inputType,
        label: input.label,
        description: input.description ?? null,
        sourceKind: input.sourceKind,
        schemaVersion: input.schemaVersion,
        payload: jsonWrite(input.payload),
        externalUrl: input.externalUrl ?? null,
        artifactId: input.artifactId ?? null,
        isPrimary: input.isPrimary,
        sortOrder: input.sortOrder,
      },
      include: { artifact: { select: artifactSelect } },
    });
    return mapInput(row);
  }

  async updateInput(labId: string, inputId: string, input: UpdateLabSourceInput): Promise<LabInputRecord | null> {
    const existing = await this.client.labInput.findFirst({ where: { id: inputId, labId }, select: { id: true } });
    if (!existing) return null;
    const row = await this.client.labInput.update({
      where: { id: inputId },
      data: {
        ...(input.inputKey !== undefined ? { inputKey: input.inputKey } : {}),
        ...(input.inputType !== undefined ? { inputType: input.inputType } : {}),
        ...(input.label !== undefined ? { label: input.label } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.sourceKind !== undefined ? { sourceKind: input.sourceKind } : {}),
        ...(input.schemaVersion !== undefined ? { schemaVersion: input.schemaVersion } : {}),
        ...(input.payload !== undefined ? { payload: jsonWrite(input.payload) } : {}),
        ...(input.externalUrl !== undefined ? { externalUrl: input.externalUrl } : {}),
        ...(input.artifactId !== undefined ? { artifactId: input.artifactId } : {}),
        ...(input.isPrimary !== undefined ? { isPrimary: input.isPrimary } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      },
      include: { artifact: { select: artifactSelect } },
    });
    return mapInput(row);
  }

  async deleteInput(labId: string, inputId: string): Promise<boolean> {
    const result = await this.client.labInput.deleteMany({ where: { id: inputId, labId } });
    return result.count > 0;
  }

  async replaceTopology(labId: string, nodes: LabNodeInput[], links: LabLinkInput[]): Promise<{ nodes: LabNodeRecord[]; links: LabLinkRecord[] }> {
    return this.client.$transaction(async (tx) => {
      await tx.labLink.deleteMany({ where: { labId } });
      await tx.labNode.deleteMany({ where: { labId } });
      for (const node of nodes) {
        await tx.labNode.create({
          data: {
            labId,
            nodeKey: node.nodeKey,
            label: node.label,
            kind: node.kind,
            description: node.description ?? null,
            position: jsonWrite(node.position),
            configuration: jsonWrite(node.configuration),
            metadata: jsonWrite(node.metadata),
          },
        });
      }
      for (const link of links) {
        await tx.labLink.create({
          data: {
            labId,
            linkKey: link.linkKey,
            sourceNodeKey: link.sourceNodeKey,
            targetNodeKey: link.targetNodeKey,
            label: link.label ?? null,
            kind: link.kind ?? null,
            configuration: jsonWrite(link.configuration),
            metadata: jsonWrite(link.metadata),
          },
        });
      }
      const [persistedNodes, persistedLinks] = await Promise.all([
        tx.labNode.findMany({ where: { labId }, orderBy: { createdAt: 'asc' } }),
        tx.labLink.findMany({ where: { labId }, orderBy: { createdAt: 'asc' } }),
      ]);
      return { nodes: persistedNodes.map(mapNode), links: persistedLinks.map(mapLink) };
    });
  }

  async createScenario(labId: string, input: CreateLabScenarioInput): Promise<LabScenarioRecord> {
    const row = await this.client.labScenario.create({
      data: {
        labId,
        slug: input.slug,
        title: input.title,
        summary: input.summary,
        description: input.description ?? null,
        order: input.order,
        isEnabled: input.isEnabled,
        baselineState: jsonWrite(input.baselineState),
        actions: jsonWrite(input.actions),
        expectedObservations: jsonWrite(input.expectedObservations),
        verificationCriteria: jsonWrite(input.verificationCriteria),
      },
    });
    return mapScenario(row);
  }

  async updateScenario(labId: string, scenarioId: string, input: UpdateLabScenarioInput): Promise<LabScenarioRecord | null> {
    const existing = await this.client.labScenario.findFirst({ where: { id: scenarioId, labId }, select: { id: true } });
    if (!existing) return null;
    const row = await this.client.labScenario.update({
      where: { id: scenarioId },
      data: {
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.summary !== undefined ? { summary: input.summary } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.order !== undefined ? { order: input.order } : {}),
        ...(input.isEnabled !== undefined ? { isEnabled: input.isEnabled } : {}),
        ...(input.baselineState !== undefined ? { baselineState: jsonWrite(input.baselineState) } : {}),
        ...(input.actions !== undefined ? { actions: jsonWrite(input.actions) } : {}),
        ...(input.expectedObservations !== undefined ? { expectedObservations: jsonWrite(input.expectedObservations) } : {}),
        ...(input.verificationCriteria !== undefined ? { verificationCriteria: jsonWrite(input.verificationCriteria) } : {}),
      },
    });
    return mapScenario(row);
  }

  async deleteScenario(labId: string, scenarioId: string): Promise<boolean> {
    const result = await this.client.labScenario.deleteMany({ where: { id: scenarioId, labId } });
    return result.count > 0;
  }

  async createRunbookStep(labId: string, input: CreateLabRunbookStepInput): Promise<LabRunbookStepRecord> {
    return mapRunbook(await this.client.labRunbookStep.create({ data: { labId, ...input } }));
  }

  async updateRunbookStep(labId: string, stepId: string, input: UpdateLabRunbookStepInput): Promise<LabRunbookStepRecord | null> {
    const existing = await this.client.labRunbookStep.findFirst({ where: { id: stepId, labId }, select: { id: true } });
    if (!existing) return null;
    return mapRunbook(await this.client.labRunbookStep.update({ where: { id: stepId }, data: input }));
  }

  async deleteRunbookStep(labId: string, stepId: string): Promise<boolean> {
    const result = await this.client.labRunbookStep.deleteMany({ where: { id: stepId, labId } });
    return result.count > 0;
  }

  async createEvidence(labId: string, projectId: string, input: CreateLabEvidenceInput): Promise<LabEvidenceRecord> {
    const row = await this.client.evidence.create({
      data: {
        labId,
        projectId,
        kind: input.kind,
        title: input.title,
        description: input.description ?? null,
        content: jsonWrite(input.content),
        artifactId: input.artifactId ?? null,
        externalUrl: input.externalUrl ?? null,
        isPublic: input.isPublic,
        sortOrder: input.sortOrder,
      },
      include: { artifact: { select: artifactSelect } },
    });
    return mapEvidence(row);
  }

  async updateEvidence(labId: string, evidenceId: string, input: UpdateLabEvidenceInput): Promise<LabEvidenceRecord | null> {
    const existing = await this.client.evidence.findFirst({ where: { id: evidenceId, labId }, select: { id: true } });
    if (!existing) return null;
    const row = await this.client.evidence.update({
      where: { id: evidenceId },
      data: {
        ...(input.kind !== undefined ? { kind: input.kind } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.content !== undefined ? { content: jsonWrite(input.content) } : {}),
        ...(input.artifactId !== undefined ? { artifactId: input.artifactId } : {}),
        ...(input.externalUrl !== undefined ? { externalUrl: input.externalUrl } : {}),
        ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      },
      include: { artifact: { select: artifactSelect } },
    });
    return mapEvidence(row);
  }

  async deleteEvidence(labId: string, evidenceId: string): Promise<boolean> {
    const result = await this.client.evidence.deleteMany({ where: { id: evidenceId, labId } });
    return result.count > 0;
  }
}
