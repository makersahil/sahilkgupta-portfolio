import { Prisma, type LabKind, type PrismaClient, type ProjectFormatType } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type {
  CreateProjectInput,
  ProjectListQuery,
  ProjectLookupOptions,
  ProjectRepository,
  UpdateProjectInput,
} from '../contracts/project.repository.js';
import type { Project } from '../../types/index.js';
import { ValidationError } from '../../lib/errors.js';
import { mapProject } from './mappers.js';
import {
  assertCategoryDomain,
  normalizeProjectFormat,
  normalizeProjectStatus,
  normalizeProjectStatuses,
  publicationStatusForProject,
  requireInteger,
  requireNonEmptyString,
  requireStringArray,
  toInputJson,
} from './validation.js';

interface CompatibilityPayload {
  kind: LabKind;
  metadata: Prisma.InputJsonValue;
}

function labKindForFormat(formatType: ProjectFormatType): LabKind | null {
  switch (formatType) {
    case 'CISCO_PKT_LAB':
      return 'NETWORK_TOPOLOGY';
    case 'RHCSA_MATRIX':
      return 'LINUX_SYSTEM';
    case 'DEVOPS_PIPELINE':
      return 'DEVOPS_PIPELINE';
    case 'STANDARD':
      return null;
  }
}

function compatibilityPayload(
  input: Pick<
    UpdateProjectInput,
    'ciscoLabData' | 'rhcsaMatrixData' | 'devopsPipelineData'
  >,
  formatType: ProjectFormatType,
): CompatibilityPayload | undefined {
  const provided = [
    input.ciscoLabData !== undefined
      ? { kind: 'NETWORK_TOPOLOGY' as const, value: input.ciscoLabData, field: 'ciscoLabData' }
      : undefined,
    input.rhcsaMatrixData !== undefined
      ? { kind: 'LINUX_SYSTEM' as const, value: input.rhcsaMatrixData, field: 'rhcsaMatrixData' }
      : undefined,
    input.devopsPipelineData !== undefined
      ? { kind: 'DEVOPS_PIPELINE' as const, value: input.devopsPipelineData, field: 'devopsPipelineData' }
      : undefined,
  ].filter((entry): entry is NonNullable<typeof entry> => entry !== undefined);

  if (provided.length > 1) {
    throw new ValidationError('A project compatibility update may contain only one specialized payload', {
      fields: provided.map((entry) => entry.field),
    });
  }

  if (provided.length === 0) return undefined;

  const expectedKind = labKindForFormat(formatType);
  if (expectedKind !== provided[0].kind) {
    throw new ValidationError('Project format type does not match its specialized payload', {
      field: 'formatType',
      formatType,
      payload: provided[0].field,
    });
  }

  return {
    kind: provided[0].kind,
    metadata: toInputJson(provided[0].value, provided[0].field),
  };
}

function compatibilityLabSlug(projectSlug: string, kind: LabKind): string {
  const suffix =
    kind === 'NETWORK_TOPOLOGY'
      ? 'network-topology'
      : kind === 'LINUX_SYSTEM'
        ? 'linux-system'
        : 'devops-pipeline';
  return `${projectSlug}-${suffix}`;
}

export class PrismaProjectRepository implements ProjectRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  async findAll(query: ProjectListQuery = {}): Promise<Project[]> {
    const statuses = normalizeProjectStatuses(query.statuses);
    const rows = await this.client.project.findMany({
      where: {
        categoryId: query.categoryId ?? { not: null },
        ...(query.isPublished === undefined
          ? {}
          : { status: query.isPublished ? 'PUBLISHED' : { not: 'PUBLISHED' } }),
        ...(query.tag ? { tags: { has: query.tag } } : {}),
        ...(statuses ? { lifecycleStatus: { in: statuses } } : {}),
      },
      include: { labs: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return rows.map(mapProject);
  }

  async findById(id: string): Promise<Project | null> {
    const row = await this.client.project.findUnique({
      where: { id },
      include: { labs: true },
    });
    return row ? mapProject(row) : null;
  }

  async findBySlug(slug: string, options: ProjectLookupOptions = {}): Promise<Project | null> {
    const row = await this.client.project.findUnique({
      where: {
        slug,
        ...(options.isPublished === undefined
          ? {}
          : { status: options.isPublished ? 'PUBLISHED' : { not: 'PUBLISHED' } }),
      },
      include: { labs: true },
    });
    return row ? mapProject(row) : null;
  }

  async create(input: CreateProjectInput): Promise<Project> {
    return this.client.$transaction(async (transaction) => {
      const category = await transaction.category.findUnique({
        where: { id: input.categoryId },
        select: { id: true, domain: true },
      });
      const domain = assertCategoryDomain(category, input.categoryId);
      const formatType = normalizeProjectFormat(input.formatType ?? 'standard');
      const payload = compatibilityPayload(input, formatType);
      const lifecycleStatus = normalizeProjectStatus(input.status);
      const publicationStatus = publicationStatusForProject(lifecycleStatus);

      const project = await transaction.project.create({
        data: {
          title: requireNonEmptyString(input.title, 'title'),
          slug: requireNonEmptyString(input.slug, 'slug'),
          summary: input.summary ?? '',
          descriptionMarkdown: input.descriptionMarkdown ?? '',
          domain,
          categoryId: input.categoryId,
          status: publicationStatus,
          lifecycleStatus,
          formatType,
          featured: Boolean(input.isFeatured),
          sortOrder: requireInteger(input.sortOrder, 'sortOrder'),
          coverImageUrl: input.coverImageUrl,
          architectureSvg: input.architectureSvg,
          liveUrl: input.liveUrl,
          githubUrl: input.githubUrl,
          packetTracerFile: input.packetTracerFile,
          topologyConfigJson: input.topologyConfigJson,
          metrics: input.metrics === undefined ? undefined : toInputJson(input.metrics, 'metrics'),
          technologies: requireStringArray(input.devopsStack, 'devopsStack'),
          tags: requireStringArray(input.tags, 'tags'),
          publishedAt: publicationStatus === 'PUBLISHED' ? new Date() : null,
        },
      });

      if (payload) {
        await transaction.lab.create({
          data: {
            slug: compatibilityLabSlug(project.slug, payload.kind),
            title: `${project.title} Lab`,
            domain,
            kind: payload.kind,
            status: 'READY',
            projectId: project.id,
            metadata: payload.metadata,
          },
        });
      }

      const created = await transaction.project.findUniqueOrThrow({
        where: { id: project.id },
        include: { labs: true },
      });
      return mapProject(created);
    });
  }

  async update(id: string, input: UpdateProjectInput): Promise<Project | null> {
    return this.client.$transaction(async (transaction) => {
      const existing = await transaction.project.findUnique({ where: { id } });
      if (!existing) return null;

      let categoryId = existing.categoryId;
      let domain = existing.domain;
      if (input.categoryId !== undefined) {
        const category = await transaction.category.findUnique({
          where: { id: input.categoryId },
          select: { id: true, domain: true },
        });
        domain = assertCategoryDomain(category, input.categoryId);
        categoryId = input.categoryId;
      } else if (categoryId) {
        const category = await transaction.category.findUnique({
          where: { id: categoryId },
          select: { id: true, domain: true },
        });
        const persistedDomain = assertCategoryDomain(category, categoryId);
        if (persistedDomain !== existing.domain) {
          throw new ValidationError('Project domain does not match its category domain', {
            projectId: id,
            categoryId,
          });
        }
      }

      const formatType =
        input.formatType === undefined ? existing.formatType : normalizeProjectFormat(input.formatType);
      const payload = compatibilityPayload(input, formatType);
      const nextLifecycleStatus =
        input.status === undefined ? existing.lifecycleStatus : normalizeProjectStatus(input.status);
      const nextPublicationStatus = publicationStatusForProject(nextLifecycleStatus);

      await transaction.project.update({
        where: { id },
        data: {
          ...(input.title !== undefined
            ? { title: requireNonEmptyString(input.title, 'title') }
            : {}),
          ...(input.slug !== undefined ? { slug: requireNonEmptyString(input.slug, 'slug') } : {}),
          ...(input.summary !== undefined ? { summary: input.summary } : {}),
          ...(input.descriptionMarkdown !== undefined
            ? { descriptionMarkdown: input.descriptionMarkdown }
            : {}),
          ...(input.categoryId !== undefined ? { categoryId, domain } : {}),
          ...(input.status !== undefined
            ? {
                lifecycleStatus: nextLifecycleStatus,
                status: nextPublicationStatus,
                publishedAt:
                  nextPublicationStatus === 'PUBLISHED'
                    ? (existing.publishedAt ?? new Date())
                    : null,
              }
            : {}),
          ...(input.formatType !== undefined ? { formatType } : {}),
          ...(input.isFeatured !== undefined ? { featured: Boolean(input.isFeatured) } : {}),
          ...(input.sortOrder !== undefined
            ? { sortOrder: requireInteger(input.sortOrder, 'sortOrder') }
            : {}),
          ...(input.coverImageUrl !== undefined ? { coverImageUrl: input.coverImageUrl } : {}),
          ...(input.architectureSvg !== undefined ? { architectureSvg: input.architectureSvg } : {}),
          ...(input.liveUrl !== undefined ? { liveUrl: input.liveUrl } : {}),
          ...(input.githubUrl !== undefined ? { githubUrl: input.githubUrl } : {}),
          ...(input.packetTracerFile !== undefined
            ? { packetTracerFile: input.packetTracerFile }
            : {}),
          ...(input.topologyConfigJson !== undefined
            ? { topologyConfigJson: input.topologyConfigJson }
            : {}),
          ...(input.metrics !== undefined
            ? {
                metrics:
                  input.metrics === null ? Prisma.DbNull : toInputJson(input.metrics, 'metrics'),
              }
            : {}),
          ...(input.devopsStack !== undefined
            ? { technologies: requireStringArray(input.devopsStack, 'devopsStack') }
            : {}),
          ...(input.tags !== undefined ? { tags: requireStringArray(input.tags, 'tags') } : {}),
        },
      });

      if (input.categoryId !== undefined) {
        await transaction.lab.updateMany({ where: { projectId: id }, data: { domain } });
      }

      if (payload) {
        const activeLab = await transaction.lab.findFirst({
          where: { projectId: id, kind: payload.kind, status: { not: 'ARCHIVED' } },
          orderBy: { createdAt: 'asc' },
        });
        const compatibilityLab =
          activeLab ??
          (await transaction.lab.findFirst({
            where: { projectId: id, kind: payload.kind },
            orderBy: { createdAt: 'asc' },
          }));

        if (compatibilityLab) {
          await transaction.lab.update({
            where: { id: compatibilityLab.id },
            data: { metadata: payload.metadata },
          });
        } else {
          const persisted = await transaction.project.findUniqueOrThrow({ where: { id } });
          await transaction.lab.create({
            data: {
              slug: compatibilityLabSlug(persisted.slug, payload.kind),
              title: `${persisted.title} Lab`,
              domain,
              kind: payload.kind,
              status: 'READY',
              projectId: id,
              metadata: payload.metadata,
            },
          });
        }
      }

      const updated = await transaction.project.findUniqueOrThrow({
        where: { id },
        include: { labs: true },
      });
      return mapProject(updated);
    });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.client.project.deleteMany({ where: { id } });
    return result.count > 0;
  }
}
