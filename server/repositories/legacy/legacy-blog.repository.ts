import { dbService } from '../../services/db.service.js';
import type {
  BlogListQuery,
  BlogRepository,
  BlogWritableFields,
  CreateBlogInput,
  UpdateBlogInput,
} from '../contracts/blog.repository.js';
import { pickFields, pickPresentFields } from './legacy-write.utils.js';

const writableKeys = [
  'title',
  'slug',
  'excerpt',
  'contentMarkdown',
  'categoryId',
  'coverImageUrl',
  'readTimeMinutes',
  'tags',
  'isPublished',
  'publishedAt',
] as const satisfies readonly (keyof BlogWritableFields)[];

type LegacyBlogDataSource = Pick<
  typeof dbService,
  | 'getBlogs'
  | 'getAllBlogs'
  | 'getBlogBySlug'
  | 'createBlog'
  | 'updateBlog'
  | 'deleteBlog'
>;

export class LegacyBlogRepository implements BlogRepository {
  constructor(private readonly db: LegacyBlogDataSource = dbService) {}

  async findAll(query: BlogListQuery = {}) {
    const blogs =
      query.isPublished === true
        ? this.db.getBlogs(query.categoryId, query.tag)
        : this.db.getAllBlogs(query.categoryId, query.tag);
    if (query.isPublished === undefined) return blogs;
    return blogs.filter((blog) => blog.isPublished === query.isPublished);
  }

  async findById(id: string) {
    return this.db.getAllBlogs().find((blog) => blog.id === id) ?? null;
  }

  async findBySlug(slug: string) {
    return this.db.getBlogBySlug(slug) ?? null;
  }

  async create(input: CreateBlogInput) {
    return this.db.createBlog(pickFields(input, writableKeys));
  }

  async update(id: string, input: UpdateBlogInput) {
    return this.db.updateBlog(id, pickPresentFields(input, writableKeys));
  }

  async delete(id: string) {
    return this.db.deleteBlog(id);
  }
}
