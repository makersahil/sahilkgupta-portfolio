import type { Project, ProjectStatus } from '../../types/index.js';

export type ProjectWritableFields = Pick<
  Project,
  | 'title'
  | 'slug'
  | 'summary'
  | 'descriptionMarkdown'
  | 'mission'
  | 'architectureSummary'
  | 'whatIBuilt'
  | 'categoryId'
  | 'status'
  | 'formatType'
  | 'isFeatured'
  | 'sortOrder'
  | 'coverImageUrl'
  | 'architectureSvg'
  | 'liveUrl'
  | 'githubUrl'
  | 'packetTracerFile'
  | 'topologyConfigJson'
  | 'devopsStack'
  | 'tags'
  | 'metrics'
  | 'ciscoLabData'
  | 'rhcsaMatrixData'
  | 'devopsPipelineData'
>;

export type CreateProjectInput = ProjectWritableFields;
export type UpdateProjectInput = Partial<ProjectWritableFields>;

export interface ProjectListQuery {
  categoryId?: string;
  tag?: string;
  statuses?: readonly ProjectStatus[];
  isPublished?: boolean;
}

export interface ProjectLookupOptions {
  isPublished?: boolean;
}

export interface ProjectRepository {
  findAll(query?: ProjectListQuery): Promise<Project[]>;
  findById(id: string): Promise<Project | null>;
  findBySlug(slug: string, options?: ProjectLookupOptions): Promise<Project | null>;
  create(input: CreateProjectInput): Promise<Project>;
  update(id: string, input: UpdateProjectInput): Promise<Project | null>;
  delete(id: string): Promise<boolean>;
}
