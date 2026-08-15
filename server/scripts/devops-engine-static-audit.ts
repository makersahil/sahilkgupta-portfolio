import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const text = (path: string) => readFile(resolve(ROOT, path), 'utf8');

async function assertMissing(path: string): Promise<void> {
  try {
    await access(resolve(ROOT, path), constants.F_OK);
  } catch {
    return;
  }
  assert.fail(`${path} must be removed after the Dynamic DevOps Engine replaces the static visualizer`);
}

async function main(): Promise<void> {
  await assertMissing('src/components/DevOpsPipelineVisualizer.tsx');

  const [workspace, explorer, route, service, adapter, seed, apiClient, packageJsonText, serverEntry, architecture] = await Promise.all([
    text('src/components/DomainWorkspace.tsx'),
    text('src/components/devops/DevOpsLabExplorer.tsx'),
    text('server/routes/devops.routes.ts'),
    text('server/services/devops/devops.service.ts'),
    text('server/services/devops/devops-lab-adapter.ts'),
    text('prisma/seed.ts'),
    text('src/lib/api.ts'),
    text('package.json'),
    text('server.ts'),
    text('docs/DEVOPS_ENGINE_ARCHITECTURE.md'),
  ]);

  assert.match(workspace, /DevOpsLabExplorer/);
  assert.doesNotMatch(workspace, /DevOpsPipelineVisualizer/);
  assert.match(explorer, /getDevOpsLabs/);
  assert.match(explorer, /Only modules actually represented/i);
  assert.match(explorer, /Terraform \/ IaC snapshot/i);
  assert.match(explorer, /No Kubernetes cluster snapshot is attached/i);
  assert.match(explorer, /Live metrics are not fabricated/i);
  assert.doesNotMatch(explorer, /triggerPipeline|setTimeout\(|Math\.random|gitops-k8s-cluster|proj-k8s/i);

  assert.match(route, /devOpsService/);
  assert.match(route, /\/labs\/\:identifier\/pipelines\/\:pipelineId/);
  assert.doesNotMatch(route, /PrismaClient|prisma\.|MockDatabaseService|dbService|child_process/);

  assert.match(service, /LabManifestService/);
  assert.match(service, /DevOpsLabAdapter/);
  assert.match(service, /domain:\s*DEVOPS_DOMAIN/);
  assert.match(service, /kind:\s*DEVOPS_KIND/);
  assert.doesNotMatch(service, /gitops-k8s-cluster|proj-k8s/);

  assert.match(adapter, /schemaVersion:\s*'devops\.v1'/);
  assert.match(adapter, /normalizePipelines/);
  assert.match(adapter, /normalizeTerraform/);
  assert.match(adapter, /normalizeClusters/);
  assert.match(adapter, /normalizeGitOps/);
  assert.match(adapter, /No observability snapshot is attached/i);
  assert.doesNotMatch(adapter, /gitops-k8s-cluster|proj-k8s|Math\.random/);

  assert.match(apiClient, /getDevOpsLabs/);
  assert.match(apiClient, /getDevOpsLab/);
  assert.match(apiClient, /getDevOpsPipeline/);

  assert.match(seed, /schemaVersion:\s*'devops\.v1'/);
  assert.match(seed, /devOpsFixture/);
  assert.match(seed, /inputType:\s*'TERRAFORM'/);
  assert.match(seed, /inputType:\s*'KUBERNETES_MANIFEST'/);
  assert.match(seed, /inputType:\s*'ARGOCD'/);
  assert.match(seed, /inputType:\s*'CILIUM_POLICY'/);
  assert.match(seed, /inputType:\s*'OBSERVABILITY_SNAPSHOT'/);
  assert.match(seed, /not live production telemetry/i);
  assert.match(serverEntry, /\/api\/devops/);

  const packageJson = JSON.parse(packageJsonText) as { scripts?: Record<string, string> };
  assert.ok(packageJson.scripts?.['test:devops:static']);
  assert.ok(packageJson.scripts?.['test:devops']);
  assert.ok(packageJson.scripts?.['test:devops:http']);

  assert.match(architecture, /multi-project/i);
  assert.match(architecture, /devops\.v1/i);
  assert.match(architecture, /recorded state/i);
  assert.match(architecture, /Phase 5A/i);
  assert.match(architecture, /Phase 5B/i);

  console.log('DevOps engine static audit: PASS');
}

main().catch((error: unknown) => {
  console.error(`DevOps engine static audit: FAIL (${error instanceof Error ? `${error.name}: ${error.message}` : String(error)})`);
  process.exitCode = 1;
});
