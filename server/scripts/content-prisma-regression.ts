import 'dotenv/config';

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { NotFoundError } from '../lib/errors.js';

interface Identified {
  id: string;
}

function ids<T extends Identified>(records: readonly T[]): string[] {
  return records.map((record) => record.id).sort();
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL is required for the Prisma regression test');
  }

  const [{ createRepositories }, { createContentServices }, { prisma }] = await Promise.all([
    import('../repositories/repository.factory.js'),
    import('../services/content/index.js'),
    import('../lib/prisma.js'),
  ]);

  const repositories = createRepositories();
  const services = createContentServices(repositories);
  const suffix = randomUUID().replaceAll('-', '');
  const created: { category?: string; project?: string; blog?: string } = {};
  let runFailure: unknown;
  const cleanupFailures: string[] = [];

  async function cleanup(label: keyof typeof created, remove: (id: string) => Promise<boolean>): Promise<void> {
    const id = created[label];
    if (!id) return;
    try {
      await remove(id);
    } catch {
      cleanupFailures.push(label);
    }
  }

  try {
    assert.deepEqual(await repositories.checkHealth(), {
      mode: 'prisma',
      ready: true,
      databaseConnected: true,
    });

    const [categories, projects, blogs, certifications, skills] = await Promise.all([
      services.categories.listAll(),
      services.projects.listAll(),
      services.blogs.listAll(),
      services.certifications.list(),
      services.skills.list(),
    ]);

    assert.deepEqual(ids(categories), ['cat-devops', 'cat-linux', 'cat-networking']);
    assert.deepEqual(ids(projects), [
      'proj-cisco-wan-pkt',
      'proj-k8s-cilium-gitops',
      'proj-rhel-rhcsa-matrix',
    ]);
    assert.deepEqual(ids(blogs), ['blog-01', 'blog-02', 'blog-03']);
    assert.deepEqual(ids(certifications), ['cert-devops', 'cert-linux', 'cert-networking']);
    assert.deepEqual(ids(skills), ['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5', 'sk-6', 'sk-7']);

    const categoryExpectations = new Map<string, { slug: string; domain: 'NETWORKING' | 'LINUX' | 'DEVOPS' }>([
      ['cat-networking', { slug: 'networking', domain: 'NETWORKING' }],
      ['cat-linux', { slug: 'linux', domain: 'LINUX' }],
      ['cat-devops', { slug: 'devops', domain: 'DEVOPS' }],
    ] as const);
    for (const category of categories) {
      const expected = categoryExpectations.get(category.id);
      assert.ok(expected, `Unexpected canonical category ${category.id}`);
      assert.equal(category.slug, expected.slug);
      assert.equal(category.domain, expected.domain);
      assert.ok(category.tagline.trim().length > 0);
      assert.ok(category.icon.trim().length > 0);
      assert.ok(category.accentColor.trim().length > 0);
    }

    const projectExpectations = new Map<string, { categoryId: string; slug: string; formatType: 'cisco_pkt_lab' | 'rhcsa_matrix' | 'devops_pipeline' }>([
      ['proj-cisco-wan-pkt', { categoryId: 'cat-networking', slug: 'cisco-enterprise-wan-bgp-hsrp', formatType: 'cisco_pkt_lab' }],
      ['proj-rhel-rhcsa-matrix', { categoryId: 'cat-linux', slug: 'rhel-9-rhcsa-hardening-storage-selinux', formatType: 'rhcsa_matrix' }],
      ['proj-k8s-cilium-gitops', { categoryId: 'cat-devops', slug: 'cloud-native-gitops-k8s-cilium-terraform', formatType: 'devops_pipeline' }],
    ] as const);
    for (const project of projects) {
      const expected = projectExpectations.get(project.id);
      assert.ok(expected, `Unexpected canonical project ${project.id}`);
      assert.equal(project.categoryId, expected.categoryId);
      assert.equal(project.slug, expected.slug);
      assert.equal(project.formatType, expected.formatType);
      assert.equal(project.status, 'COMPLETED');
    }

    assert.ok(projects.find(({ id }) => id === 'proj-cisco-wan-pkt')?.ciscoLabData);
    assert.ok(projects.find(({ id }) => id === 'proj-rhel-rhcsa-matrix')?.rhcsaMatrixData);
    assert.ok(projects.find(({ id }) => id === 'proj-k8s-cilium-gitops')?.devopsPipelineData);

    assert.deepEqual(ids(await services.projects.listPublic({ categoryId: 'cat-networking' })), ['proj-cisco-wan-pkt']);
    assert.deepEqual(ids(await services.projects.listPublic({ categoryId: 'cat-linux' })), ['proj-rhel-rhcsa-matrix']);
    assert.deepEqual(ids(await services.projects.listPublic({ categoryId: 'cat-devops' })), ['proj-k8s-cilium-gitops']);
    assert.deepEqual(ids(await services.blogs.listPublic({ categoryId: 'cat-networking' })), ['blog-01']);
    assert.deepEqual(ids(await services.blogs.listPublic({ categoryId: 'cat-linux' })), ['blog-02']);
    assert.deepEqual(ids(await services.blogs.listPublic({ categoryId: 'cat-devops' })), ['blog-03']);

    const category = await services.categories.create({
      name: 'Content Prisma Draft Category',
      slug: `__content_prisma_${suffix}`,
      domain: 'DEVOPS',
      tagline: 'Disposable Content Prisma regression fixture',
      description: 'Delete after test.',
      icon: 'FlaskConical',
      accentColor: '#06b6d4',
      terminalTheme: 'cyan',
      sortOrder: 999_001,
      isPublished: false,
    });
    created.category = category.id;

    const project = await services.projects.create({
      title: 'Content Prisma Draft Project',
      slug: `__content_prisma_project_${suffix}`,
      summary: 'Disposable project.',
      descriptionMarkdown: 'Disposable project.',
      categoryId: category.id,
      status: 'PLANNED',
      formatType: 'standard',
      isFeatured: false,
      sortOrder: 999_001,
      devopsStack: [],
      tags: ['content-regression'],
    });
    created.project = project.id;

    const blog = await services.blogs.create({
      title: 'Content Prisma Draft Blog',
      slug: `__content_prisma_blog_${suffix}`,
      excerpt: 'Disposable blog.',
      contentMarkdown: 'Disposable blog.',
      categoryId: category.id,
      readTimeMinutes: 1,
      tags: ['content-regression'],
      isPublished: false,
      publishedAt: new Date(0).toISOString(),
    });
    created.blog = blog.id;

    assert.ok(!(await services.categories.listPublic()).some(({ id }) => id === category.id));
    assert.ok(!(await services.projects.listPublic()).some(({ id }) => id === project.id));
    assert.ok(!(await services.blogs.listPublic()).some(({ id }) => id === blog.id));

    await assert.rejects(() => services.categories.getPublicBySlug(category.slug), NotFoundError);
    await assert.rejects(() => services.projects.getPublicBySlug(project.slug), NotFoundError);
    await assert.rejects(() => services.blogs.getPublicBySlug(blog.slug), NotFoundError);

    // Category-domain changes must keep database-only project/blog/lab domain columns synchronized.
    await services.categories.update(category.id, { domain: 'LINUX' });
    const [storedProject, storedBlog] = await Promise.all([
      prisma.project.findUnique({ where: { id: project.id }, select: { domain: true } }),
      prisma.blogPost.findUnique({ where: { id: blog.id }, select: { domain: true } }),
    ]);
    assert.equal(storedProject?.domain, 'LINUX');
    assert.equal(storedBlog?.domain, 'LINUX');
  } catch (error) {
    runFailure = error;
  } finally {
    await cleanup('blog', (id) => repositories.blogs.delete(id));
    await cleanup('project', (id) => repositories.projects.delete(id));
    await cleanup('category', (id) => repositories.categories.delete(id));
    try {
      await prisma.$disconnect();
    } catch {
      cleanupFailures.push('database connection');
    }
  }

  if (cleanupFailures.length > 0) {
    throw new Error(`Prisma regression cleanup failed for: ${cleanupFailures.join(', ')}`);
  }
  if (runFailure) throw runFailure;
  console.log('Content Prisma regression: PASS');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error';
  console.error(`Content Prisma regression: FAIL (${message})`);
  process.exitCode = 1;
});
