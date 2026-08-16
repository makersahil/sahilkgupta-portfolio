import 'dotenv/config';
import assert from 'node:assert/strict';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) throw new Error('DATABASE_URL is required for Unified CLI regression');
  process.env.NODE_ENV = 'test';

  const [{ unifiedCliService }, { networkingService }, { linuxService }, { devOpsService }, { prisma }] = await Promise.all([
    import('../services/cli/index.js'),
    import('../services/networking/index.js'),
    import('../services/linux/index.js'),
    import('../services/devops/index.js'),
    import('../lib/prisma.js'),
  ]);

  try {
    const root = await unifiedCliService.bootstrap();
    assert.equal(root.schemaVersion, 'cli.v1');
    assert.equal(root.context.domain, 'PORTFOLIO');
    assert.ok(root.contexts.some((entry) => entry.domain === 'NETWORKING'));
    assert.ok(root.contexts.some((entry) => entry.domain === 'LINUX'));
    assert.ok(root.contexts.some((entry) => entry.domain === 'DEVOPS'));

    const networking = await unifiedCliService.bootstrap('networking');
    assert.equal(networking.context.domain, 'NETWORKING');
    assert.match(networking.context.contextId, /^NETOPS\//);
    assert.equal(networking.context.mutable, false);
    assert.equal(networking.context.executionMode, 'RECORDED_STATE');

    const targets = await unifiedCliService.execute('ctx targets', networking.context.contextId);
    assert.equal(targets.exitCode, 0);
    assert.match(targets.output, /DEVICE|KEY/i);

    const networkState = await networkingService.getPublic(networking.context.lab!.id);
    if (networkState.devices.length >= 2) {
      const source = networkState.devices[0]!.key;
      const target = networkState.devices[1]!.key;
      const trace = await unifiedCliService.execute(`trace ${source} ${target}`, networking.context.contextId);
      assert.ok([0, 1].includes(trace.exitCode));
      assert.match(trace.output, /Status:/);
      assert.doesNotMatch(trace.output, /\bms\b|packet loss|icmp_seq/i, 'recorded-state trace must not invent live latency');

      const deviceContext = await unifiedCliService.execute(`ctx target ${source}`, networking.context.contextId);
      assert.equal(deviceContext.context.scope, 'DEVICE');
      assert.equal(deviceContext.context.target?.key, source);
      assert.match(deviceContext.context.contextId, /^NETOPS\/[^/]+\/[^/]+$/, 'device CLI context must retain its Lab segment');
      const legacyConfig = await unifiedCliService.execute('cisco show run', deviceContext.context.contextId);
      assert.equal(legacyConfig.exitCode, 0);
      assert.match(legacyConfig.output, /Recorded configuration excerpt|none/);
    }

    const ping = await unifiedCliService.execute('ping 1.1.1.1', networking.context.contextId);
    assert.equal(ping.exitCode, 2);
    assert.match(ping.output, /disabled/i);
    assert.doesNotMatch(ping.output, /packet loss|time=/i);

    const linux = await unifiedCliService.bootstrap('linux');
    assert.equal(linux.context.domain, 'LINUX');
    assert.match(linux.context.contextId, /^RHEL\//);
    const selinux = await unifiedCliService.execute('sestatus', linux.context.contextId);
    assert.equal(selinux.exitCode, 0);
    assert.match(selinux.output, /mode=/i);
    const linuxState = await linuxService.getPublic(linux.context.lab!.id);
    if (linuxState.hosts.length) {
      const hostContext = await unifiedCliService.execute(`ctx target ${linuxState.hosts[0]!.key}`, linux.context.contextId);
      assert.equal(hostContext.context.scope, 'HOST');
      assert.match(hostContext.context.contextId, /^RHEL\/[^/]+\/[^/]+$/, 'host CLI context must retain its Lab segment');
      const hostInspect = await unifiedCliService.execute('show host', hostContext.context.contextId);
      assert.equal(hostInspect.exitCode, 0);
      assert.ok(hostInspect.output.includes(linuxState.hosts[0]!.hostname));
    }
    const blockedSystemctl = await unifiedCliService.execute('systemctl restart sshd', linux.context.contextId);
    assert.equal(blockedSystemctl.exitCode, 126);
    assert.match(blockedSystemctl.output, /disabled/i);

    const devops = await unifiedCliService.bootstrap('devops');
    assert.equal(devops.context.domain, 'DEVOPS');
    assert.match(devops.context.contextId, /^GITOPS\//);
    const pipelines = await unifiedCliService.execute('show pipelines', devops.context.contextId);
    assert.equal(pipelines.exitCode, 0);
    const devopsState = await devOpsService.getPublic(devops.context.lab!.id);
    if (devopsState.pipelines.length) {
      const pipelineContext = await unifiedCliService.execute(`ctx target ${devopsState.pipelines[0]!.id}`, devops.context.contextId);
      assert.equal(pipelineContext.context.scope, 'PIPELINE');
      assert.match(pipelineContext.context.contextId, /^GITOPS\/[^/]+\/[^/]+$/, 'pipeline CLI context must retain its Lab segment');
      const pipelineInspect = await unifiedCliService.execute('show pipelines', pipelineContext.context.contextId);
      assert.equal(pipelineInspect.exitCode, 0);
    }
    const terraform = await unifiedCliService.execute('terraform plan', devops.context.contextId);
    assert.equal(terraform.exitCode, 0);
    assert.match(terraform.output, /not executed now|not represented|Drift:/i);

    const scenarios = await unifiedCliService.execute('scenario list', devops.context.contextId);
    assert.equal(scenarios.exitCode, 0);
    const runScenario = await unifiedCliService.execute('scenario run pipeline-failure', devops.context.contextId);
    assert.equal(runScenario.exitCode, 2);
    assert.match(runScenario.output, /Phase 7/);

    const contextList = await unifiedCliService.execute('ctx list', devops.context.contextId);
    assert.equal(contextList.exitCode, 0);
    assert.match(contextList.output, /NETOPS\//);
    assert.match(contextList.output, /RHEL\//);
    assert.match(contextList.output, /GITOPS\//);

    const toRoot = await unifiedCliService.execute('ctx root', devops.context.contextId);
    assert.equal(toRoot.context.domain, 'PORTFOLIO');
    assert.equal(toRoot.contextChanged, true);

    console.log('Unified CLI regression: PASS');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(`Unified CLI regression: FAIL (${error instanceof Error ? error.stack ?? error.message : String(error)})`);
  process.exitCode = 1;
});
