import 'dotenv/config';

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import {
  ApplicationError,
  ConflictError,
  NotFoundError,
  ValidationError,
  normalizeApplicationError,
} from '../lib/errors.js';
import { getDomainConfigBySlug } from '../../src/config/domainConfig.js';
import { normalizeProjectStatus } from '../repositories/prisma/validation.js';

interface CanonicalRecord {
  id: string;
  slug?: string;
  categoryId?: string;
}

type ApplicationErrorConstructor = new (...args: any[]) => ApplicationError;

function safeErrorMessage(error: unknown): string {
  const candidate = error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error';
  const secrets = [
    process.env.DATABASE_URL,
    process.env.JWT_SECRET,
    process.env.ADMIN_PASSWORD,
  ].filter((value): value is string => Boolean(value));

  return secrets.reduce(
    (message, secret) => message.split(secret).join('[REDACTED]'),
    candidate,
  ).replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, 'postgresql://[REDACTED]@');
}

function assertCanonicalRecords<T extends CanonicalRecord>(
  actual: readonly T[],
  expected: readonly CanonicalRecord[],
  label: string,
): void {
  const normalize = (records: readonly CanonicalRecord[]) =>
    records
      .map(({ id, slug, categoryId }) => ({
        id,
        ...(slug === undefined ? {} : { slug }),
        ...(categoryId === undefined ? {} : { categoryId }),
      }))
      .sort((left, right) => left.id.localeCompare(right.id));

  assert.deepEqual(
    normalize(actual),
    normalize(expected),
    `${label} canonical identity or category association changed`,
  );
}

async function expectApplicationError(
  operation: () => Promise<unknown>,
  expectedType: ApplicationErrorConstructor,
  expectedCode: ApplicationError['code'],
): Promise<void> {
  try {
    await operation();
    assert.fail(`Expected ${expectedCode}`);
  } catch (error) {
    assert.ok(error instanceof expectedType, `Expected ${expectedType.name}`);
    assert.equal(error.code, expectedCode);
  }
}

function assertNormalizedError(
  input: unknown,
  expectedStatus: number,
  expectedCode: ApplicationError['code'],
): void {
  const normalized = normalizeApplicationError(input);
  assert.equal(normalized.statusCode, expectedStatus);
  assert.equal(normalized.code, expectedCode);
}

async function main(): Promise<void> {
  // Keep the regression suite independent from the caller's ambient mode.
  process.env.PERSISTENCE_MODE = 'legacy';

  const [{ createRepositories }, { createContentServices }] = await Promise.all([
    import('../repositories/repository.factory.js'),
    import('../services/content/index.js'),
  ]);

  const repositories = createRepositories('legacy');
  const services = createContentServices(repositories);
  const suffix = randomUUID().replaceAll('-', '');
  const prefix = `content-legacy-regression-${suffix}`;
  let runFailure: unknown;
  const cleanupFailures: string[] = [];

  async function removeMatching<T extends { id: string }>(
    label: string,
    records: readonly T[],
    matches: (record: T) => boolean,
    remove: (id: string) => Promise<boolean>,
  ): Promise<void> {
    for (const record of records.filter(matches)) {
      try {
        await remove(record.id);
      } catch {
        cleanupFailures.push(`${label}:${record.id}`);
      }
    }
  }

  async function cleanupByPrefix(): Promise<void> {
    await removeMatching(
      'inquiries',
      await repositories.inquiries.findAll(),
      (record) => record.email.startsWith(prefix),
      (id) => repositories.inquiries.delete(id),
    );
    await removeMatching(
      'blogs',
      await repositories.blogs.findAll(),
      (record) => record.slug.startsWith(prefix),
      (id) => repositories.blogs.delete(id),
    );
    await removeMatching(
      'projects',
      await repositories.projects.findAll(),
      (record) => record.slug.startsWith(prefix),
      (id) => repositories.projects.delete(id),
    );
    await removeMatching(
      'categories',
      await repositories.categories.findAll(),
      (record) => record.slug.startsWith(prefix),
      (id) => repositories.categories.delete(id),
    );
  }

  try {
    assert.deepEqual(await repositories.checkHealth(), {
      mode: 'legacy',
      ready: true,
      databaseConnected: null,
    });

    const [categories, projects, blogs, certifications, skills] = await Promise.all([
      services.categories.listAll(),
      services.projects.listAll(),
      services.blogs.listAll(),
      services.certifications.list(),
      services.skills.list(),
    ]);

    assert.equal(categories.length, 3, 'legacy category count changed');
    assert.equal(projects.length, 3, 'legacy project count changed');
    assert.equal(blogs.length, 3, 'legacy blog count changed');
    assert.equal(certifications.length, 3, 'legacy certification count changed');
    assert.equal(skills.length, 7, 'legacy skill count changed');

    assertCanonicalRecords(
      categories,
      [
        { id: 'cat-networking', slug: 'networking' },
        { id: 'cat-linux', slug: 'linux' },
        { id: 'cat-devops', slug: 'devops' },
      ],
      'Category',
    );
    assertCanonicalRecords(
      projects,
      [
        {
          id: 'proj-cisco-wan-pkt',
          slug: 'cisco-enterprise-wan-bgp-hsrp',
          categoryId: 'cat-networking',
        },
        {
          id: 'proj-rhel-rhcsa-matrix',
          slug: 'rhel-9-rhcsa-hardening-storage-selinux',
          categoryId: 'cat-linux',
        },
        {
          id: 'proj-k8s-cilium-gitops',
          slug: 'cloud-native-gitops-k8s-cilium-terraform',
          categoryId: 'cat-devops',
        },
      ],
      'Project',
    );
    assertCanonicalRecords(
      blogs,
      [
        {
          id: 'blog-01',
          slug: 'enterprise-bgp-evpn-packet-tracer-architecture',
          categoryId: 'cat-networking',
        },
        {
          id: 'blog-02',
          slug: 'mastering-enterprise-linux-storage-systemd-selinux',
          categoryId: 'cat-linux',
        },
        {
          id: 'blog-03',
          slug: 'zero-trust-k8s-cilium-ebpf-wireguard',
          categoryId: 'cat-devops',
        },
      ],
      'Blog',
    );
    assertCanonicalRecords(
      certifications,
      [
        { id: 'cert-networking', categoryId: 'cat-networking' },
        { id: 'cert-linux', categoryId: 'cat-linux' },
        { id: 'cert-devops', categoryId: 'cat-devops' },
      ],
      'Certification',
    );
    assertCanonicalRecords(
      skills,
      [
        { id: 'sk-1', categoryId: 'cat-linux' },
        { id: 'sk-2', categoryId: 'cat-networking' },
        { id: 'sk-3', categoryId: 'cat-linux' },
        { id: 'sk-4', categoryId: 'cat-networking' },
        { id: 'sk-5', categoryId: 'cat-devops' },
        { id: 'sk-6', categoryId: 'cat-devops' },
        { id: 'sk-7', categoryId: 'cat-devops' },
      ],
      'Skill',
    );

    for (const expected of [
      { slug: 'networking', categoryId: 'cat-networking' },
      { slug: 'linux', categoryId: 'cat-linux' },
      { slug: 'devops', categoryId: 'cat-devops' },
    ] as const) {
      const domain = getDomainConfigBySlug(expected.slug);
      assert.ok(domain, `Domain mapping is missing for ${expected.slug}`);
      assert.equal(domain.slug, expected.slug);
      assert.equal(domain.categoryId, expected.categoryId);
      assert.equal(getDomainConfigBySlug(expected.categoryId)?.categoryId, expected.categoryId);
    }
    assert.equal(getDomainConfigBySlug('unknown-domain'), null);

    const ciscoProject = projects.find(({ id }) => id === 'proj-cisco-wan-pkt');
    const linuxProject = projects.find(({ id }) => id === 'proj-rhel-rhcsa-matrix');
    const devopsProject = projects.find(({ id }) => id === 'proj-k8s-cilium-gitops');
    assert.ok(ciscoProject?.ciscoLabData, 'Cisco project lost its specialized payload');
    assert.equal(ciscoProject.formatType, 'cisco_pkt_lab');
    assert.ok(ciscoProject.ciscoLabData.devices.length > 0);
    assert.ok(linuxProject?.rhcsaMatrixData, 'Linux project lost its specialized payload');
    assert.equal(linuxProject.formatType, 'rhcsa_matrix');
    assert.ok(linuxProject.rhcsaMatrixData.objectives.length > 0);
    assert.ok(devopsProject?.devopsPipelineData, 'DevOps project lost its specialized payload');
    assert.equal(devopsProject.formatType, 'devops_pipeline');
    assert.ok(devopsProject.devopsPipelineData.pipelineStages.length > 0);

    assert.deepEqual(
      (await services.projects.listPublic({ categoryId: 'cat-networking' })).map(({ id }) => id),
      ['proj-cisco-wan-pkt'],
    );
    assert.deepEqual(
      (await services.projects.listPublic({ tag: 'BGP' })).map(({ id }) => id),
      ['proj-cisco-wan-pkt'],
    );
    assert.deepEqual(
      (await services.blogs.listPublic({ categoryId: 'cat-linux' })).map(({ id }) => id),
      ['blog-02'],
    );
    assert.deepEqual(
      (await services.blogs.listPublic({ tag: 'Kubernetes' })).map(({ id }) => id),
      ['blog-03'],
    );
    assert.deepEqual(
      (await services.certifications.list('cat-devops')).map(({ id }) => id),
      ['cert-devops'],
    );
    assert.deepEqual(
      (await services.skills.list('cat-networking')).map(({ id }) => id),
      ['sk-2', 'sk-4'],
    );

    const draftCategoryInput = {
      slug: `${prefix}-category`,
      name: 'Content Regression Draft Category',
      tagline: 'Disposable publication-filter fixture',
      description: 'Created only by the Content legacy regression suite.',
      icon: 'FlaskConical',
      accentColor: '#64748b',
      terminalTheme: 'cyan' as const,
      sortOrder: 900_002,
      isPublished: false,
      domain: 'DEVOPS' as const,
    };
    const draftCategory = await services.categories.create(draftCategoryInput);

    const draftProjectInput = {
      title: 'Content Regression Draft Project',
      slug: `${prefix}-project`,
      summary: 'Disposable publication-filter fixture.',
      descriptionMarkdown: 'This record must never appear in public project results.',
      categoryId: draftCategory.id,
      status: 'PLANNED' as const,
      formatType: 'standard' as const,
      isFeatured: false,
      sortOrder: 900_002,
      devopsStack: ['Content-Regression'],
      tags: ['content-legacy-regression', suffix],
    };
    const draftProject = await services.projects.create(draftProjectInput);

    const draftBlogInput = {
      title: 'Content Regression Draft Blog',
      slug: `${prefix}-blog`,
      excerpt: 'Disposable publication-filter fixture.',
      contentMarkdown: 'This record must never appear in public blog results.',
      categoryId: draftCategory.id,
      readTimeMinutes: 1,
      tags: ['content-legacy-regression', suffix],
      isPublished: false,
      publishedAt: new Date().toISOString(),
    };
    const draftBlog = await services.blogs.create(draftBlogInput);

    const inquiry = await services.inquiries.create({
      name: 'Content Regression Inquiry',
      email: `${prefix}@example.invalid`,
      subject: 'Disposable legacy inquiry CRUD fixture',
      message: 'This inquiry must be removed when the regression suite ends.',
      category: 'content-legacy-regression',
      ipAddress: '127.0.0.1',
    });
    assert.equal((await services.inquiries.getById(inquiry.id)).status, 'NEW');
    assert.ok((await services.inquiries.list('NEW')).some(({ id }) => id === inquiry.id));
    assert.equal((await services.inquiries.updateStatus(inquiry.id, 'READ')).status, 'READ');
    assert.ok((await services.inquiries.list('READ')).some(({ id }) => id === inquiry.id));
    await services.inquiries.delete(inquiry.id);
    assert.equal(await repositories.inquiries.findById(inquiry.id), null);

    assert.ok((await services.categories.listAll()).some(({ id }) => id === draftCategory.id));
    assert.ok((await services.projects.listAll()).some(({ id }) => id === draftProject.id));
    assert.ok((await services.blogs.listAll()).some(({ id }) => id === draftBlog.id));
    assert.ok(!(await services.categories.listPublic()).some(({ id }) => id === draftCategory.id));
    assert.ok(!(await services.projects.listPublic()).some(({ id }) => id === draftProject.id));
    assert.ok(!(await services.blogs.listPublic()).some(({ id }) => id === draftBlog.id));

    await expectApplicationError(
      () => services.categories.getPublicBySlug(draftCategory.slug),
      NotFoundError,
      'NOT_FOUND',
    );
    await expectApplicationError(
      () => services.projects.getPublicBySlug(draftProject.slug),
      NotFoundError,
      'NOT_FOUND',
    );
    await expectApplicationError(
      () => services.blogs.getPublicBySlug(draftBlog.slug),
      NotFoundError,
      'NOT_FOUND',
    );

    await expectApplicationError(
      () => services.categories.create(draftCategoryInput),
      ConflictError,
      'CONFLICT',
    );
    await expectApplicationError(
      () => services.projects.create(draftProjectInput),
      ConflictError,
      'CONFLICT',
    );
    await expectApplicationError(
      () => services.blogs.create(draftBlogInput),
      ConflictError,
      'CONFLICT',
    );

    const invalidStatusSlug = `${prefix}-invalid-status`;
    await expectApplicationError(
      () =>
        services.projects.create({
          ...draftProjectInput,
          slug: invalidStatusSlug,
          status: 'UNKNOWN_STATUS' as never,
        }),
      ValidationError,
      'VALIDATION_ERROR',
    );
    assert.equal(await repositories.projects.findBySlug(invalidStatusSlug), null);
    assert.throws(
      () => normalizeProjectStatus('UNKNOWN_STATUS'),
      (error: unknown) =>
        error instanceof ValidationError && error.code === 'VALIDATION_ERROR' && error.statusCode === 400,
    );

    const missingId = `${prefix}-missing`;
    await Promise.all([
      expectApplicationError(() => services.categories.getById(missingId), NotFoundError, 'NOT_FOUND'),
      expectApplicationError(() => services.projects.getById(missingId), NotFoundError, 'NOT_FOUND'),
      expectApplicationError(() => services.blogs.getById(missingId), NotFoundError, 'NOT_FOUND'),
      expectApplicationError(() => services.skills.getById(missingId), NotFoundError, 'NOT_FOUND'),
      expectApplicationError(
        () => services.certifications.getById(missingId),
        NotFoundError,
        'NOT_FOUND',
      ),
      expectApplicationError(() => services.inquiries.getById(missingId), NotFoundError, 'NOT_FOUND'),
    ]);

    assertNormalizedError({ code: 'P2002' }, 409, 'CONFLICT');
    assertNormalizedError({ code: 'P2025' }, 404, 'NOT_FOUND');
    assertNormalizedError({ code: 'P1001' }, 503, 'PERSISTENCE_UNAVAILABLE');
    assertNormalizedError(
      { name: 'PrismaClientInitializationError' },
      503,
      'PERSISTENCE_UNAVAILABLE',
    );
    assertNormalizedError(new Error('unexpected'), 500, 'SERVER_ERROR');

    const existingConflict = new ConflictError('already normalized');
    assert.equal(normalizeApplicationError(existingConflict), existingConflict);
  } catch (error) {
    runFailure = error;
  } finally {
    try {
      await cleanupByPrefix();
    } catch {
      cleanupFailures.push('fixture enumeration');
    }
  }

  if (cleanupFailures.length > 0) {
    const cleanupMessage = `cleanup failed for ${cleanupFailures.join(', ')}`;
    if (runFailure) {
      throw new AggregateError([runFailure], `Content legacy regression failed and ${cleanupMessage}`);
    }
    throw new Error(`Content legacy regression ${cleanupMessage}`);
  }

  if (runFailure) throw runFailure;

  const [categoriesAfter, projectsAfter, blogsAfter, certificationsAfter, skillsAfter] = await Promise.all([
    repositories.categories.findAll(),
    repositories.projects.findAll(),
    repositories.blogs.findAll(),
    repositories.certifications.findAll(),
    repositories.skills.findAll(),
  ]);
  assert.equal(categoriesAfter.length, 3, 'draft category cleanup failed');
  assert.equal(projectsAfter.length, 3, 'draft project cleanup failed');
  assert.equal(blogsAfter.length, 3, 'draft blog cleanup failed');
  assert.equal(certificationsAfter.length, 3, 'canonical certifications changed during cleanup');
  assert.equal(skillsAfter.length, 7, 'canonical skills changed during cleanup');

  console.log('Content legacy regression: PASS');
}

main().catch((error: unknown) => {
  console.error(`Content legacy regression: FAIL (${safeErrorMessage(error)})`);
  process.exitCode = 1;
});
