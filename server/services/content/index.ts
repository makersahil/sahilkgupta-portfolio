import {
  contentRepositories,
  type ContentRepositories,
} from '../../repositories/repository.factory.js';
import { BlogService } from './blog.service.js';
import { CategoryService } from './category.service.js';
import { CertificationService } from './certification.service.js';
import { InquiryService } from './inquiry.service.js';
import { ProjectService } from './project.service.js';
import { SkillService } from './skill.service.js';

export { BlogService } from './blog.service.js';
export { CategoryService } from './category.service.js';
export { CertificationService } from './certification.service.js';
export { InquiryService } from './inquiry.service.js';
export { ProjectService } from './project.service.js';
export { SkillService } from './skill.service.js';

export interface ContentServices {
  categories: CategoryService;
  projects: ProjectService;
  blogs: BlogService;
  skills: SkillService;
  certifications: CertificationService;
  inquiries: InquiryService;
}

export function createContentServices(repositories: ContentRepositories): ContentServices {
  return {
    categories: new CategoryService(repositories.categories),
    projects: new ProjectService(repositories.projects, repositories.categories),
    blogs: new BlogService(repositories.blogs, repositories.categories),
    skills: new SkillService(repositories.skills, repositories.categories),
    certifications: new CertificationService(repositories.certifications, repositories.categories),
    inquiries: new InquiryService(repositories.inquiries),
  };
}

export const contentServices = createContentServices(contentRepositories);
