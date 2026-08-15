import { ConflictError, NotFoundError } from '../../lib/errors.js';
import type {
  CategoryRepository,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../../repositories/contracts/category.repository.js';
import type { Domain } from '../../types/index.js';
import {
  requireNonBlank,
  validateBoolean,
  validateEnum,
  validateInteger,
  validateOptionalEnum,
  validateOptionalBoolean,
  validateOptionalInteger,
  validateOptionalNonBlank,
} from './content-validation.js';

const CATEGORY_THEMES = new Set(['green', 'cyan', 'amber', 'violet', 'emerald']);
const CATEGORY_DOMAINS = new Set<Domain>(['NETWORKING', 'LINUX', 'DEVOPS']);

export class CategoryService {
  constructor(private readonly categories: CategoryRepository) {}

  listPublic() {
    return this.categories.findAll({ isPublished: true });
  }

  listAll() {
    return this.categories.findAll();
  }

  async getPublicBySlug(slug: string) {
    const category = await this.categories.findBySlug(slug);
    if (!category || !category.isPublished) throw new NotFoundError('Category not found');
    return category;
  }

  async getById(id: string) {
    const category = await this.categories.findById(id);
    if (!category) throw new NotFoundError('Category not found');
    return category;
  }

  async create(input: CreateCategoryInput) {
    this.validateCreate(input);
    const duplicate = await this.categories.findBySlug(input.slug);
    if (duplicate) throw new ConflictError('A category with this slug already exists');
    return this.categories.create(input);
  }

  async update(id: string, input: UpdateCategoryInput) {
    this.validateUpdate(input);
    if (input.slug !== undefined) {
      const duplicate = await this.categories.findBySlug(input.slug);
      if (duplicate && duplicate.id !== id) {
        throw new ConflictError('A category with this slug already exists');
      }
    }
    const category = await this.categories.update(id, input);
    if (!category) throw new NotFoundError('Category not found');
    return category;
  }

  async delete(id: string) {
    const deleted = await this.categories.delete(id);
    if (!deleted) throw new NotFoundError('Category not found');
  }

  private validateCreate(input: CreateCategoryInput): void {
    requireNonBlank(input.name, 'name');
    requireNonBlank(input.slug, 'slug');
    requireNonBlank(input.icon, 'icon');
    requireNonBlank(input.accentColor, 'accentColor');
    validateEnum(input.terminalTheme, CATEGORY_THEMES, 'terminalTheme');
    validateEnum(input.domain, CATEGORY_DOMAINS, 'domain');
    validateInteger(input.sortOrder, 'sortOrder');
    validateBoolean(input.isPublished, 'isPublished');
  }

  private validateUpdate(input: UpdateCategoryInput): void {
    validateOptionalNonBlank(input.name, 'name');
    validateOptionalNonBlank(input.slug, 'slug');
    validateOptionalNonBlank(input.icon, 'icon');
    validateOptionalNonBlank(input.accentColor, 'accentColor');
    validateOptionalEnum(input.terminalTheme, CATEGORY_THEMES, 'terminalTheme');
    validateOptionalEnum(input.domain, CATEGORY_DOMAINS, 'domain');
    validateOptionalInteger(input.sortOrder, 'sortOrder');
    validateOptionalBoolean(input.isPublished, 'isPublished');
  }
}
