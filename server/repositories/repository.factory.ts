import { env, type PersistenceMode } from '../config/env.js';
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
import {
  LegacyBlogRepository,
  LegacyCategoryRepository,
  LegacyCertificationRepository,
  LegacyInquiryRepository,
  LegacyProjectRepository,
  LegacySkillRepository,
} from './legacy/index.js';
import { PrismaBlogRepository } from './prisma/blog.repository.js';
import { PrismaCategoryRepository } from './prisma/category.repository.js';
import { PrismaCertificationRepository } from './prisma/certification.repository.js';
import { PrismaInquiryRepository } from './prisma/inquiry.repository.js';
import { PrismaProjectRepository } from './prisma/project.repository.js';
import { PrismaSkillRepository } from './prisma/skill.repository.js';

export interface PersistenceHealth {
  mode: PersistenceMode;
  ready: boolean;
  databaseConnected: boolean | null;
}

export interface ContentRepositories {
  mode: PersistenceMode;
  categories: CategoryRepository;
  projects: ProjectRepository;
  blogs: BlogRepository;
  skills: SkillRepository;
  certifications: CertificationRepository;
  inquiries: InquiryRepository;
  checkHealth(): Promise<PersistenceHealth>;
}

function legacyRepositories(): ContentRepositories {
  return {
    mode: 'legacy',
    categories: new LegacyCategoryRepository(),
    projects: new LegacyProjectRepository(),
    blogs: new LegacyBlogRepository(),
    skills: new LegacySkillRepository(),
    certifications: new LegacyCertificationRepository(),
    inquiries: new LegacyInquiryRepository(),
    async checkHealth() {
      return { mode: 'legacy', ready: true, databaseConnected: null };
    },
  };
}

function prismaRepositories(): ContentRepositories {
  if (!env.DATABASE_URL?.trim()) {
    throw new ConfigurationError('DATABASE_URL is required when PERSISTENCE_MODE=prisma');
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

export function createRepositories(mode: PersistenceMode = env.PERSISTENCE_MODE): ContentRepositories {
  switch (mode) {
    case 'legacy':
      if (env.NODE_ENV === 'production') {
        throw new ConfigurationError('Legacy persistence is disabled in production');
      }
      return legacyRepositories();
    case 'prisma':
      return prismaRepositories();
  }
}

export const contentRepositories = createRepositories();
