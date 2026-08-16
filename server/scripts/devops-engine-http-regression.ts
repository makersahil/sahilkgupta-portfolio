import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { markRegressionLabReady } from './orchestrator-test-helpers.js';

interface ApiResult { response: Response; payload: Record<string, any>; }

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) throw new Error('DATABASE_URL is required for the DevOps engine HTTP regression suite');
  process.env.NODE_ENV = 'test';

  const [{ default: express }, { default: devOpsRoutes }, { errorHandler }, { prisma }, { labService }] = await Promise.all([
    import('express'),
    import('../routes/devops.routes.js'),
    import('../middlewares/error.middleware.js'),
    import('../lib/prisma.js'),
    import('../services/labs/index.js'),
  ]);

  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  let labId: string | undefined;
  let draftLabId: string | undefined;
  let server: Server | null = null;

  try {
    const project = await prisma.project.findUnique({ where: { slug: 'cloud-native-gitops-k8s-cilium-terraform' } });
    assert.ok(project);

    const normalizedState = {
      schemaVersion: 'devops.v1', overview: 'HTTP fixture',
      repository: { name: 'http-fixture', branch: 'main', commitSha: 'feed123', source: 'NORMALIZED_INPUT' },
      pipelines: [{ id: 'delivery', name: 'Delivery', framework: 'Fixture', status: 'SUCCESS', source: 'NORMALIZED_INPUT', stages: [{ id: 'build', name: 'Build', tool: 'BuildKit', status: 'SUCCESS', durationSeconds: 1, recordedOutput: 'recorded', artifacts: [], source: 'NORMALIZED_INPUT' }] }],
      terraform: null,
      kubernetes: { clusters: [], workloads: [] }, gitops: [], helm: [], networkPolicies: [], observability: [], architecture: [],
      provenance: { sourceType: 'CANONICAL_MANIFEST', notes: [] },
    };
    const lab = await labService.create({
      slug: `devops-http-${suffix}`, title: 'DevOps HTTP Fixture', summary: 'HTTP fixture', domain: 'DEVOPS', kind: 'DEVOPS_PIPELINE', status: 'DRAFT',
      projectId: project.id, isInteractive: true, manifestVersion: '1.0', capabilities: ['pipeline'], normalizedState,
    });
    await markRegressionLabReady(lab.id);
    labId = lab.id;
    await labService.createInput(lab.id, { inputKey: 'pipeline', inputType: 'CI_PIPELINE', label: 'Pipeline', sourceKind: 'INLINE', schemaVersion: 'devops.input.v1', payload: {}, isPrimary: true, sortOrder: 0 });

    const draft = await labService.create({
      slug: `devops-http-draft-${suffix}`, title: 'Draft DevOps Fixture', domain: 'DEVOPS', kind: 'DEVOPS_PIPELINE', status: 'DRAFT',
      projectId: project.id, isInteractive: true, manifestVersion: '1.0', capabilities: ['pipeline'], normalizedState,
    });
    draftLabId = draft.id;

    const app = express();
    app.use(express.json({ limit: '1mb' }));
    app.use('/api/devops', devOpsRoutes);
    app.use('/api', errorHandler);
    server = await new Promise<Server>((resolve, reject) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
      listener.once('error', reject);
    });
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    async function request(path: string): Promise<ApiResult> {
      const response = await fetch(`${baseUrl}${path}`);
      return { response, payload: await response.json() as Record<string, any> };
    }
    async function expect(path: string, status: number) {
      const result = await request(path);
      assert.equal(result.response.status, status, `GET ${path}`);
      return result;
    }

    const list = await expect(`/api/devops/labs?projectSlug=${encodeURIComponent(project.slug)}`, 200);
    assert.ok(list.payload.data.some((entry: { id: string }) => entry.id === lab.id));
    assert.equal(list.payload.data.some((entry: { id: string }) => entry.id === draft.id), false);

    const state = await expect(`/api/devops/labs/${lab.slug}`, 200);
    assert.equal(state.payload.data.schemaVersion, 'devops.v1');
    assert.equal(state.payload.data.pipelines.length, 1);
    assert.equal(state.payload.data.repository.commitSha, 'feed123');

    const pipeline = await expect(`/api/devops/labs/${lab.slug}/pipelines/delivery`, 200);
    assert.equal(pipeline.payload.data.stages[0].tool, 'BuildKit');
    await expect(`/api/devops/labs/${lab.slug}/pipelines/missing`, 404);
    await expect(`/api/devops/labs/${draft.slug}`, 404);

    console.log('DevOps engine HTTP regression: PASS');
  } finally {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    const ids = [labId, draftLabId].filter((entry): entry is string => Boolean(entry));
    if (ids.length) await prisma.lab.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(`DevOps engine HTTP regression: FAIL (${error instanceof Error ? error.stack ?? error.message : String(error)})`);
  process.exitCode = 1;
});
