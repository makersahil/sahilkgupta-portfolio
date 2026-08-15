import 'dotenv/config';

import assert from 'node:assert/strict';

const CATEGORY_SLUG = '__content_restart_category__';
const PROJECT_SLUG = '__content_restart_project__';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL is required for the restart-persistence test');
  }

  process.env.PERSISTENCE_MODE = 'prisma';
  const command = process.argv[2];
  if (!['create', 'verify', 'cleanup'].includes(command ?? '')) {
    throw new Error('Usage: npm run test:content:restart -- create|verify|cleanup');
  }

  const [{ createRepositories }, { createContentServices }, { prisma }] = await Promise.all([
    import('../repositories/repository.factory.js'),
    import('../services/content/index.js'),
    import('../lib/prisma.js'),
  ]);

  const repositories = createRepositories('prisma');
  const services = createContentServices(repositories);

  async function removeExisting(): Promise<void> {
    const project = await repositories.projects.findBySlug(PROJECT_SLUG);
    if (project) await repositories.projects.delete(project.id);
    const category = await repositories.categories.findBySlug(CATEGORY_SLUG);
    if (category) await repositories.categories.delete(category.id);
  }

  try {
    if (command === 'create') {
      await removeExisting();
      const category = await services.categories.create({
        name: 'Content Restart Persistence Category',
        slug: CATEGORY_SLUG,
        domain: 'DEVOPS',
        tagline: 'Disposable restart-persistence fixture',
        description: 'Created only for content restart persistence verification.',
        icon: 'Database',
        accentColor: '#06b6d4',
        terminalTheme: 'cyan',
        sortOrder: 999_101,
        isPublished: false,
      });
      await services.projects.create({
        title: 'Content Restart Persistence Project',
        slug: PROJECT_SLUG,
        summary: 'Disposable restart-persistence fixture.',
        descriptionMarkdown: 'Disposable restart-persistence fixture.',
        categoryId: category.id,
        status: 'PLANNED',
        formatType: 'standard',
        isFeatured: false,
        sortOrder: 999_101,
        devopsStack: [],
        tags: ['content-restart'],
      });
      console.log('Content restart persistence CREATE: PASS');
      console.log('Run the verify command in a new process, then cleanup.');
      return;
    }

    if (command === 'verify') {
      const category = await repositories.categories.findBySlug(CATEGORY_SLUG);
      const project = await repositories.projects.findBySlug(PROJECT_SLUG);
      assert.ok(category, 'Restart category did not persist across processes');
      assert.ok(project, 'Restart project did not persist across processes');
      assert.equal(project.categoryId, category.id);
      console.log('Content restart persistence VERIFY: PASS');
      return;
    }

    await removeExisting();
    assert.equal(await repositories.projects.findBySlug(PROJECT_SLUG), null);
    assert.equal(await repositories.categories.findBySlug(CATEGORY_SLUG), null);
    console.log('Content restart persistence CLEANUP: PASS');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error';
  console.error(`Content restart persistence: FAIL (${message})`);
  process.exitCode = 1;
});
