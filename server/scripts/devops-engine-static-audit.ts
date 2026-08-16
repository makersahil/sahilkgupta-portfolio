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
  await assertMissing('server/scripts/verify-phase5a-resume.ts');

  const [
    workspace,
    explorer,
    operationsPanel,
    route,
    service,
    operationsService,
    adapter,
    seed,
    apiClient,
    packageJsonText,
    serverEntry,
    architecture,
  ] = await Promise.all([
    text('src/components/DomainWorkspace.tsx'),
    text('src/components/devops/DevOpsLabExplorer.tsx'),
    text('src/components/devops/DevOpsOperationsPanel.tsx'),
    text('server/routes/devops.routes.ts'),
    text('server/services/devops/devops.service.ts'),
    text('server/services/devops/devops-operations.service.ts'),
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
  assert.match(explorer, /DevOpsOperationsPanel/);
  assert.match(explorer, /Only modules actually represented/i);
  assert.match(explorer, /Terraform \/ IaC snapshot/i);
  assert.match(explorer, /No Kubernetes cluster snapshot is attached/i);
  assert.match(explorer, /Live metrics are not fabricated/i);
  assert.doesNotMatch(explorer, /triggerPipeline|setTimeout\(|Math\.random|gitops-k8s-cluster|proj-k8s/i);

  assert.match(operationsPanel, /getDevOpsOperations/);
  assert.match(operationsPanel, /getDevOpsContext/);
  assert.match(operationsPanel, /Recorded-state health/i);
  assert.match(operationsPanel, /Scenario-ready definitions/i);
  assert.match(operationsPanel, /Unified CLI prompt/i);
  assert.match(operationsPanel, /session runnable/i);
  assert.match(operationsPanel, /shared Scenario Engine/i);
  assert.match(operationsPanel, /External provider execution remains disabled/i);
  assert.doesNotMatch(operationsPanel, /Future CLI prompt|command execution remains Phase 6|Scenario run, remediation and reset remain Phase 7/i);
  assert.doesNotMatch(operationsPanel, /child_process|spawn\(|exec\(|setTimeout\(|Math\.random/i);

  assert.match(route, /devOpsService/);
  assert.match(route, /devOpsOperationsService/);
  assert.match(route, /\/labs\/\:identifier\/pipelines\/\:pipelineId/);
  assert.match(route, /\/labs\/\:identifier\/operations/);
  assert.match(route, /\/labs\/\:identifier\/context/);
  assert.doesNotMatch(route, /PrismaClient|prisma\.|MockDatabaseService|dbService|child_process/);

  assert.match(service, /LabManifestService/);
  assert.match(service, /DevOpsLabAdapter/);
  assert.match(service, /domain:\s*DEVOPS_DOMAIN/);
  assert.match(service, /kind:\s*DEVOPS_KIND/);
  assert.doesNotMatch(service, /gitops-k8s-cluster|proj-k8s/);

  assert.match(operationsService, /class DevOpsOperationsService/);
  assert.match(operationsService, /schemaVersion:\s*'devops\.operations\.v1'/);
  assert.match(operationsService, /moduleRepresented/);
  assert.match(operationsService, /RECORDED_STATE_DIAGNOSTIC/);
  assert.match(operationsService, /GITOPS\//);
  assert.match(operationsService, /executionAvailable:\s*false/);
  assert.match(operationsService, /Unified contextual command execution is implemented in Phase 6/i);
  assert.doesNotMatch(operationsService, /PrismaClient|prisma\.|child_process|spawn\(|exec\(|setTimeout\(|Math\.random/i);

  assert.match(adapter, /schemaVersion:\s*'devops\.v1'/);
  assert.match(adapter, /normalizePipelines/);
  assert.match(adapter, /normalizeTerraform/);
  assert.match(adapter, /driftStatus/);
  assert.match(adapter, /normalizeClusters/);
  assert.match(adapter, /normalizeGitOps/);
  assert.match(adapter, /No observability snapshot is attached/i);
  assert.doesNotMatch(adapter, /gitops-k8s-cluster|proj-k8s|Math\.random/);

  assert.match(apiClient, /getDevOpsLabs/);
  assert.match(apiClient, /getDevOpsLab/);
  assert.match(apiClient, /getDevOpsPipeline/);
  assert.match(apiClient, /getDevOpsOperations/);
  assert.match(apiClient, /getDevOpsContext/);

  assert.match(seed, /schemaVersion:\s*'devops\.v1'/);
  assert.match(seed, /devOpsFixture/);
  assert.match(seed, /devOpsScenarioDefinitions/);
  assert.match(seed, /pipeline-failure/);
  assert.match(seed, /terraform-drift/);
  assert.match(seed, /kubernetes-rollout-failure/);
  assert.match(seed, /argocd-drift/);
  assert.match(seed, /canary-failure/);
  assert.match(seed, /cilium-policy-regression/);
  assert.match(seed, /inputType:\s*'TERRAFORM'/);
  assert.match(seed, /inputType:\s*'KUBERNETES_MANIFEST'/);
  assert.match(seed, /inputType:\s*'ARGOCD'/);
  assert.match(seed, /inputType:\s*'CILIUM_POLICY'/);
  assert.match(seed, /inputType:\s*'OBSERVABILITY_SNAPSHOT'/);
  assert.match(seed, /not live production telemetry/i);
  assert.match(seed, /does not execute pipelines, Terraform, kubectl, Helm, ArgoCD, Cilium, or cloud commands/i);
  assert.match(serverEntry, /\/api\/devops/);

  const packageJson = JSON.parse(packageJsonText) as { scripts?: Record<string, string> };
  assert.ok(packageJson.scripts?.['test:devops:static']);
  assert.ok(packageJson.scripts?.['test:devops']);
  assert.ok(packageJson.scripts?.['test:devops:http']);
  assert.ok(packageJson.scripts?.['test:devops:operations']);
  assert.ok(packageJson.scripts?.['test:devops:operations:http']);

  assert.match(architecture, /multi-project/i);
  assert.match(architecture, /devops\.v1/i);
  assert.match(architecture, /devops\.operations\.v1/i);
  assert.match(architecture, /recorded state/i);
  assert.match(architecture, /GITOPS\//i);
  assert.match(architecture, /Phase 5A/i);
  assert.match(architecture, /Phase 5B/i);
  assert.match(architecture, /Phase 6/i);
  assert.match(architecture, /Phase 7/i);

  console.log('DevOps engine static audit: PASS');
}

main().catch((error: unknown) => {
  console.error(`DevOps engine static audit: FAIL (${error instanceof Error ? `${error.name}: ${error.message}` : String(error)})`);
  process.exitCode = 1;
});
