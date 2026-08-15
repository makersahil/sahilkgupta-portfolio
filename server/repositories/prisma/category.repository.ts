import type { Domain, LabKind, PrismaClient } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type {
  CategoryListQuery,
  CategoryRepository,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../contracts/category.repository.js';
import type { Category } from '../../types/index.js';
import { ValidationError } from '../../lib/errors.js';
import { mapCategory } from './mappers.js';
import { requireInteger, requireNonEmptyString } from './validation.js';

const TERMINAL_THEMES = new Set<Category['terminalTheme']>([
  'green',
  'cyan',
  'amber',
  'violet',
  'emerald',
]);


const LAB_KIND_BY_DOMAIN: Record<Domain, LabKind> = {
  NETWORKING: 'NETWORK_TOPOLOGY',
  LINUX: 'LINUX_SYSTEM',
  DEVOPS: 'DEVOPS_PIPELINE',
};

function validateTerminalTheme(value: unknown): Category['terminalTheme'] {
  if (typeof value !== 'string' || !TERMINAL_THEMES.has(value as Category['terminalTheme'])) {
    throw new ValidationError('Unsupported terminal theme', {
      field: 'terminalTheme',
      value: typeof value === 'string' ? value : typeof value,
      allowed: [...TERMINAL_THEMES],
    });
  }

  return value as Category['terminalTheme'];
}

export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  async findAll(query: CategoryListQuery = {}): Promise<Category[]> {
    const rows = await this.client.category.findMany({
      where:
        query.isPublished === undefined
          ? undefined
          : {
              status: query.isPublished ? 'PUBLISHED' : { not: 'PUBLISHED' },
            },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return rows.map(mapCategory);
  }

  async findById(id: string): Promise<Category | null> {
    const row = await this.client.category.findUnique({ where: { id } });
    return row ? mapCategory(row) : null;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const row = await this.client.category.findUnique({ where: { slug } });
    return row ? mapCategory(row) : null;
  }

  async create(input: CreateCategoryInput): Promise<Category> {
    const row = await this.client.category.create({
      data: {
        name: requireNonEmptyString(input.name, 'name'),
        slug: requireNonEmptyString(input.slug, 'slug'),
        tagline: input.tagline ?? '',
        description: input.description ?? '',
        icon: requireNonEmptyString(input.icon, 'icon'),
        accentColor: requireNonEmptyString(input.accentColor, 'accentColor'),
        terminalTheme: validateTerminalTheme(input.terminalTheme),
        sortOrder: requireInteger(input.sortOrder, 'sortOrder'),
        domain: input.domain,
        status: input.isPublished ? 'PUBLISHED' : 'DRAFT',
      },
    });

    return mapCategory(row);
  }

  async update(id: string, input: UpdateCategoryInput): Promise<Category | null> {
    return this.client.$transaction(async (transaction) => {
      const existing = await transaction.category.findUnique({ where: { id } });
      if (!existing) return null;

      const row = await transaction.category.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: requireNonEmptyString(input.name, 'name') } : {}),
          ...(input.slug !== undefined ? { slug: requireNonEmptyString(input.slug, 'slug') } : {}),
          ...(input.tagline !== undefined ? { tagline: input.tagline } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.icon !== undefined ? { icon: requireNonEmptyString(input.icon, 'icon') } : {}),
          ...(input.accentColor !== undefined
            ? { accentColor: requireNonEmptyString(input.accentColor, 'accentColor') }
            : {}),
          ...(input.terminalTheme !== undefined
            ? { terminalTheme: validateTerminalTheme(input.terminalTheme) }
            : {}),
          ...(input.sortOrder !== undefined
            ? { sortOrder: requireInteger(input.sortOrder, 'sortOrder') }
            : {}),
          ...(input.domain !== undefined ? { domain: input.domain } : {}),
          ...(input.isPublished !== undefined
            ? { status: input.isPublished ? 'PUBLISHED' : 'DRAFT' }
            : {}),
        },
      });

      if (input.domain !== undefined && input.domain !== existing.domain) {
        const projectIds = (
          await transaction.project.findMany({
            where: { categoryId: id },
            select: { id: true },
          })
        ).map(({ id: projectId }) => projectId);

        await transaction.project.updateMany({
          where: { categoryId: id },
          data: { domain: input.domain },
        });
        await transaction.blogPost.updateMany({
          where: { categoryId: id },
          data: { domain: input.domain },
        });
        if (projectIds.length > 0) {
          const incompatibleLab = await transaction.lab.findFirst({
            where: {
              projectId: { in: projectIds },
              kind: { not: LAB_KIND_BY_DOMAIN[input.domain] },
            },
            select: { id: true, slug: true, kind: true },
          });
          if (incompatibleLab) {
            throw new ValidationError('Category domain change would make an existing lab incompatible with its project domain', {
              labId: incompatibleLab.id,
              labSlug: incompatibleLab.slug,
              labKind: incompatibleLab.kind,
              requestedDomain: input.domain,
            });
          }
          await transaction.lab.updateMany({
            where: { projectId: { in: projectIds } },
            data: { domain: input.domain },
          });
        }
      }

      return mapCategory(row);
    }, {
      // Category domain changes reconcile projects, blogs, and labs in one atomic unit.
      // Remote PostgreSQL latency can exceed Prisma's 5s interactive-transaction default.
      maxWait: 10_000,
      timeout: 30_000,
    });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.client.category.deleteMany({ where: { id } });
    return result.count > 0;
  }
}
