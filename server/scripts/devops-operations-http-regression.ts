import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { markRegressionLabReady } from './orchestrator-test-helpers.js';

interface ApiResult { response: Response; payload: Record<string, any>; }

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) throw new Error('DATABASE_URL is required for DevOps operations HTTP regression');
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
  let server: Server | null = null;

  try {
    const project = await prisma.project.findFirst({ where: { domain: 'DEVOPS', status: 'PUBLISHED' } });
    assert.ok(project);

    const normalizedState = {
      schemaVersion: 'devops.v1', overview: 'HTTP operations fixture',
      repository: { name: 'http-ops', branch: 'main', commitSha: 'feed567', source: 'NORMALIZED_INPUT' },
      pipelines: [{ id: 'delivery', name: 'Delivery', framework: 'Fixture', status: 'FAILED', source: 'NORMALIZED_INPUT', stages: [{ id: 'deploy', name: 'Deploy', tool: 'ArgoCD', status: 'FAILED', durationSeconds: 1, recordedOutput: 'recorded failure', artifacts: [], source: 'NORMALIZED_INPUT' }] }],
      terraform: { present: true, workspace: null, backend: 'local', driftStatus: 'CLEAN', driftSummary: 'Recorded no changes', recordedPlanOutput: 'No changes.', files: [{ name: 'main.tf', path: 'main.tf', type: 'FILE', size: null, content: 'terraform {}', source: 'NORMALIZED_INPUT' }], source: 'NORMALIZED_INPUT' },
      kubernetes: { clusters: [], workloads: [] }, gitops: [], helm: [], networkPolicies: [], observability: [], architecture: [],
      provenance: { sourceType: 'CANONICAL_MANIFEST', notes: [] },
    };
    const lab = await labService.create({
      slug: `devops-operations-http-${suffix}`, title: 'DevOps Operations HTTP Fixture', domain: 'DEVOPS', kind: 'DEVOPS_PIPELINE', status: 'DRAFT',
      projectId: project.id, isInteractive: true, manifestVersion: '1.0', capabilities: ['pipeline', 'terraform', 'health-analysis', 'operator-context', 'scenario-readiness'], normalizedState,
    });
    await markRegressionLabReady(lab.id);
    labId = lab.id;
    await labService.createInput(lab.id, { inputKey: 'pipeline', inputType: 'CI_PIPELINE', label: 'Pipeline', sourceKind: 'INLINE', schemaVersion: 'devops.input.v1', payload: {}, isPrimary: true, sortOrder: 0 });
    await labService.createScenario(lab.id, {
      slug: 'pipeline-failure', title: 'Pipeline Failure', summary: 'HTTP scenario', order: 10, isEnabled: true,
      expectedObservations: { observableSignals: ['pipeline:delivery=FAILED'] },
    });

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

    const operations = await expect(`/api/devops/labs/${lab.slug}/operations`, 200);
    assert.equal(operations.payload.data.schemaVersion, 'devops.operations.v1');
    assert.equal(operations.payload.data.overallStatus, 'CRITICAL');
    assert.equal(operations.payload.data.executionAvailable, false);
    assert.equal(operations.payload.data.scenarioReadiness[0].slug, 'pipeline-failure');

    const context = await expect(`/api/devops/labs/${lab.slug}/context`, 200);
    assert.equal(context.payload.data.scope, 'LAB');
    assert.match(context.payload.data.prompt, /^GITOPS\//);
    assert.equal(context.payload.data.executionAvailable, false);

    const pipelineContext = await expect(`/api/devops/labs/${lab.slug}/context?pipelineId=delivery`, 200);
    assert.equal(pipelineContext.payload.data.scope, 'PIPELINE');
    assert.equal(pipelineContext.payload.data.pipeline.id, 'delivery');

    await expect(`/api/devops/labs/${lab.slug}/context?pipelineId=missing`, 404);
    await expect('/api/devops/labs/not-a-real-lab/operations', 404);

    console.log('DevOps operations HTTP regression: PASS');
  } finally {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    if (labId) await prisma.lab.deleteMany({ where: { id: labId } });
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(`DevOps operations HTTP regression: FAIL (${error instanceof Error ? error.stack ?? error.message : String(error)})`);
  process.exitCode = 1;
});
