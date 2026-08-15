import { prisma } from '../../lib/prisma.js';
import type { PortfolioRuntimeMetrics, SystemRepository } from '../contracts/system.repository.js';

export class PrismaSystemRepository implements SystemRepository {
  async getPortfolioRuntimeMetrics(now = new Date()): Promise<PortfolioRuntimeMetrics> {
    const [categories, projects, blogs, certifications, skills, labs, inputs, scenarios, evidence, artifacts] = await Promise.all([
      prisma.category.count(),
      prisma.project.count(),
      prisma.blogPost.count(),
      prisma.certification.count(),
      prisma.skill.count(),
      prisma.lab.count(),
      prisma.labInput.count(),
      prisma.labScenario.count(),
      prisma.evidence.count(),
      prisma.artifact.count(),
    ]);

    return {
      persistence: { provider: 'PostgreSQL', orm: 'Prisma' },
      content: { categories, projects, blogs, certifications, skills },
      labs: { labs, inputs, scenarios, evidence, artifacts },
      generatedAt: now.toISOString(),
    };
  }
}

export const systemRepository = new PrismaSystemRepository();
