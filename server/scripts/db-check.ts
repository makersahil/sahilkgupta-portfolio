import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';

const EXPECTED_CATEGORY_SLUGS = ['networking', 'linux', 'devops'] as const;
const EXPECTED_PROJECT_SLUGS = [
  'cisco-enterprise-wan-bgp-hsrp',
  'rhel-9-rhcsa-hardening-storage-selinux',
  'cloud-native-gitops-k8s-cilium-terraform',
] as const;

async function main() {
  if (!env.DATABASE_URL?.trim()) {
    console.error('NOT EXECUTED — DATABASE_URL NOT CONFIGURED');
    process.exitCode = 1;
    return;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;

    const [categories, projects, blogCount, certificationCount, skillCount, userCount, authSessionCount] = await Promise.all([
      prisma.category.findMany({
        select: {
          slug: true,
          domain: true,
          tagline: true,
          icon: true,
          accentColor: true,
          terminalTheme: true,
        },
      }),
      prisma.project.findMany({
        select: {
          slug: true,
          mission: true,
          architectureSummary: true,
          whatIBuilt: true,
          categoryId: true,
          domain: true,
        },
      }),
      prisma.blogPost.count(),
      prisma.certification.count(),
      prisma.skill.count(),
      prisma.user.count(),
      prisma.authSession.count(),
    ]);

    for (const slug of EXPECTED_CATEGORY_SLUGS) {
      const category = categories.find((item) => item.slug === slug);
      if (!category) throw new Error(`Missing canonical category: ${slug}`);
      if (!category.domain) throw new Error(`Category ${slug} has no domain`);
      if (!category.tagline?.trim()) throw new Error(`Category ${slug} has no tagline`);
      if (!category.icon?.trim()) throw new Error(`Category ${slug} has no icon`);
      if (!category.accentColor?.trim()) throw new Error(`Category ${slug} has no accentColor`);
      if (!category.terminalTheme?.trim()) throw new Error(`Category ${slug} has no terminalTheme`);
    }

    for (const slug of EXPECTED_PROJECT_SLUGS) {
      const project = projects.find((item) => item.slug === slug);
      if (!project) throw new Error(`Missing canonical project: ${slug}`);
      if (!project.categoryId) throw new Error(`Project ${slug} has no categoryId`);
      if (!project.domain) throw new Error(`Project ${slug} has no domain`);
      // Querying these fields also catches schema drift such as a missing Project.mission column.
      void project.mission;
      void project.architectureSummary;
      void project.whatIBuilt;
    }

    if (blogCount < 3) throw new Error(`Expected at least 3 blogs, found ${blogCount}`);
    if (certificationCount < 3) {
      throw new Error(`Expected at least 3 certification cards, found ${certificationCount}`);
    }
    if (skillCount < 7) throw new Error(`Expected at least 7 skills, found ${skillCount}`);

    console.log('DATABASE CONNECTION: OK');
    console.log('DATABASE SCHEMA: OK');
    console.log(`AUTH SCHEMA: OK (${userCount} users, ${authSessionCount} sessions)`);
    console.log(
      `CONTENT BASELINE: OK (${categories.length} categories, ${projects.length} projects, ${blogCount} blogs, ${certificationCount} certifications, ${skillCount} skills)`,
    );
  } catch (error) {
    console.error('DATABASE CHECK: FAILED');
    console.error(error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown database error');
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
