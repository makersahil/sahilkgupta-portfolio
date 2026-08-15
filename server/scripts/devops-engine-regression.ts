import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) throw new Error('DATABASE_URL is required for DevOps engine regression');
  process.env.NODE_ENV = 'test';

  const [{ prisma }, { labService }, { devOpsService }] = await Promise.all([
    import('../lib/prisma.js'),
    import('../services/labs/index.js'),
    import('../services/devops/index.js'),
  ]);

  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const labIds: string[] = [];
  let tempProjectId: string | undefined;

  try {
    const canonicalProject = await prisma.project.findFirst({ where: { domain: 'DEVOPS', status: 'PUBLISHED' } });
    assert.ok(canonicalProject, 'a published DevOps project fixture is required');
    const category = await prisma.category.findFirst({ where: { domain: 'DEVOPS' } });
    assert.ok(category, 'a DevOps category fixture is required');

    const tempProject = await prisma.project.create({
      data: {
        slug: `devops-engine-project-${suffix}`,
        title: 'DevOps Engine Secondary Project',
        domain: 'DEVOPS',
        summary: 'Temporary multi-project DevOps engine regression fixture',
        status: 'PUBLISHED',
        lifecycleStatus: 'COMPLETED',
        formatType: 'STANDARD',
        technologies: ['Terraform'],
        tags: ['devops-regression'],
        categoryId: category.id,
        publishedAt: new Date(),
      },
    });
    tempProjectId = tempProject.id;

    const normalizedState = {
      schemaVersion: 'devops.v1',
      overview: 'DevOps engine regression fixture',
      repository: { name: 'fixture-repo', branch: 'main', commitSha: 'abc1234', source: 'NORMALIZED_INPUT' },
      pipelines: [{
        id: 'delivery', name: 'Delivery', framework: 'Fixture CI', status: 'SUCCESS', source: 'NORMALIZED_INPUT',
        stages: [
          { id: 'build', name: 'Build', tool: 'BuildKit', status: 'SUCCESS', durationSeconds: 12, recordedOutput: 'Recorded build output', artifacts: ['image-ref'], source: 'NORMALIZED_INPUT' },
          { id: 'deploy', name: 'Deploy', tool: 'ArgoCD', status: 'SUCCESS', durationSeconds: 9, recordedOutput: 'Recorded sync output', artifacts: [], source: 'NORMALIZED_INPUT' },
        ],
      }],
      terraform: { present: true, workspace: 'test', backend: 'local', files: [{ name: 'main.tf', path: 'terraform/main.tf', type: 'FILE', size: null, content: 'terraform {}', source: 'NORMALIZED_INPUT' }], source: 'NORMALIZED_INPUT' },
      kubernetes: {
        clusters: [{ name: 'lab-cluster', version: '1.30', status: 'READY', provider: 'kind', source: 'RECORDED_SNAPSHOT' }],
        workloads: [{ kind: 'Deployment', namespace: 'default', name: 'api', desiredReplicas: 2, readyReplicas: 2, status: 'READY', image: 'example/api:test', source: 'RECORDED_SNAPSHOT' }],
      },
      gitops: [{ name: 'api', controller: 'ArgoCD', syncStatus: 'SYNCED', healthStatus: 'HEALTHY', revision: 'abc1234', destination: 'lab-cluster', source: 'RECORDED_SNAPSHOT' }],
      helm: [], networkPolicies: [],
      observability: [{ id: 'obs-1', name: 'Recorded rollout check', provider: 'Prometheus', status: 'PASS', summary: 'Fixture observation', recordedOutput: 'success', source: 'RECORDED_SNAPSHOT' }],
      architecture: [],
      provenance: { sourceType: 'CANONICAL_MANIFEST', notes: ['Regression fixture'] },
    };

    const labOne = await labService.create({
      slug: `devops-engine-a-${suffix}`, title: 'DevOps Engine Regression A', summary: 'Full DevOps regression fixture', domain: 'DEVOPS', kind: 'DEVOPS_PIPELINE', status: 'READY',
      projectId: canonicalProject.id, isInteractive: true, manifestVersion: '1.0', capabilities: ['pipeline', 'terraform', 'kubernetes', 'gitops', 'observability'], normalizedState,
    });
    labIds.push(labOne.id);
    await labService.createInput(labOne.id, { inputKey: 'pipeline', inputType: 'CI_PIPELINE', label: 'Pipeline', sourceKind: 'INLINE', schemaVersion: 'devops.input.v1', payload: {}, isPrimary: true, sortOrder: 0 });

    const draftLab = await labService.create({
      slug: `devops-engine-draft-${suffix}`, title: 'DevOps Draft Hidden', domain: 'DEVOPS', kind: 'DEVOPS_PIPELINE', status: 'DRAFT',
      projectId: canonicalProject.id, isInteractive: true, manifestVersion: '1.0', capabilities: ['pipeline'], normalizedState,
    });
    labIds.push(draftLab.id);
    await labService.createInput(draftLab.id, { inputKey: 'pipeline', inputType: 'CI_PIPELINE', label: 'Pipeline', sourceKind: 'INLINE', schemaVersion: 'devops.input.v1', payload: {}, isPrimary: true, sortOrder: 0 });

    const terraformOnlyState = {
      schemaVersion: 'devops.v1',
      overview: 'Terraform-only fixture',
      repository: { name: 'infra', branch: 'main', commitSha: 'def5678', source: 'NORMALIZED_INPUT' },
      pipelines: [],
      terraform: normalizedState.terraform,
      kubernetes: { clusters: [], workloads: [] },
      gitops: [], helm: [], networkPolicies: [], observability: [], architecture: [],
      provenance: { sourceType: 'CANONICAL_MANIFEST', notes: ['Terraform only'] },
    };
    const labTwo = await labService.create({
      slug: `devops-engine-b-${suffix}`, title: 'DevOps Engine Regression B', domain: 'DEVOPS', kind: 'DEVOPS_PIPELINE', status: 'READY',
      projectId: tempProject.id, isInteractive: true, manifestVersion: '1.0', capabilities: ['repository', 'terraform'], normalizedState: terraformOnlyState,
    });
    labIds.push(labTwo.id);
    await labService.createInput(labTwo.id, { inputKey: 'terraform', inputType: 'TERRAFORM', label: 'Terraform', sourceKind: 'INLINE', schemaVersion: 'devops.terraform.v1', payload: {}, isPrimary: true, sortOrder: 0 });

    const allLabs = await devOpsService.listPublic();
    assert.ok(allLabs.some((entry) => entry.slug === labOne.slug));
    assert.ok(allLabs.some((entry) => entry.slug === labTwo.slug), 'DevOps engine must support a second project without code changes');
    assert.ok(!allLabs.some((entry) => entry.slug === draftLab.slug), 'DRAFT DevOps Labs must remain private');

    const projectLabs = await devOpsService.listPublic(tempProject.slug);
    assert.ok(projectLabs.some((entry) => entry.slug === labTwo.slug));
    assert.ok(projectLabs.every((entry) => entry.project.slug === tempProject.slug));

    const state = await devOpsService.getPublic(labOne.slug);
    assert.equal(state.schemaVersion, 'devops.v1');
    assert.equal(state.repository?.commitSha, 'abc1234');
    assert.equal(state.pipelines[0]?.stages[0]?.tool, 'BuildKit');
    assert.equal(state.terraform?.files[0]?.path, 'terraform/main.tf');
    assert.equal(state.kubernetes.clusters[0]?.name, 'lab-cluster');
    assert.equal(state.kubernetes.workloads[0]?.readyReplicas, 2);
    assert.equal(state.gitops[0]?.syncStatus, 'SYNCED');
    assert.equal(state.observability[0]?.status, 'PASS');

    const pipeline = await devOpsService.getPipeline(labOne.slug, 'delivery');
    assert.equal(pipeline.stages.length, 2);
    await assert.rejects(() => devOpsService.getPipeline(labOne.slug, 'missing'), /DevOps pipeline not found/);

    const terraformOnly = await devOpsService.getPublic(labTwo.slug);
    assert.equal(terraformOnly.pipelines.length, 0);
    assert.equal(terraformOnly.kubernetes.clusters.length, 0);
    assert.ok(terraformOnly.terraform?.present);

    console.log('DevOps engine regression: PASS');
  } finally {
    for (const labId of labIds.reverse()) await prisma.lab.deleteMany({ where: { id: labId } });
    if (tempProjectId) await prisma.project.deleteMany({ where: { id: tempProjectId } });
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(`DevOps engine regression: FAIL (${error instanceof Error ? error.stack ?? error.message : String(error)})`);
  process.exitCode = 1;
});
