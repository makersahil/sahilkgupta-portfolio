import 'dotenv/config';
import assert from 'node:assert/strict';

import type { ScenarioDomainState } from '../services/scenarios/scenario-mutators.js';

const sessions = {
  networking: 'scenario-regression-net-0001',
  networkingConcurrency: 'scenario-regression-net-concurrency-0001',
  linux: 'scenario-regression-linux-0001',
  devops: 'scenario-regression-devops-0001',
};

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) throw new Error('DATABASE_URL is required for Scenario Engine regression');
  process.env.NODE_ENV = 'test';

  const [
    { scenarioEngineService, scenarioRuntimeRepository, applyScenarioActions, verifyScenarioActions },
    { networkingService, networkingOperationsService },
    { linuxService },
    { devOpsService },
    { unifiedCliService },
    { prisma },
  ] = await Promise.all([
    import('../services/scenarios/index.js'),
    import('../services/networking/index.js'),
    import('../services/linux/index.js'),
    import('../services/devops/index.js'),
    import('../services/cli/index.js'),
    import('../lib/prisma.js'),
  ]);

  async function assertPersistedScenarioActions(labId: string, baseline: ScenarioDomainState): Promise<void> {
    const rows = await prisma.labScenario.findMany({
      where: { labId, isEnabled: true },
      orderBy: [{ order: 'asc' }, { slug: 'asc' }],
      select: { slug: true, actions: true },
    });
    assert.ok(rows.length > 0, `expected enabled scenarios for lab ${labId}`);
    for (const row of rows) {
      assert.ok(row.actions, `${row.slug} must persist executable actions`);
      const simulated = applyScenarioActions(baseline, row.actions);
      const checks = verifyScenarioActions(simulated, row.actions);
      assert.ok(checks.length > 0, `${row.slug} must produce verification checks`);
      assert.equal(
        checks.every((entry) => entry.passed),
        true,
        `${row.slug} persisted actions must apply deterministically: ${checks.map((entry) => `${entry.id}=${entry.passed}`).join(', ')}`,
      );
    }
  }

  const cleanup: Array<{ labId: string; sessionKey: string }> = [];
  try {
    const networkingLab = (await networkingService.listPublic())[0];
    assert.ok(networkingLab, 'expected a public Networking Lab');
    cleanup.push({ labId: networkingLab.id, sessionKey: sessions.networking });
    cleanup.push({ labId: networkingLab.id, sessionKey: sessions.networkingConcurrency });
    await scenarioEngineService.reset(networkingLab.id, sessions.networking);
    await scenarioEngineService.reset(networkingLab.id, sessions.networkingConcurrency);

    const netBaseline = await networkingService.getPublic(networkingLab.id);
    await assertPersistedScenarioActions(networkingLab.id, netBaseline);
    const netLinkBefore = netBaseline.links.find((entry) => entry.key === 'isp1-r1')?.status;
    assert.notEqual(netLinkBefore, 'DOWN', 'canonical networking fixture should start without the injected link failure');

    const netStarted = await scenarioEngineService.run(networkingLab.id, sessions.networking, 'isp-failover');
    assert.equal(netStarted.runtime?.status, 'ACTIVE');
    const netSimulated = await networkingService.getPublic(networkingLab.id, sessions.networking);
    assert.equal(netSimulated.links.find((entry) => entry.key === 'isp1-r1')?.status, 'DOWN');
    assert.equal((await networkingService.getPublic(networkingLab.id)).links.find((entry) => entry.key === 'isp1-r1')?.status, netLinkBefore);
    const netStateVerified = await scenarioEngineService.verify(networkingLab.id, sessions.networking);
    assert.equal(netStateVerified.runtime?.verification?.phase, 'SCENARIO_STATE');
    assert.equal(netStateVerified.runtime?.verification?.passed, true);
    const netRemediated = await scenarioEngineService.remediate(networkingLab.id, sessions.networking);
    assert.equal(netRemediated.runtime?.status, 'REMEDIATED');
    assert.equal((await networkingService.getPublic(networkingLab.id, sessions.networking)).links.find((entry) => entry.key === 'isp1-r1')?.status, netLinkBefore);
    const netRecovered = await scenarioEngineService.verify(networkingLab.id, sessions.networking);
    assert.equal(netRecovered.runtime?.status, 'VERIFIED');
    assert.equal(netRecovered.runtime?.verification?.phase, 'RECOVERY');
    assert.equal(netRecovered.runtime?.verification?.passed, true);
    assert.equal((await scenarioEngineService.reset(networkingLab.id, sessions.networking)).runtime, null);

    await scenarioEngineService.run(networkingLab.id, sessions.networking, 'hsrp-gateway-failover');
    const hsrpState = await networkingService.getPublic(networkingLab.id, sessions.networking);
    assert.equal(hsrpState.devices.find((entry) => entry.key === 'r1')?.status, 'DOWN');
    const hsrpTrace = await networkingService.tracePath(networkingLab.id, 'isp1', 'sw_core', 'ICMP', sessions.networking);
    assert.equal(hsrpTrace.status, 'UNREACHABLE', 'core topology trace must not traverse a scenario-DOWN device');
    const hsrpAnalysis = await networkingOperationsService.analyzePath(networkingLab.id, 'isp1', 'sw_core', 'ICMP', sessions.networking);
    assert.equal(hsrpAnalysis.status, 'BLOCKED');
    assert.ok(hsrpAnalysis.blockers.some((entry) => entry.type === 'DEVICE_DOWN' && entry.key === 'r1'));
    const hsrpCli = await unifiedCliService.execute(
      'trace isp1 sw_core ICMP',
      `NETOPS/${networkingLab.slug}`,
      undefined,
      sessions.networking,
    );
    assert.equal(hsrpCli.exitCode, 1);
    assert.match(hsrpCli.output, /Status: BLOCKED/);
    assert.match(hsrpCli.output, /r1.*recorded DOWN/i);
    await scenarioEngineService.reset(networkingLab.id, sessions.networking);

    const concurrentScenarios = await prisma.labScenario.findMany({
      where: { labId: networkingLab.id, isEnabled: true },
      orderBy: { order: 'asc' },
      take: 2,
      select: { id: true, actions: true },
    });
    assert.equal(concurrentScenarios.length, 2, 'expected two scenarios for concurrency regression');
    const [firstConcurrent, secondConcurrent] = await Promise.all([
      scenarioRuntimeRepository.createActive(
        sessions.networkingConcurrency,
        networkingLab.id,
        concurrentScenarios[0]!.id,
        concurrentScenarios[0]!.actions,
      ),
      scenarioRuntimeRepository.createActive(
        sessions.networkingConcurrency,
        networkingLab.id,
        concurrentScenarios[1]!.id,
        concurrentScenarios[1]!.actions,
      ),
    ]);
    assert.equal(
      [firstConcurrent, secondConcurrent].filter(Boolean).length,
      1,
      'unique session+lab runtime creation must allow exactly one concurrent winner',
    );
    assert.ok(await scenarioRuntimeRepository.find(sessions.networkingConcurrency, networkingLab.id));
    await scenarioEngineService.reset(networkingLab.id, sessions.networkingConcurrency);

    const linuxLab = (await linuxService.listPublic())[0];
    assert.ok(linuxLab, 'expected a public Linux Lab');
    cleanup.push({ labId: linuxLab.id, sessionKey: sessions.linux });
    await scenarioEngineService.reset(linuxLab.id, sessions.linux);
    const linuxBaseline = await linuxService.getPublic(linuxLab.id);
    await assertPersistedScenarioActions(linuxLab.id, linuxBaseline);
    const baselineHost = linuxBaseline.hosts.find((entry) => entry.key === 'rhel9-lab-01');
    assert.ok(baselineHost, 'expected canonical RHEL host');
    const serviceBefore = baselineHost.services.find((entry) => entry.unit === 'sshd.service')?.activeState;
    assert.notEqual(serviceBefore, 'FAILED', 'canonical Linux fixture should start without the service scenario');
    await scenarioEngineService.run(linuxLab.id, sessions.linux, 'service-failure');
    const linuxSimulated = await linuxService.getPublic(linuxLab.id, sessions.linux);
    assert.equal(linuxSimulated.hosts.find((entry) => entry.key === 'rhel9-lab-01')?.services.find((entry) => entry.unit === 'sshd.service')?.activeState, 'FAILED');
    assert.equal((await linuxService.getPublic(linuxLab.id)).hosts.find((entry) => entry.key === 'rhel9-lab-01')?.services.find((entry) => entry.unit === 'sshd.service')?.activeState, serviceBefore);
    assert.equal((await scenarioEngineService.verify(linuxLab.id, sessions.linux)).runtime?.verification?.passed, true);
    await scenarioEngineService.remediate(linuxLab.id, sessions.linux);
    assert.equal((await linuxService.getPublic(linuxLab.id, sessions.linux)).hosts.find((entry) => entry.key === 'rhel9-lab-01')?.services.find((entry) => entry.unit === 'sshd.service')?.activeState, serviceBefore);
    assert.equal((await scenarioEngineService.verify(linuxLab.id, sessions.linux)).runtime?.status, 'VERIFIED');
    await scenarioEngineService.reset(linuxLab.id, sessions.linux);

    const devOpsLab = (await devOpsService.listPublic())[0];
    assert.ok(devOpsLab, 'expected a public DevOps Lab');
    cleanup.push({ labId: devOpsLab.id, sessionKey: sessions.devops });
    await scenarioEngineService.reset(devOpsLab.id, sessions.devops);
    const devOpsBaseline = await devOpsService.getPublic(devOpsLab.id);
    await assertPersistedScenarioActions(devOpsLab.id, devOpsBaseline);

    const targetWorkload = devOpsBaseline.kubernetes.workloads.find((entry) => entry.name === 'core-api' && entry.namespace === null);
    const targetApp = devOpsBaseline.gitops.find((entry) => entry.name === 'recorded-argocd-reconciliation');
    const targetObservation = devOpsBaseline.observability.find((entry) => entry.id === 'observation-stage-6');
    const targetPolicy = devOpsBaseline.networkPolicies.find((entry) => entry.name === 'recorded-cilium-network-policies' && entry.namespace === null);
    assert.ok(targetWorkload && targetApp && targetObservation && targetPolicy, 'expected deterministic DevOps scenario targets in canonical fixture');

    const selectorFixture = structuredClone(devOpsBaseline);
    selectorFixture.kubernetes.workloads.push({ ...targetWorkload, name: 'decoy-api', readyReplicas: targetWorkload.readyReplicas });
    selectorFixture.gitops.push({ ...targetApp, name: 'decoy-argocd-app' });
    selectorFixture.observability.push({ ...targetObservation, id: 'observation-decoy', name: 'Decoy observation' });
    selectorFixture.networkPolicies.push({ ...targetPolicy, name: 'decoy-cilium-policy' });
    const selectorResult = applyScenarioActions(selectorFixture, {
      mutations: [
        { type: 'SET_WORKLOAD_READINESS', name: 'core-api', namespace: null, readyReplicas: 0, status: 'DEGRADED' },
        { type: 'SET_GITOPS_SYNC_STATUS', appName: 'recorded-argocd-reconciliation', syncStatus: 'OUT_OF_SYNC' },
        { type: 'SET_OBSERVATION_STATUS', observationId: 'observation-stage-6', status: 'FAIL' },
        { type: 'SET_NETWORK_POLICY_STATUS', policyName: 'recorded-cilium-network-policies', namespace: null, status: 'UNKNOWN' },
      ],
    });
    assert.equal(selectorResult.kubernetes.workloads.find((entry) => entry.name === 'core-api')?.readyReplicas, 0);
    assert.equal(selectorResult.kubernetes.workloads.find((entry) => entry.name === 'decoy-api')?.readyReplicas, targetWorkload.readyReplicas);
    assert.equal(selectorResult.gitops.find((entry) => entry.name === 'recorded-argocd-reconciliation')?.syncStatus, 'OUT_OF_SYNC');
    assert.equal(selectorResult.gitops.find((entry) => entry.name === 'decoy-argocd-app')?.syncStatus, targetApp.syncStatus);
    assert.equal(selectorResult.observability.find((entry) => entry.id === 'observation-stage-6')?.status, 'FAIL');
    assert.equal(selectorResult.observability.find((entry) => entry.id === 'observation-decoy')?.status, targetObservation.status);
    assert.equal(selectorResult.networkPolicies.find((entry) => entry.name === 'recorded-cilium-network-policies')?.status, 'UNKNOWN');
    assert.equal(selectorResult.networkPolicies.find((entry) => entry.name === 'decoy-cilium-policy')?.status, targetPolicy.status);
    assert.throws(
      () => applyScenarioActions(devOpsBaseline, { mutations: [{ type: 'SET_WORKLOAD_READINESS', namespace: null, readyReplicas: 0, status: 'DEGRADED' }] }),
      /requires name/i,
    );
    assert.throws(
      () => applyScenarioActions(devOpsBaseline, { mutations: [{ type: 'SET_NETWORK_POLICY_STATUS', policyName: 'recorded-cilium-network-policies', status: 'UNKNOWN' }] }),
      /requires namespace/i,
    );

    const stageBefore = devOpsBaseline.pipelines.find((entry) => entry.id === 'delivery')?.stages.find((entry) => entry.id === 'stage-3')?.status;
    assert.notEqual(stageBefore, 'FAILED', 'canonical DevOps fixture should start without the pipeline scenario');
    await scenarioEngineService.run(devOpsLab.id, sessions.devops, 'pipeline-failure');
    const devOpsSimulated = await devOpsService.getPublic(devOpsLab.id, sessions.devops);
    assert.equal(devOpsSimulated.pipelines.find((entry) => entry.id === 'delivery')?.stages.find((entry) => entry.id === 'stage-3')?.status, 'FAILED');
    assert.equal((await devOpsService.getPublic(devOpsLab.id)).pipelines.find((entry) => entry.id === 'delivery')?.stages.find((entry) => entry.id === 'stage-3')?.status, stageBefore);
    assert.equal((await scenarioEngineService.verify(devOpsLab.id, sessions.devops)).runtime?.verification?.passed, true);
    await scenarioEngineService.remediate(devOpsLab.id, sessions.devops);
    assert.equal((await devOpsService.getPublic(devOpsLab.id, sessions.devops)).pipelines.find((entry) => entry.id === 'delivery')?.stages.find((entry) => entry.id === 'stage-3')?.status, stageBefore);
    assert.equal((await scenarioEngineService.verify(devOpsLab.id, sessions.devops)).runtime?.status, 'VERIFIED');
    assert.equal((await scenarioEngineService.reset(devOpsLab.id, sessions.devops)).runtime, null);

    console.log('Scenario Engine regression: PASS');
  } finally {
    for (const item of cleanup) await scenarioEngineService.reset(item.labId, item.sessionKey).catch(() => undefined);
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(`Scenario Engine regression: FAIL (${error instanceof Error ? error.stack ?? error.message : String(error)})`);
  process.exitCode = 1;
});
