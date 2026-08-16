import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { markRegressionLabReady } from './orchestrator-test-helpers.js';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) throw new Error('DATABASE_URL is required for the lab manifest regression suite');
  process.env.NODE_ENV = 'test';

  const [{ prisma }, { labManifestService, labService }, { portfolioOrchestratorService }] = await Promise.all([
    import('../lib/prisma.js'),
    import('../services/labs/index.js'),
    import('../services/orchestrator/index.js'),
  ]);
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  let labId: string | undefined;
  try {
    const project = await prisma.project.findUnique({ where: { slug: 'cloud-native-gitops-k8s-cilium-terraform' } });
    assert.ok(project, 'DevOps seed project must exist');
    const lab = await labService.create({
      slug: `manifest-fixture-${suffix}`, title: 'Manifest Regression Lab', summary: 'Manifest contract fixture',
      domain: 'DEVOPS', kind: 'DEVOPS_PIPELINE', status: 'DRAFT', projectId: project.id,
      isInteractive: true, manifestVersion: '1.0', capabilities: ['pipeline', 'gitops'], normalizedState: { revision: 'abc123', healthy: true },
    });
    await markRegressionLabReady(lab.id);
    labId = lab.id;

    await labService.createInput(lab.id, {
      inputKey: 'pipeline', inputType: 'CI_PIPELINE', label: 'Pipeline', sourceKind: 'INLINE', schemaVersion: '1.0',
      payload: { secretFixture: 'must-not-be-exposed', stages: ['build', 'deploy'] }, isPrimary: true, sortOrder: 0,
    });
    await labService.createInput(lab.id, {
      inputKey: 'repository', inputType: 'GIT_REPOSITORY', label: 'Repository Reference', sourceKind: 'EXTERNAL', schemaVersion: '1.0',
      externalUrl: 'https://example.invalid/private-source-location', isPrimary: false, sortOrder: 1,
    });
    await labService.replaceTopology(lab.id,
      [{ nodeKey: 'cluster', label: 'Lab Cluster', kind: 'kubernetes' }], [],
    );
    await labService.createScenario(lab.id, { slug: `enabled-${suffix}`, title: 'Enabled', summary: 'Visible scenario', order: 1, isEnabled: true });
    await labService.createScenario(lab.id, { slug: `disabled-${suffix}`, title: 'Disabled', summary: 'Hidden scenario', order: 2, isEnabled: false });
    await labService.createRunbookStep(lab.id, { order: 1, title: 'Inspect pipeline', description: 'Review persisted pipeline state' });
    await labService.createEvidence(lab.id, { kind: 'COMMAND_OUTPUT', title: 'Public verification', content: { state: 'healthy' }, isPublic: true, sortOrder: 0 });
    await labService.createEvidence(lab.id, { kind: 'OTHER', title: 'Private operator note', content: { internal: true }, isPublic: false, sortOrder: 1 });

    const manifest = await labManifestService.getPublic(lab.slug);
    assert.equal(manifest.schemaVersion, '1.0');
    assert.deepEqual(manifest.normalizedState, { revision: 'abc123', healthy: true });
    assert.equal(manifest.topology.nodes.length, 1);
    assert.equal(manifest.inputs.length, 2);
    assert.equal(manifest.inputs[0].hasPayload, true);
    assert.equal(manifest.inputs[1].externalReference, true);
    assert.equal(JSON.stringify(manifest).includes('secretFixture'), false, 'raw inline payload must not be exposed');
    assert.equal(JSON.stringify(manifest).includes('private-source-location'), false, 'raw external input URL must not be exposed');
    assert.equal(manifest.scenarios.length, 1, 'disabled scenarios must not be public');
    assert.equal(manifest.evidence.length, 1, 'private evidence must not be public');
    assert.equal(manifest.runbook.length, 1);

    const currentLab = await portfolioOrchestratorService.getLab(lab.id);
    const archived = await portfolioOrchestratorService.archiveLab(lab.id, currentLab.revision);
    assert.equal(archived.lab.status, 'ARCHIVED');
    await assert.rejects(() => labManifestService.getPublic(lab.slug), /not found/i);
    const preview = await labManifestService.preview(lab.slug);
    assert.equal(preview.lab.status, 'ARCHIVED');
    assert.equal(preview.inputs.length, 2);

    console.log('Lab manifest regression: PASS');
  } finally {
    if (labId) await prisma.lab.deleteMany({ where: { id: labId } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`Lab manifest regression: FAIL (${error instanceof Error ? error.stack ?? error.message : String(error)})`);
  process.exitCode = 1;
});
