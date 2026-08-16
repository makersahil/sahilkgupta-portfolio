import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function main(): Promise<void> {
  const [schema, migration, engine, mutators, stateService, routes, server, api, panel, cli, seed, repository] = await Promise.all([
    readFile('prisma/schema.prisma', 'utf8'),
    readFile('prisma/migrations/20260816020000_phase_7_scenario_runtime/migration.sql', 'utf8'),
    readFile('server/services/scenarios/scenario-engine.service.ts', 'utf8'),
    readFile('server/services/scenarios/scenario-mutators.ts', 'utf8'),
    readFile('server/services/scenarios/scenario-state.service.ts', 'utf8'),
    readFile('server/routes/scenario.routes.ts', 'utf8'),
    readFile('server.ts', 'utf8'),
    readFile('src/lib/api.ts', 'utf8'),
    readFile('src/components/scenarios/ScenarioControlPanel.tsx', 'utf8'),
    readFile('server/services/cli/unified-cli.service.ts', 'utf8'),
    readFile('prisma/seed.ts', 'utf8'),
    readFile('server/repositories/prisma/scenario-runtime.repository.ts', 'utf8'),
  ]);

  assert.match(schema, /model LabScenarioRuntime/);
  assert.match(schema, /@@unique\(\[sessionKey, labId\]\)/);
  assert.match(schema, /ScenarioRuntimeStatus/);
  assert.match(migration, /CREATE TABLE "LabScenarioRuntime"/);
  assert.match(migration, /LabScenarioRuntime_sessionKey_labId_key/);

  assert.match(engine, /applyScenarioActions\(baseline, scenario\.actions\)/);
  assert.match(engine, /SESSION_SCOPED_SIMULATION/);
  assert.match(engine, /canonicalStateMutable: false/);
  assert.match(engine, /Reset the existing .* scenario runtime before starting another scenario/);
  assert.match(engine, /deleteExpired/);
  assert.match(repository, /updatedAt: \{ lt: before \}/);
  assert.match(repository, /labScenarioRuntime\.create\(/);
  assert.match(repository, /code === 'P2002'/);
  assert.doesNotMatch(repository, /labScenarioRuntime\.upsert\(/);
  assert.match(stateService, /runtime\.status !== 'ACTIVE'/);
  assert.doesNotMatch(engine, /normalizedState\s*:/);
  assert.doesNotMatch(engine, /labs\.update|updateLab|prisma\.lab\.update/);

  assert.match(seed, /pipelineId: 'delivery', stageId: 'stage-3', status: 'FAILED'/);
  assert.match(seed, /linkKey: 'isp1-r1', status: 'DOWN'/);
  assert.match(seed, /hostKey: 'rhel9-lab-01', unit: 'sshd.service', activeState: 'FAILED'/);
  assert.match(seed, /SET_WORKLOAD_READINESS', name: 'core-api', namespace: null/);
  assert.match(seed, /SET_GITOPS_SYNC_STATUS', appName: 'recorded-argocd-reconciliation'/);
  assert.match(seed, /SET_OBSERVATION_STATUS', observationId: 'observation-stage-6'/);
  assert.match(seed, /SET_NETWORK_POLICY_STATUS', policyName: 'recorded-cilium-network-policies', namespace: null/);
  assert.match(mutators, /const workloadName = text\(mutation\.name, 'name'\)/);
  assert.match(mutators, /const appName = text\(mutation\.appName, 'appName'\)/);
  assert.match(mutators, /const observationId = text\(mutation\.observationId, 'observationId'\)/);
  assert.match(mutators, /const policyName = text\(mutation\.policyName, 'policyName'\)/);
  assert.match(mutators, /requiredNamespace\(mutation\)/);

  for (const action of [
    'SET_LINK_STATUS',
    'SET_OSPF_NEIGHBOR_STATE',
    'SET_DEVICE_STATUS',
    'SELECT_ACL_OBSERVATION',
    'SET_SERVICE_STATE',
    'ADD_RECORDED_AVC_DENIAL',
    'SET_MOUNT_STATE',
    'SET_INTERFACE_STATE',
    'SET_PIPELINE_STAGE_STATUS',
    'SET_TERRAFORM_DRIFT_STATUS',
    'SET_WORKLOAD_READINESS',
    'SET_GITOPS_SYNC_STATUS',
    'SET_OBSERVATION_STATUS',
    'SET_NETWORK_POLICY_STATUS',
  ]) assert.match(mutators, new RegExp(action));

  const runtimeCode = [engine, mutators, stateService, routes].join('\n');
  assert.doesNotMatch(runtimeCode, /node:child_process|child_process|spawn\s*\(|execFile\s*\(|execSync\s*\(|ssh2|node-ssh/);
  assert.doesNotMatch(runtimeCode, /\.apply\s*\(.*terraform|kubectl\s+apply|helm\s+(install|upgrade)|argocd\s+app\s+sync/i);

  assert.match(routes, /requireScenarioSession/);
  assert.match(routes, /\/run/);
  assert.match(routes, /\/verify/);
  assert.match(routes, /\/remediate/);
  assert.match(routes, /\/runtime/);
  assert.match(server, /app\.use\('\/api\/scenarios', scenarioRoutes\)/);

  assert.match(api, /X-Lab-Session/);
  assert.match(api, /sessionStorage/);
  assert.match(api, /runScenario/);
  assert.match(api, /verifyScenario/);
  assert.match(api, /remediateScenario/);
  assert.match(api, /resetScenario/);
  assert.match(panel, /Start scenario/);
  assert.match(panel, /browser session only/i);
  assert.doesNotMatch(panel, /Run fault|Phase 7 Scenario Runtime/);
  assert.match(panel, /never executes infrastructure commands/i);

  assert.match(cli, /scenario run <slug>/);
  assert.match(cli, /scenario verify/);
  assert.match(cli, /scenario remediate/);
  assert.match(cli, /scenario reset/);
  assert.match(cli, /SCENARIO_RUNTIME/);
  assert.match(engine, /SCENARIO_STATE/);
  assert.match(engine, /createActive/);

  console.log('Scenario Engine static audit: PASS');
}

main().catch((error: unknown) => {
  console.error(`Scenario Engine static audit: FAIL (${error instanceof Error ? error.stack ?? error.message : String(error)})`);
  process.exitCode = 1;
});
