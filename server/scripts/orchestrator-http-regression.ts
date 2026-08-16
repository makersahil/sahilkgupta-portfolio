import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

interface ApiResult { response: Response; payload: Record<string, any>; }

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) throw new Error('DATABASE_URL is required for Portfolio Orchestrator HTTP regression');
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = `${randomUUID()}${randomUUID()}`;

  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const password = `Phase8-${randomUUID()}!`;
  const emails = {
    admin: `phase8-admin-${suffix}@example.invalid`,
    editor: `phase8-editor-${suffix}@example.invalid`,
    superAdmin: `phase8-super-${suffix}@example.invalid`,
  };
  const userIds: string[] = [];
  const projectIds: string[] = [];
  let server: Server | null = null;

  const [
    { default: express },
    { default: cookieParser },
    { default: bcrypt },
    { default: authRoutes },
    { default: orchestratorRoutes },
    { default: projectRoutes },
    { default: labRoutes },
    { default: adminRoutes },
    { errorHandler },
    { prisma },
  ] = await Promise.all([
    import('express'), import('cookie-parser'), import('bcryptjs'),
    import('../routes/auth.routes.js'), import('../routes/orchestrator.routes.js'),
    import('../routes/projects.routes.js'), import('../routes/labs.routes.js'),
    import('../routes/admin.routes.js'), import('../middlewares/error.middleware.js'),
    import('../lib/prisma.js'),
  ]);

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const users = await Promise.all([
      prisma.user.create({ data: { email: emails.admin, displayName: 'Phase 8 Admin', passwordHash, role: 'ADMIN', isActive: true } }),
      prisma.user.create({ data: { email: emails.editor, displayName: 'Phase 8 Editor', passwordHash, role: 'EDITOR', isActive: true } }),
      prisma.user.create({ data: { email: emails.superAdmin, displayName: 'Phase 8 Super Admin', passwordHash, role: 'SUPER_ADMIN', isActive: true } }),
    ]);
    userIds.push(...users.map((entry) => entry.id));
    const category = await prisma.category.findFirst({ where: { domain: 'NETWORKING' }, orderBy: { createdAt: 'asc' } });
    assert.ok(category, 'a NETWORKING category is required');

    const app = express();
    app.use(express.json({ limit: '3mb' }));
    app.use(cookieParser());
    app.use('/api/auth', authRoutes);
    app.use('/api/admin/orchestrator', orchestratorRoutes);
    app.use('/api/projects', projectRoutes);
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
      const text = await response.text();
      let payload: Record<string, any> = {};
      if (text) {
        try { payload = JSON.parse(text) as Record<string, any>; }
        catch { payload = { raw: text }; }
      }
      return { response, payload };
    }
    async function expect(path: string, status: number, init?: RequestInit): Promise<ApiResult> {
      const result = await request(path, init);
      assert.equal(result.response.status, status, `${init?.method ?? 'GET'} ${path}: ${JSON.stringify(result.payload)}`);
      return result;
    }
    function cookie(result: ApiResult): string {
      const value = result.response.headers.get('set-cookie');
      assert.ok(value, 'login must return a session cookie');
      return value.split(';', 1)[0];
    }
    async function login(email: string): Promise<string> {
      return cookie(await expect('/api/auth/login', 200, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
      }));
    }

    const adminHeaders = { Cookie: await login(emails.admin), 'Content-Type': 'application/json' };
    const editorHeaders = { Cookie: await login(emails.editor), 'Content-Type': 'application/json' };
    const superHeaders = { Cookie: await login(emails.superAdmin), 'Content-Type': 'application/json' };

    await expect('/api/admin/orchestrator/dashboard', 401);
    await expect('/api/admin/orchestrator/projects', 403, { method: 'POST', headers: editorHeaders, body: '{}' });
    await expect('/api/admin/orchestrator/dashboard', 200, { headers: adminHeaders });
    await expect('/api/admin/orchestrator/projects/does-not-exist', 404, { headers: adminHeaders });
    await expect('/api/admin/orchestrator/projects', 400, { method: 'POST', headers: adminHeaders, body: '{}' });

    const project = await expect('/api/admin/orchestrator/projects', 201, {
      method: 'POST', headers: adminHeaders, body: JSON.stringify({
        title: `Phase 8 HTTP ${suffix}`,
        slug: `phase8-http-${suffix}`,
        domain: 'NETWORKING',
        summary: 'Disposable HTTP orchestration fixture.',
        categoryId: category.id,
        lifecycleStatus: 'PLANNED',
        formatType: 'STANDARD',
        sortOrder: 9500,
        technologies: ['Phase 8'],
        tags: ['orchestrator-http'],
      }),
    });
    const projectId = project.payload.data.project.id as string;
    projectIds.push(projectId);
    assert.equal(project.payload.data.project.publicationStatus, 'DRAFT');

    const legacyProject = await expect('/api/projects', 201, {
      method: 'POST', headers: adminHeaders, body: JSON.stringify({
        title: `Legacy bypass ${suffix}`, slug: `legacy-bypass-${suffix}`, categoryId: category.id,
        status: 'COMPLETED', formatType: 'standard', isFeatured: false, sortOrder: 9501,
        summary: 'Legacy route must remain DRAFT.', devopsStack: [], tags: [],
      }),
    });
    projectIds.push(legacyProject.payload.data.id);
    assert.equal((await prisma.project.findUniqueOrThrow({ where: { id: legacyProject.payload.data.id } })).status, 'DRAFT');

    const labCreate = await expect(`/api/admin/orchestrator/projects/${projectId}/labs`, 201, {
      method: 'POST', headers: adminHeaders, body: JSON.stringify({
        slug: `phase8-http-lab-${suffix}`,
        title: 'Phase 8 HTTP Networking Lab',
        summary: 'Disposable HTTP Lab fixture.',
        isInteractive: true,
        manifestVersion: '1.0',
        capabilities: ['topology', 'scenarios'],
        normalizedState: {
          schemaVersion: 'networking.v1', overview: 'HTTP fixture', routingTable: [], vlans: [], accessControlLists: [], verificationChecks: [],
          specifications: { environment: 'Regression', protocols: [], addressing: [] },
          provenance: { sourceType: 'CANONICAL_MANIFEST', packetTracerReference: null, notes: ['Disposable'] },
        },
        metadata: { fixture: true }, sortOrder: 10,
      }),
    });
    const lab = labCreate.payload.data.labs.find((entry: Record<string, any>) => entry.slug === `phase8-http-lab-${suffix}`);
    assert.ok(lab);
    const labId = lab.id as string;

    await expect('/api/labs', 400, {
      method: 'POST', headers: adminHeaders, body: JSON.stringify({
        slug: `legacy-ready-${suffix}`, title: 'Legacy Ready Bypass', domain: 'NETWORKING', kind: 'NETWORK_TOPOLOGY',
        status: 'READY', projectId, isInteractive: true, manifestVersion: '1.0', capabilities: [],
      }),
    });

    const invalidValidation = await expect(`/api/admin/orchestrator/projects/${projectId}/validate`, 200, { method: 'POST', headers: adminHeaders, body: '{}' });
    assert.equal(invalidValidation.payload.data.valid, false);

    await expect(`/api/labs/${labId}/inputs`, 201, {
      method: 'POST', headers: adminHeaders, body: JSON.stringify({
        inputKey: 'topology', inputType: 'NETWORK_TOPOLOGY', label: 'Topology', description: 'Canonical input', sourceKind: 'INLINE',
        schemaVersion: 'networking.input.v1', payload: { schemaVersion: 'networking.input.v1' }, isPrimary: true, sortOrder: 0,
      }),
    });
    await expect(`/api/labs/${labId}/topology`, 200, {
      method: 'PUT', headers: adminHeaders, body: JSON.stringify({
        nodes: [
          { nodeKey: 'left', label: 'Left', kind: 'router', position: { x: 100, y: 200 }, configuration: { device: { status: 'UP', interfaces: [{ name: 'Gi0/0', status: 'UP' }] } }, metadata: {} },
          { nodeKey: 'right', label: 'Right', kind: 'router', position: { x: 800, y: 200 }, configuration: { device: { status: 'UP', interfaces: [{ name: 'Gi0/0', status: 'UP' }] } }, metadata: {} },
        ],
        links: [{ linkKey: 'left-right', sourceNodeKey: 'left', targetNodeKey: 'right', kind: 'routed', configuration: { status: 'UP', sourceInterface: 'Gi0/0', targetInterface: 'Gi0/0' }, metadata: {} }],
      }),
    });
    await expect(`/api/labs/${labId}/scenarios`, 201, {
      method: 'POST', headers: adminHeaders, body: JSON.stringify({
        slug: 'link-failure', title: 'Link Failure', summary: 'Session-only link failure', order: 1, isEnabled: true,
        baselineState: {}, actions: { schemaVersion: 'networking.scenario.v1', mutations: [{ type: 'SET_LINK_STATUS', linkKey: 'left-right', status: 'DOWN' }] },
        expectedObservations: {}, verificationCriteria: {},
      }),
    });
    await expect(`/api/labs/${labId}/runbook`, 201, { method: 'POST', headers: adminHeaders, body: JSON.stringify({ order: 1, title: 'Inspect', command: 'show topology', expectedObservation: 'Recorded topology is visible' }) });
    await expect(`/api/labs/${labId}/evidence`, 201, { method: 'POST', headers: adminHeaders, body: JSON.stringify({ kind: 'TOPOLOGY', title: 'Topology evidence', content: { referenceOnly: true }, isPublic: true, sortOrder: 1 }) });

    let aggregate = (await expect(`/api/admin/orchestrator/projects/${projectId}`, 200, { headers: adminHeaders })).payload.data;
    aggregate = (await expect(`/api/admin/orchestrator/projects/${projectId}`, 200, {
      method: 'PATCH', headers: adminHeaders, body: JSON.stringify({
        expectedRevision: aggregate.project.revision,
        lifecycleStatus: 'COMPLETED', mission: 'HTTP orchestration', architectureSummary: 'Persisted aggregate', whatIBuilt: 'One dynamic Networking Lab',
      }),
    })).payload.data;

    const validation = await expect(`/api/admin/orchestrator/projects/${projectId}/validate`, 200, { method: 'POST', headers: adminHeaders, body: '{}' });
    assert.equal(validation.payload.data.valid, true, JSON.stringify(validation.payload.data.findings));
    const preview = await expect(`/api/admin/orchestrator/projects/${projectId}/preview`, 200, { headers: adminHeaders });
    assert.equal(preview.payload.data.project.id, projectId);

    const freshLab = (await expect(`/api/admin/orchestrator/projects/${projectId}`, 200, { headers: adminHeaders })).payload.data.labs[0];
    await expect(`/api/admin/orchestrator/labs/${labId}/mark-ready`, 200, { method: 'POST', headers: adminHeaders, body: JSON.stringify({ expectedRevision: freshLab.revision }) });
    aggregate = (await expect(`/api/admin/orchestrator/projects/${projectId}`, 200, { headers: adminHeaders })).payload.data;
    const published = await expect(`/api/admin/orchestrator/projects/${projectId}/publish`, 200, {
      method: 'POST', headers: adminHeaders, body: JSON.stringify({
        expectedProjectRevision: aggregate.project.revision,
        expectedLabRevisions: Object.fromEntries(aggregate.labs.map((entry: Record<string, any>) => [entry.id, entry.revision])),
        readyLabIds: [labId],
      }),
    });
    assert.equal(published.payload.data.project.publicationStatus, 'PUBLISHED');

    const publicProject = await expect(`/api/projects/${encodeURIComponent(`phase8-http-${suffix}`)}`, 200);
    const publicLab = await expect(`/api/labs/${encodeURIComponent(`phase8-http-lab-${suffix}`)}`, 200);
    const publicText = `${JSON.stringify(publicProject.payload)}${JSON.stringify(publicLab.payload)}`;
    assert.doesNotMatch(publicText, /storageKey|sessionKey|passwordHash|JWT_SECRET|DATABASE_URL/);
    assert.doesNotMatch(JSON.stringify(publicLab.payload), /"payload"\s*:/, 'public manifest/lab response must not expose raw input payloads');

    await expect(`/api/admin/orchestrator/projects/${projectId}`, 409, {
      method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ expectedRevision: aggregate.project.revision, summary: 'stale update' }),
    });

    const duplicate = await expect(`/api/admin/orchestrator/projects/${projectId}/duplicate`, 201, { method: 'POST', headers: adminHeaders, body: '{}' });
    const duplicateId = duplicate.payload.data.project.id as string;
    projectIds.push(duplicateId);
    await expect(`/api/admin/orchestrator/projects/${duplicateId}`, 403, { method: 'DELETE', headers: adminHeaders, body: JSON.stringify({ confirmation: duplicate.payload.data.project.title }) });
    await expect(`/api/admin/orchestrator/projects/${duplicateId}`, 200, { method: 'DELETE', headers: superHeaders, body: JSON.stringify({ confirmation: duplicate.payload.data.project.title }) });
    projectIds.splice(projectIds.indexOf(duplicateId), 1);

    const audit = await expect('/api/admin/audit?limit=200', 200, { headers: adminHeaders });
    const actions = new Set((audit.payload.data as Array<Record<string, any>>).map((entry) => entry.action));
    for (const action of ['ORCHESTRATOR_PROJECT_CREATE', 'ORCHESTRATOR_LAB_CREATE', 'ORCHESTRATOR_PROJECT_VALIDATE', 'ORCHESTRATOR_LAB_READY', 'ORCHESTRATOR_PROJECT_PUBLISH']) {
      assert.ok(actions.has(action), `AuditLog must contain ${action}`);
    }
    assert.doesNotMatch(JSON.stringify(audit.payload.data), new RegExp(password));

    console.log('Portfolio Orchestrator HTTP regression: PASS');
  } finally {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    if (userIds.length) await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } }).catch(() => undefined);
    for (const projectId of [...projectIds].reverse()) await prisma.project.deleteMany({ where: { id: projectId } }).catch(() => undefined);
    if (userIds.length) await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => undefined);
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`Portfolio Orchestrator HTTP regression: FAIL (${message})`);
  process.exitCode = 1;
});
