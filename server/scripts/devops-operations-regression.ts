import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { markRegressionLabReady } from './orchestrator-test-helpers.js';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) throw new Error('DATABASE_URL is required for DevOps operations regression');
  process.env.NODE_ENV = 'test';

  const [{ prisma }, { labService }, { devOpsOperationsService }] = await Promise.all([
    import('../lib/prisma.js'),
    import('../services/labs/index.js'),
    import('../services/devops/index.js'),
  ]);

  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const labIds: string[] = [];

  try {
    const project = await prisma.project.findFirst({ where: { domain: 'DEVOPS', status: 'PUBLISHED' } });
    assert.ok(project, 'a published DevOps project fixture is required');

    const degradedState = {
      schemaVersion: 'devops.v1',
      overview: 'Phase 5B degraded DevOps regression fixture',
      repository: { name: 'ops-fixture', branch: 'main', commitSha: 'ops1234', source: 'NORMALIZED_INPUT' },
      pipelines: [{
        id: 'delivery', name: 'Delivery', framework: 'Fixture CI', status: 'FAILED', source: 'NORMALIZED_INPUT',
        stages: [
          { id: 'build', name: 'Build', tool: 'BuildKit', status: 'SUCCESS', durationSeconds: 5, recordedOutput: 'build ok', artifacts: ['image-ref'], source: 'NORMALIZED_INPUT' },
          { id: 'deploy', name: 'Deploy', tool: 'ArgoCD', status: 'FAILED', durationSeconds: 2, recordedOutput: 'sync failed', artifacts: [], source: 'NORMALIZED_INPUT' },
        ],
      }],
      terraform: {
        present: true,
        workspace: 'test',
        backend: 'local',
        driftStatus: 'DRIFTED',
        driftSummary: 'Recorded plan contains changes',
        recordedPlanOutput: 'Plan: 1 to add, 0 to change, 0 to destroy.',
        files: [{ name: 'main.tf', path: 'terraform/main.tf', type: 'FILE', size: null, content: 'terraform {}', source: 'NORMALIZED_INPUT' }],
        source: 'NORMALIZED_INPUT',
      },
      kubernetes: {
        clusters: [{ name: 'lab-cluster', version: '1.30', status: 'READY', provider: 'kind', source: 'RECORDED_SNAPSHOT' }],
        workloads: [{ kind: 'Deployment', namespace: 'default', name: 'api', desiredReplicas: 3, readyReplicas: 1, status: 'DEGRADED', image: 'example/api:test', source: 'RECORDED_SNAPSHOT' }],
      },
      gitops: [{ name: 'api', controller: 'ArgoCD', syncStatus: 'OUT_OF_SYNC', healthStatus: 'DEGRADED', revision: 'ops1234', destination: 'lab-cluster', source: 'RECORDED_SNAPSHOT' }],
      helm: [{ name: 'api', namespace: 'default', chart: 'api', version: '1.0.0', status: 'DEGRADED', source: 'RECORDED_SNAPSHOT' }],
      networkPolicies: [{ name: 'api-policy', namespace: 'default', provider: 'Cilium', status: 'UNKNOWN', summary: 'Recorded only', source: 'RECORDED_SNAPSHOT' }],
      observability: [{ id: 'obs-1', name: 'Canary SLO', provider: 'Prometheus', status: 'FAIL', summary: 'Recorded canary failed', recordedOutput: 'error-rate above threshold', source: 'RECORDED_SNAPSHOT' }],
      architecture: [],
      provenance: { sourceType: 'CANONICAL_MANIFEST', notes: ['Operations regression fixture'] },
    };

    const lab = await labService.create({
      slug: `devops-operations-${suffix}`,
      title: 'DevOps Operations Regression',
      summary: 'Recorded-state DevOps operations fixture',
      domain: 'DEVOPS', kind: 'DEVOPS_PIPELINE', status: 'DRAFT', projectId: project.id,
      isInteractive: true, manifestVersion: '1.0',
      capabilities: ['pipeline', 'terraform', 'kubernetes', 'gitops', 'helm', 'network-policy', 'observability', 'health-analysis', 'diagnostics', 'operator-context', 'scenario-readiness'],
      normalizedState: degradedState,
    });
    await markRegressionLabReady(lab.id);
    labIds.push(lab.id);
    await labService.createInput(lab.id, { inputKey: 'pipeline', inputType: 'CI_PIPELINE', label: 'Pipeline', sourceKind: 'INLINE', schemaVersion: 'devops.input.v1', payload: {}, isPrimary: true, sortOrder: 0 });
    await labService.createScenario(lab.id, {
      slug: 'pipeline-failure', title: 'Pipeline Failure', summary: 'Regression scenario definition', order: 10, isEnabled: true,
      baselineState: { schemaVersion: 'devops.scenario.v1' },
      actions: { mutations: [{ type: 'SET_PIPELINE_STAGE_STATUS', status: 'FAILED' }] },
      expectedObservations: { observableSignals: ['pipeline:delivery=FAILED', 'failed-stage-visible'] },
      verificationCriteria: { checks: ['failure is inspectable'] },
    });

    const operations = await devOpsOperationsService.getOperations(lab.slug);
    assert.equal(operations.schemaVersion, 'devops.operations.v1');
    assert.equal(operations.overallStatus, 'CRITICAL');
    assert.equal(operations.executionAvailable, false);
    assert.equal(operations.counts.failedPipelines, 1);
    assert.equal(operations.counts.problemWorkloads, 1);
    assert.equal(operations.counts.outOfSyncApplications, 1);
    assert.equal(operations.counts.failingObservations, 1);
    assert.ok(operations.healthChecks.some((entry) => entry.category === 'PIPELINE' && entry.status === 'FAIL'));
    assert.ok(operations.healthChecks.some((entry) => entry.category === 'TERRAFORM' && entry.status === 'WARN'));
    assert.ok(operations.healthChecks.some((entry) => entry.category === 'KUBERNETES' && entry.status === 'WARN'));
    assert.ok(operations.healthChecks.some((entry) => entry.category === 'GITOPS' && entry.status === 'FAIL'));
    assert.ok(operations.healthChecks.some((entry) => entry.category === 'OBSERVABILITY' && entry.status === 'FAIL'));
    assert.ok(operations.findings.some((entry) => entry.category === 'PIPELINE' && entry.severity === 'CRITICAL'));
    assert.ok(operations.findings.some((entry) => entry.category === 'TERRAFORM'));
    assert.ok(operations.findings.some((entry) => entry.category === 'KUBERNETES'));
    assert.ok(operations.findings.some((entry) => entry.category === 'GITOPS'));
    assert.ok(operations.findings.some((entry) => entry.category === 'OBSERVABILITY'));
    assert.equal(operations.scenarioReadiness[0]?.slug, 'pipeline-failure');
    assert.deepEqual(operations.scenarioReadiness[0]?.observableSignals, ['pipeline:delivery=FAILED', 'failed-stage-visible']);

    const labContext = await devOpsOperationsService.getContext(lab.slug);
    assert.equal(labContext.scope, 'LAB');
    assert.match(labContext.prompt, /^GITOPS\//);
    assert.equal(labContext.executionAvailable, false);

    const pipelineContext = await devOpsOperationsService.getContext(lab.slug, 'delivery');
    assert.equal(pipelineContext.scope, 'PIPELINE');
    assert.equal(pipelineContext.pipeline?.id, 'delivery');
    assert.match(pipelineContext.prompt, /\/DELIVERY>$/);
    await assert.rejects(() => devOpsOperationsService.getContext(lab.slug, 'missing'), /DevOps pipeline not found/);

    const unknownState = {
      schemaVersion: 'devops.v1',
      overview: 'Unknown evidence fixture',
      repository: null,
      pipelines: [],
      terraform: { present: true, workspace: null, backend: null, driftStatus: 'UNKNOWN', driftSummary: null, recordedPlanOutput: null, files: [], source: 'NORMALIZED_INPUT' },
      kubernetes: { clusters: [], workloads: [] },
      gitops: [], helm: [], networkPolicies: [], observability: [], architecture: [],
      provenance: { sourceType: 'CANONICAL_MANIFEST', notes: [] },
    };
    const unknownLab = await labService.create({
      slug: `devops-operations-unknown-${suffix}`,
      title: 'DevOps Operations Unknown Regression',
      domain: 'DEVOPS', kind: 'DEVOPS_PIPELINE', status: 'DRAFT', projectId: project.id,
      isInteractive: true, manifestVersion: '1.0', capabilities: ['terraform', 'health-analysis'], normalizedState: unknownState,
    });
    await markRegressionLabReady(unknownLab.id);
    labIds.push(unknownLab.id);
    await labService.createInput(unknownLab.id, { inputKey: 'terraform', inputType: 'TERRAFORM', label: 'Terraform', sourceKind: 'INLINE', schemaVersion: 'devops.terraform.v1', payload: {}, isPrimary: true, sortOrder: 0 });

    const unknownOperations = await devOpsOperationsService.getOperations(unknownLab.slug);
    assert.equal(unknownOperations.overallStatus, 'UNKNOWN', 'inconclusive Terraform evidence must not become HEALTHY');
    assert.equal(unknownOperations.healthChecks.length, 1, 'modules not represented by this Terraform-only Lab must not create synthetic UNKNOWN checks');
    assert.equal(unknownOperations.healthChecks[0]?.category, 'TERRAFORM');
    assert.equal(unknownOperations.findings.length, 0);

    console.log('DevOps operations regression: PASS');
  } finally {
    for (const id of labIds.reverse()) await prisma.lab.deleteMany({ where: { id } });
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(`DevOps operations regression: FAIL (${error instanceof Error ? error.stack ?? error.message : String(error)})`);
  process.exitCode = 1;
});
