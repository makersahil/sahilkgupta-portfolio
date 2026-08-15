import type { Category, Domain } from '../../types/index.js';

export type CategoryWritableFields = Pick<
  Category,
  | 'slug'
  | 'name'
  | 'tagline'
  | 'description'
  | 'icon'
  | 'accentColor'
  | 'terminalTheme'
  | 'sortOrder'
  | 'isPublished'
>;

export type CreateCategoryInput = CategoryWritableFields & { domain: Domain };
export type UpdateCategoryInput = Partial<CategoryWritableFields & { domain: Domain }>;

export interface CategoryListQuery {
  isPublished?: boolean;
}

export interface CategoryRepository {
  findAll(query?: CategoryListQuery): Promise<Category[]>;
  findById(id: string): Promise<Category | null>;
  findBySlug(slug: string): Promise<Category | null>;
  create(input: CreateCategoryInput): Promise<Category>;
  update(id: string, input: UpdateCategoryInput): Promise<Category | null>;
  delete(id: string): Promise<boolean>;
}
