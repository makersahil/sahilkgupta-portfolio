import 'dotenv/config';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

const sessionKey = 'cli-http-regression-0001';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) throw new Error('DATABASE_URL is required for Unified CLI HTTP regression');
  process.env.NODE_ENV = 'test';

  const [{ default: express }, { default: terminalRoutes }, { errorHandler }, { scenarioEngineService }, { prisma }] = await Promise.all([
    import('express'),
    import('../routes/terminal.routes.js'),
    import('../middlewares/error.middleware.js'),
    import('../services/scenarios/index.js'),
    import('../lib/prisma.js'),
  ]);

  let server: Server | null = null;
  let labId: string | null = null;
  try {
    const app = express();
    app.use(express.json({ limit: '1mb' }));
    app.use('/api/terminal', terminalRoutes);
    app.use('/api', errorHandler);
    server = await new Promise<Server>((resolve, reject) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
      listener.once('error', reject);
    });
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const sessionHeaders = { 'Content-Type': 'application/json', 'X-Lab-Session': sessionKey };

    const bootstrapResponse = await fetch(`${baseUrl}/api/terminal/bootstrap?category=networking`, { headers: { 'X-Lab-Session': sessionKey } });
    assert.equal(bootstrapResponse.status, 200);
    const bootstrap = await bootstrapResponse.json() as Record<string, any>;
    assert.equal(bootstrap.success, true);
    assert.equal(bootstrap.data.schemaVersion, 'cli.v1');
    assert.equal(bootstrap.data.context.domain, 'NETWORKING');
    assert.match(bootstrap.data.context.prompt, /^NETOPS\//);
    assert.equal(bootstrap.data.context.mutable, true);
    labId = bootstrap.data.context.lab.id as string;
    await scenarioEngineService.reset(labId, sessionKey);
    const contextId = bootstrap.data.context.contextId as string;

    async function exec(command: string, ctx = contextId): Promise<Record<string, any>> {
      const response = await fetch(`${baseUrl}/api/terminal/exec`, {
        method: 'POST',
        headers: sessionHeaders,
        body: JSON.stringify({ command, contextId: ctx }),
      });
      assert.equal(response.status, 200, command);
      return await response.json() as Record<string, any>;
    }

    const health = await exec('show health');
    assert.equal(health.schemaVersion, 'cli.v1');
    assert.equal(health.exitCode, 0);
    assert.equal(health.context.contextId, contextId);
    assert.equal(health.context.mutable, true);
    assert.equal(health.context.executionMode, 'RECORDED_STATE');

    const fakePing = await exec('ping 8.8.8.8');
    assert.equal(fakePing.exitCode, 2);
    assert.match(fakePing.output, /disabled/i);
    assert.doesNotMatch(fakePing.output, /packet loss|time=/i);

    const listScenarios = await exec('scenario list');
    assert.equal(listScenarios.exitCode, 0);
    assert.match(listScenarios.output, /isp-failover/i);

    const scenarioRun = await exec('scenario run isp-failover');
    assert.equal(scenarioRun.exitCode, 0);
    assert.equal(scenarioRun.context.executionMode, 'SCENARIO_RUNTIME');
    assert.match(scenarioRun.output, /Scenario started/i);

    const scenarioVerify = await exec('scenario verify');
    assert.equal(scenarioVerify.exitCode, 0);
    assert.match(scenarioVerify.output, /PASS \[SCENARIO_STATE\]/);

    const scenarioRemediate = await exec('scenario remediate');
    assert.equal(scenarioRemediate.exitCode, 0);
    assert.equal(scenarioRemediate.context.executionMode, 'RECORDED_STATE');

    const recoveryVerify = await exec('scenario verify');
    assert.equal(recoveryVerify.exitCode, 0);
    assert.match(recoveryVerify.output, /PASS \[RECOVERY\]/);

    const scenarioReset = await exec('scenario reset');
    assert.equal(scenarioReset.exitCode, 0);
    assert.match(scenarioReset.output, /runtime reset/i);

    const root = await exec('ctx root');
    assert.equal(root.context.domain, 'PORTFOLIO');
    assert.equal(root.contextChanged, true);

    const list = await exec('ctx list', 'PORTFOLIO');
    assert.equal(list.exitCode, 0);
    assert.match(list.output, /NETOPS\//);
    assert.match(list.output, /RHEL\//);
    assert.match(list.output, /GITOPS\//);

    const mutationWithoutSession = await fetch(`${baseUrl}/api/terminal/exec`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'scenario run isp-failover', contextId }),
    });
    assert.equal(mutationWithoutSession.status, 200);
    const noSessionPayload = await mutationWithoutSession.json() as Record<string, any>;
    assert.equal(noSessionPayload.exitCode, 2);
    assert.match(noSessionPayload.output, /session identifier/i);

    const emptyResponse = await fetch(`${baseUrl}/api/terminal/exec`, {
      method: 'POST',
      headers: sessionHeaders,
      body: JSON.stringify({ command: '   ' }),
    });
    assert.equal(emptyResponse.status, 200);
    const emptyPayload = await emptyResponse.json() as Record<string, any>;
    assert.equal(emptyPayload.exitCode, 0);
    assert.equal(emptyPayload.output, '');

    console.log('Unified CLI HTTP regression: PASS');
  } finally {
    if (labId) await scenarioEngineService.reset(labId, sessionKey).catch(() => undefined);
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(`Unified CLI HTTP regression: FAIL (${error instanceof Error ? error.stack ?? error.message : String(error)})`);
  process.exitCode = 1;
});
