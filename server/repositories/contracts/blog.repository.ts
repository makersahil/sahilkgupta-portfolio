import type { BlogPost } from '../../types/index.js';

export type BlogWritableFields = Pick<
  BlogPost,
  | 'title'
  | 'slug'
  | 'excerpt'
  | 'contentMarkdown'
  | 'categoryId'
  | 'coverImageUrl'
  | 'readTimeMinutes'
  | 'tags'
  | 'isPublished'
  | 'publishedAt'
>;

export type CreateBlogInput = BlogWritableFields;
export type UpdateBlogInput = Partial<BlogWritableFields>;

export interface BlogListQuery {
  categoryId?: string;
  tag?: string;
  isPublished?: boolean;
}

export interface BlogRepository {
  findAll(query?: BlogListQuery): Promise<BlogPost[]>;
  findById(id: string): Promise<BlogPost | null>;
  findBySlug(slug: string): Promise<BlogPost | null>;
  create(input: CreateBlogInput): Promise<BlogPost>;
  update(id: string, input: UpdateBlogInput): Promise<BlogPost | null>;
  delete(id: string): Promise<boolean>;
}
