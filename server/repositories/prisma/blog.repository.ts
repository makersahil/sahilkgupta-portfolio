import type { PrismaClient } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type {
  BlogListQuery,
  BlogRepository,
  CreateBlogInput,
  UpdateBlogInput,
} from '../contracts/blog.repository.js';
import type { BlogPost } from '../../types/index.js';
import { ValidationError } from '../../lib/errors.js';
import { mapBlog } from './mappers.js';
import {
  parseDate,
  requireInteger,
  requireNonEmptyString,
  requireStringArray,
} from './validation.js';

export class PrismaBlogRepository implements BlogRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  async findAll(query: BlogListQuery = {}): Promise<BlogPost[]> {
    const rows = await this.client.blogPost.findMany({
      where: {
        categoryId: query.categoryId ?? { not: null },
        ...(query.tag ? { tags: { has: query.tag } } : {}),
        ...(query.isPublished === undefined
          ? {}
          : { status: query.isPublished ? 'PUBLISHED' : { not: 'PUBLISHED' } }),
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return rows.map(mapBlog);
  }

  async findById(id: string): Promise<BlogPost | null> {
    const row = await this.client.blogPost.findUnique({ where: { id } });
    return row ? mapBlog(row) : null;
  }

  async findBySlug(slug: string): Promise<BlogPost | null> {
    const row = await this.client.blogPost.findUnique({ where: { slug } });
    return row ? mapBlog(row) : null;
  }

  async create(input: CreateBlogInput): Promise<BlogPost> {
    const row = await this.client.$transaction(async (transaction) => {
      const category = await transaction.category.findUnique({
        where: { id: input.categoryId },
        select: { domain: true },
      });
      if (!category) {
        throw new ValidationError('Blog category does not exist', {
          field: 'categoryId',
          categoryId: input.categoryId,
        });
      }

      return transaction.blogPost.create({
        data: {
          title: requireNonEmptyString(input.title, 'title'),
          slug: requireNonEmptyString(input.slug, 'slug'),
          excerpt: input.excerpt ?? '',
          content: requireNonEmptyString(input.contentMarkdown, 'contentMarkdown'),
          categoryId: input.categoryId,
          domain: category.domain,
          coverImageUrl: input.coverImageUrl,
          readTimeMinutes: requireInteger(input.readTimeMinutes, 'readTimeMinutes', 1),
          tags: requireStringArray(input.tags, 'tags'),
          status: input.isPublished ? 'PUBLISHED' : 'DRAFT',
          publishedAt: parseDate(input.publishedAt, 'publishedAt'),
        },
      });
    });

    return mapBlog(row);
  }

  async update(id: string, input: UpdateBlogInput): Promise<BlogPost | null> {
    const row = await this.client.$transaction(async (transaction) => {
      const existing = await transaction.blogPost.findUnique({ where: { id } });
      if (!existing) return null;

      let categoryDomain = existing.domain;
      if (input.categoryId !== undefined) {
        const category = await transaction.category.findUnique({
          where: { id: input.categoryId },
          select: { domain: true },
        });
        if (!category) {
          throw new ValidationError('Blog category does not exist', {
            field: 'categoryId',
            categoryId: input.categoryId,
          });
        }
        categoryDomain = category.domain;
      }

      return transaction.blogPost.update({
        where: { id },
        data: {
          ...(input.title !== undefined
            ? { title: requireNonEmptyString(input.title, 'title') }
            : {}),
          ...(input.slug !== undefined ? { slug: requireNonEmptyString(input.slug, 'slug') } : {}),
          ...(input.excerpt !== undefined ? { excerpt: input.excerpt } : {}),
          ...(input.contentMarkdown !== undefined
            ? { content: requireNonEmptyString(input.contentMarkdown, 'contentMarkdown') }
            : {}),
          ...(input.categoryId !== undefined
            ? { categoryId: input.categoryId, domain: categoryDomain }
            : {}),
          ...(input.coverImageUrl !== undefined ? { coverImageUrl: input.coverImageUrl } : {}),
          ...(input.readTimeMinutes !== undefined
            ? { readTimeMinutes: requireInteger(input.readTimeMinutes, 'readTimeMinutes', 1) }
            : {}),
          ...(input.tags !== undefined ? { tags: requireStringArray(input.tags, 'tags') } : {}),
          ...(input.isPublished !== undefined
            ? { status: input.isPublished ? 'PUBLISHED' : 'DRAFT' }
            : {}),
          ...(input.publishedAt !== undefined
            ? { publishedAt: parseDate(input.publishedAt, 'publishedAt') }
            : {}),
        },
      });
    });

    return row ? mapBlog(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.client.blogPost.deleteMany({ where: { id } });
    return result.count > 0;
  }
}
