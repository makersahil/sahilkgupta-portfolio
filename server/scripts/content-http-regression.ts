import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

interface ApiResult {
  response: Response;
  payload: Record<string, any>;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL is required because protected HTTP routes use persistent authentication');
  }

  const suffix = randomUUID().replaceAll('-', '');
  const testSecret = `${randomUUID()}${randomUUID()}`;
  const testPassword = `Test-${randomUUID()}!`;
  const testAdminEmail = `content-admin-${suffix}@example.invalid`;
  const testEditorEmail = `content-editor-${suffix}@example.invalid`;

  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = testSecret;

  const [
    { default: express },
    { default: cookieParser },
    { default: bcrypt },
    { default: authRoutes },
    { default: categoryRoutes },
    { default: projectRoutes },
    { default: blogRoutes },
    { default: certificationRoutes },
    { default: skillRoutes },
    { default: contactRoutes },
    { default: networkRoutes },
    { errorHandler },
    { contentRepositories },
    { prisma },
  ] = await Promise.all([
    import('express'),
    import('cookie-parser'),
    import('bcryptjs'),
    import('../routes/auth.routes.js'),
    import('../routes/categories.routes.js'),
    import('../routes/projects.routes.js'),
    import('../routes/blogs.routes.js'),
    import('../routes/certifications.routes.js'),
    import('../routes/skills.routes.js'),
    import('../routes/contact.routes.js'),
    import('../routes/network.routes.js'),
    import('../middlewares/error.middleware.js'),
    import('../repositories/repository.factory.js'),
    import('../lib/prisma.js'),
  ]);

  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use('/api/auth', authRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/blogs', blogRoutes);
  app.use('/api/certifications', certificationRoutes);
  app.use('/api/skills', skillRoutes);
  app.use('/api/contact', contactRoutes);
  app.use('/api/network', networkRoutes);
  app.use('/api', errorHandler);

  const server = await new Promise<Server>((resolve, reject) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    listener.once('error', reject);
  });
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const created: {
    category?: string;
    project?: string;
    blog?: string;
    skill?: string;
    certification?: string;
    inquiry?: string;
  } = {};
  const createdUserIds: string[] = [];
  let runFailure: unknown;
  const cleanupFailures: string[] = [];

  async function request(path: string, init?: RequestInit): Promise<ApiResult> {
    const response = await fetch(`${baseUrl}${path}`, init);
    const payload = (await response.json()) as Record<string, any>;
    return { response, payload };
  }

  async function expectStatus(path: string, status: number, init?: RequestInit): Promise<ApiResult> {
    const result = await request(path, init);
    assert.equal(result.response.status, status, `${init?.method || 'GET'} ${path}`);
    return result;
  }

  function cookieHeader(result: ApiResult): string {
    const setCookie = result.response.headers.get('set-cookie');
    assert.ok(setCookie, 'login must return an HttpOnly session cookie');
    return setCookie.split(';', 1)[0];
  }

  async function cleanup(
    label: keyof typeof created,
    remove: (id: string) => Promise<boolean>,
  ): Promise<void> {
    const id = created[label];
    if (!id) return;
    try {
      await remove(id);
    } catch {
      cleanupFailures.push(label);
    }
  }

  try {
    const passwordHash = await bcrypt.hash(testPassword, 12);
    const adminUser = await prisma.user.create({
      data: {
        email: testAdminEmail,
        displayName: 'Content Regression Admin',
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });
    createdUserIds.push(adminUser.id);
    const editorUser = await prisma.user.create({
      data: {
        email: testEditorEmail,
        displayName: 'Content Regression Editor',
        passwordHash,
        role: 'EDITOR',
        isActive: true,
      },
    });
    createdUserIds.push(editorUser.id);

    const adminLogin = await expectStatus('/api/auth/login', 200, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testAdminEmail, password: testPassword }),
    });
    const editorLogin = await expectStatus('/api/auth/login', 200, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEditorEmail, password: testPassword }),
    });
    const adminHeaders = {
      Cookie: cookieHeader(adminLogin),
      'Content-Type': 'application/json',
    };
    const editorHeaders = {
      Cookie: cookieHeader(editorLogin),
      'Content-Type': 'application/json',
    };

    const categories = await expectStatus('/api/categories', 200);
    const projects = await expectStatus('/api/projects', 200);
    const blogs = await expectStatus('/api/blogs', 200);
    const certifications = await expectStatus('/api/certifications', 200);
    const skills = await expectStatus('/api/skills', 200);
    assert.equal(categories.payload.data.length, 3);
    assert.equal(projects.payload.data.length, 3);
    assert.equal(blogs.payload.data.length, 3);
    assert.equal(certifications.payload.data.length, 3);
    assert.equal(skills.payload.data.length, 7);

    const linuxProjects = await expectStatus('/api/projects?categoryId=cat-linux', 200);
    assert.deepEqual(linuxProjects.payload.data.map(({ id }: { id: string }) => id), [
      'proj-rhel-rhcsa-matrix',
    ]);
    const devopsBlogs = await expectStatus('/api/blogs?categoryId=cat-devops', 200);
    assert.deepEqual(devopsBlogs.payload.data.map(({ id }: { id: string }) => id), ['blog-03']);

    await expectStatus('/api/projects/content-does-not-exist', 404);
    const invalidPayload = await expectStatus('/api/categories', 400, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({}),
    });
    assert.equal(invalidPayload.payload.error.code, 'VALIDATION_ERROR');
    await expectStatus('/api/categories', 401, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Unauthorized', slug: `${suffix}-unauthorized` }),
    });
    await expectStatus('/api/categories', 403, {
      method: 'POST',
      headers: editorHeaders,
      body: JSON.stringify({ name: 'Forbidden', slug: `${suffix}-forbidden` }),
    });
    const duplicate = await expectStatus('/api/categories', 409, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ name: 'Duplicate Networking', slug: 'networking' }),
    });
    assert.equal(duplicate.payload.error.code, 'CONFLICT');

    const unknownStatus = await expectStatus('/api/projects', 400, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        title: 'Unknown Status Fixture',
        slug: `content-unknown-status-${suffix}`,
        categoryId: 'cat-networking',
        status: 'UNKNOWN',
      }),
    });
    assert.equal(unknownStatus.payload.error.code, 'VALIDATION_ERROR');

    const category = await expectStatus('/api/categories', 201, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        name: 'Content HTTP Category',
        slug: `content-http-${suffix}`,
        domain: 'DEVOPS',
        isPublished: false,
      }),
    });
    created.category = category.payload.data.id;

    const project = await expectStatus('/api/projects', 201, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        title: 'Content HTTP Draft Project',
        slug: `content-http-project-${suffix}`,
        categoryId: created.category,
        status: 'PLANNED',
      }),
    });
    created.project = project.payload.data.id;

    const blogTitle = `Content HTTP Draft Blog ${suffix}`;
    const blog = await expectStatus('/api/blogs', 201, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        title: blogTitle,
        slug: '',
        contentMarkdown: 'Disposable HTTP regression content.',
        categoryId: created.category,
        isPublished: false,
      }),
    });
    created.blog = blog.payload.data.id;
    assert.ok(blog.payload.data.slug.startsWith('content-http-draft-blog-'));

    const skill = await expectStatus('/api/skills', 201, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        name: `Content HTTP Skill ${suffix}`,
        categoryId: created.category,
        proficiencyPercent: 50,
        yearsOfExperience: 0,
      }),
    });
    created.skill = skill.payload.data.id;

    const certification = await expectStatus('/api/certifications', 201, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        title: `Content HTTP Certification ${suffix}`,
        issuer: 'Content Regression Harness',
        credentialId: `content-http-${suffix}`,
        issueDate: new Date(0).toISOString(),
        categoryId: created.category,
      }),
    });
    created.certification = certification.payload.data.id;

    const publicProjects = await expectStatus('/api/projects', 200);
    const publicBlogs = await expectStatus('/api/blogs', 200);
    const publicCategories = await expectStatus('/api/categories', 200);
    assert.ok(!publicProjects.payload.data.some(({ id }: { id: string }) => id === created.project));
    assert.ok(!publicBlogs.payload.data.some(({ id }: { id: string }) => id === created.blog));
    assert.ok(!publicCategories.payload.data.some(({ id }: { id: string }) => id === created.category));
    await expectStatus(`/api/projects/${project.payload.data.slug}`, 404);
    await expectStatus(`/api/blogs/${blog.payload.data.slug}`, 404);

    const inquiry = await expectStatus('/api/contact', 201, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '  Content Visitor  ',
        email: `CONTENT+${suffix}@EXAMPLE.INVALID`,
        subject: '  HTTP persistence check  ',
        message: '  Disposable inquiry content.  ',
        category: '  devops  ',
      }),
    });
    created.inquiry = inquiry.payload.data.id;
    assert.equal(inquiry.payload.data.name, 'Content Visitor');
    assert.equal(inquiry.payload.data.email, `content+${suffix}@example.invalid`);
    assert.equal(inquiry.payload.data.category, 'devops');
    await expectStatus(`/api/contact/inquiries/${created.inquiry}/status`, 200, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'READ' }),
    });
    await expectStatus('/api/contact/inquiries?status=INVALID', 400, {
      headers: adminHeaders,
    });
    await expectStatus('/api/contact', 400, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Visitor', email: 'invalid', message: 'Hello' }),
    });

    const me = await expectStatus('/api/auth/me', 200, { headers: adminHeaders });
    assert.equal(me.payload.user.id, adminUser.id);
    assert.equal(me.payload.user.role, 'ADMIN');

    await expectStatus('/api/network/simulate-packet', 200, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId: 'pc_devops', targetId: 'srv_k8s' }),
    });

    await expectStatus(`/api/certifications/${created.certification}`, 200, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    created.certification = undefined;
    await expectStatus(`/api/skills/${created.skill}`, 200, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    created.skill = undefined;
    await expectStatus(`/api/blogs/${created.blog}`, 200, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    created.blog = undefined;
    await expectStatus(`/api/projects/${created.project}`, 200, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    created.project = undefined;
    await expectStatus(`/api/categories/${created.category}`, 200, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    created.category = undefined;
  } catch (error) {
    runFailure = error;
  } finally {
    await cleanup('inquiry', (id) => contentRepositories.inquiries.delete(id));
    await cleanup('certification', (id) => contentRepositories.certifications.delete(id));
    await cleanup('skill', (id) => contentRepositories.skills.delete(id));
    await cleanup('blog', (id) => contentRepositories.blogs.delete(id));
    await cleanup('project', (id) => contentRepositories.projects.delete(id));
    await cleanup('category', (id) => contentRepositories.categories.delete(id));

    for (const userId of createdUserIds) {
      try {
        await prisma.user.delete({ where: { id: userId } });
      } catch {
        cleanupFailures.push(`auth user ${userId}`);
      }
    }

    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await prisma.$disconnect();
  }

  if (cleanupFailures.length > 0) {
    throw new Error(`Content HTTP regression cleanup failed for: ${cleanupFailures.join(', ')}`);
  }
  if (runFailure) throw runFailure;
  console.log('Content HTTP regression: PASS');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error';
  console.error(`Content HTTP regression: FAIL (${message})`);
  process.exitCode = 1;
});
