import { ConflictError, NotFoundError, ValidationError } from '../../lib/errors.js';
import type {
  BlogRepository,
  CreateBlogInput,
  UpdateBlogInput,
} from '../../repositories/contracts/blog.repository.js';
import type { CategoryRepository } from '../../repositories/contracts/category.repository.js';
import {
  requireNonBlank,
  validateBoolean,
  validateInteger,
  validateIsoDate,
  validateOptionalInteger,
  validateOptionalBoolean,
  validateOptionalIsoDate,
  validateOptionalNonBlank,
  validateOptionalStringArray,
  validateStringArray,
} from './content-validation.js';

export interface PublicBlogQuery {
  categoryId?: string;
  tag?: string;
}

export class BlogService {
  constructor(
    private readonly blogs: BlogRepository,
    private readonly categories: CategoryRepository,
  ) {}

  listPublic(query: PublicBlogQuery = {}) {
    return this.blogs.findAll({ ...query, isPublished: true });
  }

  listAll(query: PublicBlogQuery = {}) {
    return this.blogs.findAll(query);
  }

  async getPublicBySlug(slug: string) {
    const blog = await this.blogs.findBySlug(slug);
    if (!blog || !blog.isPublished) throw new NotFoundError('Blog post not found');
    return blog;
  }

  async getById(id: string) {
    const blog = await this.blogs.findById(id);
    if (!blog) throw new NotFoundError('Blog post not found');
    return blog;
  }

  async create(input: CreateBlogInput) {
    this.validateCreate(input);
    await this.assertCategoryExists(input.categoryId);
    const duplicate = await this.blogs.findBySlug(input.slug);
    if (duplicate) throw new ConflictError('A blog post with this slug already exists');
    return this.blogs.create(input);
  }

  async update(id: string, input: UpdateBlogInput) {
    this.validateUpdate(input);
    if (input.categoryId !== undefined) await this.assertCategoryExists(input.categoryId);
    if (input.slug !== undefined) {
      const duplicate = await this.blogs.findBySlug(input.slug);
      if (duplicate && duplicate.id !== id) {
        throw new ConflictError('A blog post with this slug already exists');
      }
    }
    const blog = await this.blogs.update(id, input);
    if (!blog) throw new NotFoundError('Blog post not found');
    return blog;
  }

  async delete(id: string) {
    const deleted = await this.blogs.delete(id);
    if (!deleted) throw new NotFoundError('Blog post not found');
  }

  private async assertCategoryExists(categoryId: string): Promise<void> {
    const category = await this.categories.findById(categoryId);
    if (!category) throw new ValidationError('categoryId does not identify an existing category');
  }

  private validateCreate(input: CreateBlogInput): void {
    requireNonBlank(input.title, 'title');
    requireNonBlank(input.slug, 'slug');
    requireNonBlank(input.contentMarkdown, 'contentMarkdown');
    requireNonBlank(input.categoryId, 'categoryId');
    validateInteger(input.readTimeMinutes, 'readTimeMinutes');
    if (input.readTimeMinutes <= 0) throw new ValidationError('readTimeMinutes must be greater than zero');
    validateStringArray(input.tags, 'tags');
    validateIsoDate(input.publishedAt, 'publishedAt');
    validateBoolean(input.isPublished, 'isPublished');
  }

  private validateUpdate(input: UpdateBlogInput): void {
    validateOptionalNonBlank(input.title, 'title');
    validateOptionalNonBlank(input.slug, 'slug');
    validateOptionalNonBlank(input.contentMarkdown, 'contentMarkdown');
    validateOptionalNonBlank(input.categoryId, 'categoryId');
    validateOptionalInteger(input.readTimeMinutes, 'readTimeMinutes');
    if (input.readTimeMinutes !== undefined && input.readTimeMinutes <= 0) {
      throw new ValidationError('readTimeMinutes must be greater than zero');
    }
    validateOptionalStringArray(input.tags, 'tags');
    validateOptionalIsoDate(input.publishedAt, 'publishedAt');
    validateOptionalBoolean(input.isPublished, 'isPublished');
  }
}
