import { ConflictError, NotFoundError, ValidationError } from '../../lib/errors.js';
import type { CategoryRepository } from '../../repositories/contracts/category.repository.js';
import type {
  CreateProjectInput,
  ProjectRepository,
  UpdateProjectInput,
} from '../../repositories/contracts/project.repository.js';
import type { ProjectFormatType, ProjectStatus } from '../../types/index.js';
import {
  requireNonBlank,
  validateBoolean,
  validateEnum,
  validateInteger,
  validateOptionalEnum,
  validateOptionalBoolean,
  validateOptionalInteger,
  validateOptionalNonBlank,
  validateOptionalStringArray,
  validateStringArray,
} from './content-validation.js';

const PUBLIC_PROJECT_STATUSES: readonly ProjectStatus[] = ['COMPLETED'];
const PROJECT_STATUSES = new Set<ProjectStatus>(['COMPLETED', 'IN_PROGRESS', 'ARCHIVED', 'PLANNED']);
const PROJECT_FORMATS = new Set<ProjectFormatType>([
  'cisco_pkt_lab',
  'rhcsa_matrix',
  'devops_pipeline',
  'standard',
]);

export interface PublicProjectQuery {
  categoryId?: string;
  tag?: string;
}

export class ProjectService {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly categories: CategoryRepository,
  ) {}

  listPublic(query: PublicProjectQuery = {}) {
    return this.projects.findAll({
      ...query,
      statuses: PUBLIC_PROJECT_STATUSES,
      isPublished: true,
    });
  }

  listAll(query: PublicProjectQuery = {}) {
    return this.projects.findAll(query);
  }

  async getPublicBySlug(slug: string) {
    const project = await this.projects.findBySlug(slug, { isPublished: true });
    if (!project || !PUBLIC_PROJECT_STATUSES.includes(project.status)) {
      throw new NotFoundError('Project not found');
    }
    return project;
  }

  async getById(id: string) {
    const project = await this.projects.findById(id);
    if (!project) throw new NotFoundError('Project not found');
    return project;
  }

  async create(input: CreateProjectInput) {
    this.validateCreate(input);
    await this.assertCategoryExists(input.categoryId);
    const duplicate = await this.projects.findBySlug(input.slug);
    if (duplicate) throw new ConflictError('A project with this slug already exists');
    return this.projects.create(input);
  }

  async update(id: string, input: UpdateProjectInput) {
    this.validateUpdate(input);
    if (input.categoryId !== undefined) await this.assertCategoryExists(input.categoryId);
    if (input.slug !== undefined) {
      const duplicate = await this.projects.findBySlug(input.slug);
      if (duplicate && duplicate.id !== id) {
        throw new ConflictError('A project with this slug already exists');
      }
    }
    const project = await this.projects.update(id, input);
    if (!project) throw new NotFoundError('Project not found');
    return project;
  }

  async delete(id: string) {
    const deleted = await this.projects.delete(id);
    if (!deleted) throw new NotFoundError('Project not found');
  }

  private async assertCategoryExists(categoryId: string): Promise<void> {
    const category = await this.categories.findById(categoryId);
    if (!category) throw new ValidationError('categoryId does not identify an existing category');
  }

  private validateCreate(input: CreateProjectInput): void {
    requireNonBlank(input.title, 'title');
    requireNonBlank(input.slug, 'slug');
    requireNonBlank(input.categoryId, 'categoryId');
    validateEnum(input.status, PROJECT_STATUSES, 'status');
    if (input.formatType !== undefined) validateEnum(input.formatType, PROJECT_FORMATS, 'formatType');
    validateInteger(input.sortOrder, 'sortOrder');
    validateBoolean(input.isFeatured, 'isFeatured');
    validateStringArray(input.devopsStack, 'devopsStack');
    validateStringArray(input.tags, 'tags');
  }

  private validateUpdate(input: UpdateProjectInput): void {
    validateOptionalNonBlank(input.title, 'title');
    validateOptionalNonBlank(input.slug, 'slug');
    validateOptionalNonBlank(input.categoryId, 'categoryId');
    validateOptionalEnum(input.status, PROJECT_STATUSES, 'status');
    validateOptionalEnum(input.formatType, PROJECT_FORMATS, 'formatType');
    validateOptionalInteger(input.sortOrder, 'sortOrder');
    validateOptionalBoolean(input.isFeatured, 'isFeatured');
    validateOptionalStringArray(input.devopsStack, 'devopsStack');
    validateOptionalStringArray(input.tags, 'tags');
  }
}
