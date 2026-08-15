import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

interface ApiResult { response: Response; payload: Record<string, any>; }

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) throw new Error('DATABASE_URL is required for the Admin orchestration HTTP regression suite');
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = `${randomUUID()}${randomUUID()}`;

  const adminEmail = `admin-orchestrator-${suffix}@example.invalid`;
  const editorEmail = `admin-editor-${suffix}@example.invalid`;
  const password = `Admin-${randomUUID()}!`;
  const createdIds: { project?: string; lab?: string; skill?: string; certification?: string; inquiry?: string } = {};
  const userIds: string[] = [];
  let server: Server | null = null;

  const [
    { default: express }, { default: cookieParser }, { default: bcrypt },
    { default: authRoutes }, { default: projectRoutes }, { default: skillRoutes }, { default: certificationRoutes },
    { default: contactRoutes }, { default: labRoutes }, { default: adminRoutes }, { errorHandler }, { prisma },
  ] = await Promise.all([
    import('express'), import('cookie-parser'), import('bcryptjs'),
    import('../routes/auth.routes.js'), import('../routes/projects.routes.js'), import('../routes/skills.routes.js'), import('../routes/certifications.routes.js'),
    import('../routes/contact.routes.js'), import('../routes/labs.routes.js'), import('../routes/admin.routes.js'), import('../middlewares/error.middleware.js'), import('../lib/prisma.js'),
  ]);

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const [admin, editor] = await Promise.all([
      prisma.user.create({ data: { email: adminEmail, displayName: 'Orchestrator Admin', passwordHash, role: 'ADMIN', isActive: true } }),
      prisma.user.create({ data: { email: editorEmail, displayName: 'Orchestrator Editor', passwordHash, role: 'EDITOR', isActive: true } }),
    ]);
    userIds.push(admin.id, editor.id);

    const category = await prisma.category.findFirst({ where: { domain: 'NETWORKING', status: 'PUBLISHED' } });
    assert.ok(category, 'A published NETWORKING category is required');

    const app = express();
    app.use(express.json({ limit: '2mb' }));
    app.use(cookieParser());
    app.use('/api/auth', authRoutes);
    app.use('/api/projects', projectRoutes);
    app.use('/api/skills', skillRoutes);
    app.use('/api/certifications', certificationRoutes);
    app.use('/api/contact', contactRoutes);
    app.use('/api/labs', labRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api', errorHandler);
    server = await new Promise<Server>((resolve, reject) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
      listener.once('error', reject);
    });
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    async function request(path: string, init?: RequestInit): Promise<ApiResult> {
      const response = await fetch(`${baseUrl}${path}`, init);
      return { response, payload: await response.json() as Record<string, any> };
    }
    async function expect(path: string, status: number, init?: RequestInit): Promise<ApiResult> {
      const result = await request(path, init);
      assert.equal(result.response.status, status, `${init?.method ?? 'GET'} ${path}: ${JSON.stringify(result.payload)}`);
      return result;
    }
    function cookie(result: ApiResult): string {
      const raw = result.response.headers.get('set-cookie');
      assert.ok(raw, 'login must return a cookie');
      return raw.split(';', 1)[0];
    }
    async function login(email: string): Promise<string> {
      return cookie(await expect('/api/auth/login', 200, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }));
    }

    const adminCookie = await login(adminEmail);
    const editorCookie = await login(editorEmail);
    const adminHeaders = { Cookie: adminCookie, 'Content-Type': 'application/json' };
    const editorHeaders = { Cookie: editorCookie, 'Content-Type': 'application/json' };

    await expect('/api/admin/audit', 403, { headers: editorHeaders });

    const project = await expect('/api/projects', 201, {
      method: 'POST', headers: adminHeaders, body: JSON.stringify({
        title: `__smoke_admin_project_${suffix}`,
        slug: `smoke-admin-project-${suffix}`,
        summary: 'Admin orchestration regression fixture',
        descriptionMarkdown: 'Temporary regression fixture.',
        mission: 'Persist project mission independently.',
        architectureSummary: 'Persist architecture summary independently.',
        whatIBuilt: 'Persist what-I-built content independently.',
        categoryId: category.id,
        status: 'PLANNED',
        formatType: 'standard',
        isFeatured: false,
        sortOrder: 999,
        devopsStack: ['Regression'],
        tags: ['__smoke_admin'],
      }),
    });
    createdIds.project = project.payload.data.id;
    assert.equal(project.payload.data.mission, 'Persist project mission independently.');
    assert.equal(project.payload.data.architectureSummary, 'Persist architecture summary independently.');
    assert.equal(project.payload.data.whatIBuilt, 'Persist what-I-built content independently.');

    const lab = await expect('/api/labs', 201, {
      method: 'POST', headers: adminHeaders, body: JSON.stringify({
        slug: `smoke-admin-lab-${suffix}`, title: '__smoke_admin_lab', summary: 'Admin Lab Builder fixture',
        domain: 'NETWORKING', kind: 'NETWORK_TOPOLOGY', status: 'DRAFT', projectId: createdIds.project,
        isInteractive: true, manifestVersion: '1.0', capabilities: ['topology'], normalizedState: { fixture: true },
      }),
    });
    createdIds.lab = lab.payload.data.id;
    await expect(`/api/labs/${createdIds.lab}/inputs`, 201, { method: 'POST', headers: adminHeaders, body: JSON.stringify({ inputKey: 'topology', inputType: 'NETWORK_TOPOLOGY', label: 'Topology', sourceKind: 'INLINE', schemaVersion: '1.0', payload: { nodes: [] }, isPrimary: true, sortOrder: 0 }) });
    await expect(`/api/labs/${createdIds.lab}/runbook`, 201, { method: 'POST', headers: adminHeaders, body: JSON.stringify({ order: 1, title: 'Inspect' }) });
    await expect(`/api/labs/${createdIds.lab}/evidence`, 201, { method: 'POST', headers: adminHeaders, body: JSON.stringify({ kind: 'OTHER', title: 'Fixture evidence', content: { fixture: true }, isPublic: false, sortOrder: 0 }) });
    const aggregate = await expect(`/api/labs/admin/${createdIds.lab}`, 200, { headers: { Cookie: adminCookie } });
    assert.equal(aggregate.payload.data.inputs.length, 1);
    assert.equal(aggregate.payload.data.runbookSteps.length, 1);
    assert.equal(aggregate.payload.data.evidence.length, 1);
    await expect(`/api/labs/admin/${createdIds.lab}/manifest`, 200, { headers: { Cookie: adminCookie } });

    const skill = await expect('/api/skills', 201, { method: 'POST', headers: adminHeaders, body: JSON.stringify({ name: `__smoke_admin_skill_${suffix}`, level: 'Advanced', proficiencyPercent: 80, yearsOfExperience: 1, categoryId: category.id, sortOrder: 999 }) });
    createdIds.skill = skill.payload.data.id;

    const certification = await expect('/api/certifications', 201, { method: 'POST', headers: adminHeaders, body: JSON.stringify({ title: `__smoke_admin_cert_${suffix}`, issuer: 'Regression', credentialId: `__smoke_${suffix}`, issueDate: '2026-08-15', categoryId: category.id, skillsValidated: ['Regression'], isFeatured: false, sortOrder: 999 }) });
    createdIds.certification = certification.payload.data.id;

    const inquiry = await expect('/api/contact', 201, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '__smoke_admin_inquiry', email: `${suffix}@example.invalid`, message: 'Regression inquiry' }) });
    createdIds.inquiry = inquiry.payload.data.id;
    await expect(`/api/contact/inquiries/${createdIds.inquiry}/status`, 200, { method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ status: 'READ' }) });

    const audit = await expect('/api/admin/audit?limit=100', 200, { headers: { Cookie: adminCookie } });
    const actions = new Set((audit.payload.data as Array<{ action: string }>).map((entry) => entry.action));
    for (const action of ['PROJECT_CREATE', 'LAB_CREATE', 'LAB_INPUT_CREATE', 'LAB_RUNBOOK_CREATE', 'LAB_EVIDENCE_CREATE', 'SKILL_CREATE', 'CERTIFICATION_CREATE', 'INQUIRY_STATUS_UPDATE']) {
      assert.ok(actions.has(action), `persisted audit should include ${action}`);
    }
    const ownAudit = (audit.payload.data as Array<Record<string, any>>).find((entry) => entry.action === 'LAB_CREATE' && entry.entityId === createdIds.lab);
    assert.ok(ownAudit, 'created Lab audit record must be queryable');
    assert.equal(ownAudit.actorUser.email, adminEmail);
    assert.ok(!Number.isNaN(Date.parse(ownAudit.createdAt)), 'audit timestamp must come from persisted createdAt');

    console.log('Admin orchestration HTTP regression: PASS');
  } finally {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    const { prisma } = await import('../lib/prisma.js');
    if (userIds.length) await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
    if (createdIds.lab) await prisma.lab.deleteMany({ where: { id: createdIds.lab } });
    if (createdIds.project) await prisma.project.deleteMany({ where: { id: createdIds.project } });
    if (createdIds.skill) await prisma.skill.deleteMany({ where: { id: createdIds.skill } });
    if (createdIds.certification) await prisma.certification.deleteMany({ where: { id: createdIds.certification } });
    if (createdIds.inquiry) await prisma.inquiry.deleteMany({ where: { id: createdIds.inquiry } });
    if (userIds.length) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`Admin orchestration HTTP regression: FAIL (${error instanceof Error ? error.stack ?? error.message : String(error)})`);
  process.exitCode = 1;
});
