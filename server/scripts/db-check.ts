import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';

const EXPECTED_CATEGORY_SLUGS = ['networking', 'linux', 'devops'] as const;
const EXPECTED_PROJECT_SLUGS = [
  'cisco-enterprise-wan-bgp-hsrp',
  'rhel-9-rhcsa-hardening-storage-selinux',
  'cloud-native-gitops-k8s-cilium-terraform',
] as const;
const EXPECTED_LAB_SLUGS = ['cisco-wan-topology', 'rhel9-hardening-environment', 'gitops-k8s-cluster'] as const;

async function main() {
  if (!env.DATABASE_URL?.trim()) {
    console.error('NOT EXECUTED — DATABASE_URL NOT CONFIGURED');
    process.exitCode = 1;
    return;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;

    const [categories, projects, blogCount, certificationCount, skillCount, userCount, authSessionCount, labs, labInputCount, labRunbookCount] = await Promise.all([
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
      prisma.lab.findMany({ select: { slug: true, projectId: true, status: true, manifestVersion: true, capabilities: true, normalizedState: true } }),
      prisma.labInput.count(),
      prisma.labRunbookStep.count(),
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

    for (const slug of EXPECTED_LAB_SLUGS) {
      const lab = labs.find((item) => item.slug === slug);
      if (!lab) throw new Error(`Missing canonical lab: ${slug}`);
      if (!lab.projectId) throw new Error(`Lab ${slug} is not connected to a project`);
      if (lab.status !== 'READY') throw new Error(`Lab ${slug} is not READY`);
      if (lab.manifestVersion !== '1.0') throw new Error(`Lab ${slug} is not on Lab Manifest v1.0`);
      if (!Array.isArray(lab.capabilities)) throw new Error(`Lab ${slug} capabilities are invalid`);
      if (lab.normalizedState === null) throw new Error(`Lab ${slug} has no normalizedState`);
    }
    if (labInputCount < 3) throw new Error(`Expected at least 3 lab inputs, found ${labInputCount}`);
    if (labRunbookCount < 12) throw new Error(`Expected at least 12 lab runbook steps, found ${labRunbookCount}`);

    if (blogCount < 3) throw new Error(`Expected at least 3 blogs, found ${blogCount}`);
    if (certificationCount < 3) {
      throw new Error(`Expected at least 3 certification cards, found ${certificationCount}`);
    }
    if (skillCount < 7) throw new Error(`Expected at least 7 skills, found ${skillCount}`);

    console.log('DATABASE CONNECTION: OK');
    console.log('DATABASE SCHEMA: OK');
    console.log(`AUTH SCHEMA: OK (${userCount} users, ${authSessionCount} sessions)`);
    console.log(`LAB PLATFORM: OK (${labs.length} labs, ${labInputCount} inputs, ${labRunbookCount} runbook steps)`);
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
