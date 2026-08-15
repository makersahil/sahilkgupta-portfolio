import { env } from '../config/env.js';
import { ConfigurationError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import type {
  BlogRepository,
  CategoryRepository,
  CertificationRepository,
  InquiryRepository,
  ProjectRepository,
  SkillRepository,
} from './contracts/index.js';
import { PrismaBlogRepository } from './prisma/blog.repository.js';
import { PrismaCategoryRepository } from './prisma/category.repository.js';
import { PrismaCertificationRepository } from './prisma/certification.repository.js';
import { PrismaInquiryRepository } from './prisma/inquiry.repository.js';
import { PrismaProjectRepository } from './prisma/project.repository.js';
import { PrismaSkillRepository } from './prisma/skill.repository.js';

export interface PersistenceHealth {
  mode: 'prisma';
  ready: boolean;
  databaseConnected: boolean;
}

export interface ContentRepositories {
  mode: 'prisma';
  categories: CategoryRepository;
  projects: ProjectRepository;
  blogs: BlogRepository;
  skills: SkillRepository;
  certifications: CertificationRepository;
  inquiries: InquiryRepository;
  checkHealth(): Promise<PersistenceHealth>;
}

export function createRepositories(): ContentRepositories {
  if (!env.DATABASE_URL?.trim()) {
    throw new ConfigurationError('DATABASE_URL is required. PostgreSQL is the only supported runtime persistence provider.');
  }

  return {
    mode: 'prisma',
    categories: new PrismaCategoryRepository(),
    projects: new PrismaProjectRepository(),
    blogs: new PrismaBlogRepository(),
    skills: new PrismaSkillRepository(),
    certifications: new PrismaCertificationRepository(),
    inquiries: new PrismaInquiryRepository(),
    async checkHealth() {
      try {
        await prisma.$queryRaw`SELECT 1`;
        return { mode: 'prisma', ready: true, databaseConnected: true };
      } catch {
        return { mode: 'prisma', ready: false, databaseConnected: false };
      }
    },
  };
}

export const contentRepositories = createRepositories();
