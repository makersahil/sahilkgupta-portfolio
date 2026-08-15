import { dbService } from '../../services/db.service.js';
import type {
  CreateProjectInput,
  ProjectListQuery,
  ProjectLookupOptions,
  ProjectRepository,
  ProjectWritableFields,
  UpdateProjectInput,
} from '../contracts/project.repository.js';
import { pickFields, pickPresentFields } from './legacy-write.utils.js';

const writableKeys = [
  'title',
  'slug',
  'summary',
  'descriptionMarkdown',
  'categoryId',
  'status',
  'formatType',
  'isFeatured',
  'sortOrder',
  'coverImageUrl',
  'architectureSvg',
  'liveUrl',
  'githubUrl',
  'packetTracerFile',
  'topologyConfigJson',
  'devopsStack',
  'tags',
  'metrics',
  'ciscoLabData',
  'rhcsaMatrixData',
  'devopsPipelineData',
] as const satisfies readonly (keyof ProjectWritableFields)[];

type LegacyProjectDataSource = Pick<
  typeof dbService,
  'getProjects' | 'getProjectById' | 'getProjectBySlug' | 'createProject' | 'updateProject' | 'deleteProject'
>;

export class LegacyProjectRepository implements ProjectRepository {
  constructor(private readonly db: LegacyProjectDataSource = dbService) {}

  async findAll(query: ProjectListQuery = {}) {
    const projects = this.db.getProjects(query.categoryId, query.tag);
    return projects.filter((project) => {
      if (query.statuses !== undefined && !query.statuses.includes(project.status)) return false;
      if (query.isPublished === true && project.status !== 'COMPLETED') return false;
      if (query.isPublished === false && project.status === 'COMPLETED') return false;
      return true;
    });
  }

  async findById(id: string) {
    return this.db.getProjectById(id) ?? null;
  }

  async findBySlug(slug: string, options: ProjectLookupOptions = {}) {
    const project = this.db.getProjectBySlug(slug) ?? null;
    if (!project || options.isPublished === undefined) return project;
    const isPublished = project.status === 'COMPLETED';
    return isPublished === options.isPublished ? project : null;
  }

  async create(input: CreateProjectInput) {
    return this.db.createProject(pickFields(input, writableKeys));
  }

  async update(id: string, input: UpdateProjectInput) {
    return this.db.updateProject(id, pickPresentFields(input, writableKeys));
  }

  async delete(id: string) {
    return this.db.deleteProject(id);
  }
}
