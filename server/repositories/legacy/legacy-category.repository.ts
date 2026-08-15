import { dbService } from '../../services/db.service.js';
import { ConflictError } from '../../lib/errors.js';
import type { Category, Domain } from '../../types/index.js';
import type {
  CategoryListQuery,
  CategoryRepository,
  CategoryWritableFields,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../contracts/category.repository.js';
import { pickFields, pickPresentFields } from './legacy-write.utils.js';

const writableKeys = [
  'slug',
  'name',
  'tagline',
  'description',
  'icon',
  'accentColor',
  'terminalTheme',
  'sortOrder',
  'isPublished',
  'domain',
] as const satisfies readonly (keyof (CategoryWritableFields & { domain: Domain }))[];

function inferDomain(category: Pick<Category, 'slug' | 'name' | 'domain'>): Domain | undefined {
  if (category.domain) return category.domain;
  const probe = `${category.slug} ${category.name}`.toLowerCase();
  if (probe.includes('network')) return 'NETWORKING';
  if (probe.includes('linux') || probe.includes('rhel')) return 'LINUX';
  if (probe.includes('devops') || probe.includes('kubernetes') || probe.includes('cloud')) {
    return 'DEVOPS';
  }
  return undefined;
}

function normalizeCategory(category: Category): Category {
  const domain = inferDomain(category);
  return domain ? { ...category, domain } : category;
}

type LegacyCategoryDataSource = Pick<
  typeof dbService,
  | 'getCategories'
  | 'getCategoryBySlug'
  | 'getProjects'
  | 'getAllBlogs'
  | 'getSkills'
  | 'getCertifications'
  | 'createCategory'
  | 'updateCategory'
  | 'deleteCategory'
>;

export class LegacyCategoryRepository implements CategoryRepository {
  constructor(private readonly db: LegacyCategoryDataSource = dbService) {}

  async findAll(query: CategoryListQuery = {}) {
    const categories = this.db.getCategories().map(normalizeCategory);
    if (query.isPublished === undefined) return categories;
    return categories.filter((category) => category.isPublished === query.isPublished);
  }

  async findById(id: string) {
    const category = this.db.getCategories().find((item) => item.id === id);
    return category ? normalizeCategory(category) : null;
  }

  async findBySlug(slug: string) {
    const category = this.db.getCategoryBySlug(slug);
    return category ? normalizeCategory(category) : null;
  }

  async create(input: CreateCategoryInput) {
    return normalizeCategory(this.db.createCategory(pickFields(input, writableKeys)));
  }

  async update(id: string, input: UpdateCategoryInput) {
    const updated = this.db.updateCategory(id, pickPresentFields(input, writableKeys));
    return updated ? normalizeCategory(updated) : null;
  }

  async delete(id: string) {
    const hasDependents =
      this.db.getProjects(id).length > 0 ||
      this.db.getAllBlogs(id).length > 0 ||
      this.db.getSkills(id).length > 0 ||
      this.db.getCertifications(id).length > 0;

    if (hasDependents) {
      throw new ConflictError('Category cannot be deleted while content still references it');
    }

    return this.db.deleteCategory(id);
  }
}
