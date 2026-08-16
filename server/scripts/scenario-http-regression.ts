import 'dotenv/config';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

const sessionKey = 'scenario-http-session-0001';
const raceSessionKey = 'scenario-http-race-0001';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) throw new Error('DATABASE_URL is required for Scenario Engine HTTP regression');
  process.env.NODE_ENV = 'test';

  const [
    { default: express },
    { default: scenarioRoutes },
    { default: networkRoutes },
    { errorHandler },
    { networkingService },
    { scenarioEngineService },
    { prisma },
  ] = await Promise.all([
    import('express'),
    import('../routes/scenario.routes.js'),
    import('../routes/network.routes.js'),
    import('../middlewares/error.middleware.js'),
    import('../services/networking/index.js'),
    import('../services/scenarios/index.js'),
    import('../lib/prisma.js'),
  ]);

  const lab = (await networkingService.listPublic())[0];
  assert.ok(lab, 'expected a public Networking Lab');
  await scenarioEngineService.reset(lab.id, sessionKey);

  let server: Server | null = null;
  try {
    const app = express();
    app.use(express.json({ limit: '1mb' }));
    app.use('/api/scenarios', scenarioRoutes);
    app.use('/api/network', networkRoutes);
    app.use('/api', errorHandler);
    server = await new Promise<Server>((resolve, reject) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
      listener.once('error', reject);
    });
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const sessionHeaders = { 'Content-Type': 'application/json', 'X-Lab-Session': sessionKey };

    const baselineResponse = await fetch(`${baseUrl}/api/network/labs/${encodeURIComponent(lab.slug)}`);
    assert.equal(baselineResponse.status, 200);
    const baselinePayload = await baselineResponse.json() as Record<string, any>;
    const baselineLink = baselinePayload.data.links.find((entry: Record<string, any>) => entry.key === 'isp1-r1');
    assert.ok(baselineLink);
    assert.notEqual(baselineLink.status, 'DOWN');

    const overviewResponse = await fetch(`${baseUrl}/api/scenarios/labs/${encodeURIComponent(lab.slug)}`, { headers: { 'X-Lab-Session': sessionKey } });
    assert.equal(overviewResponse.status, 200);
    const overviewPayload = await overviewResponse.json() as Record<string, any>;
    assert.equal(overviewPayload.success, true);
    assert.equal(overviewPayload.data.runtime, null);
    assert.ok(overviewPayload.data.scenarios.some((entry: Record<string, any>) => entry.slug === 'isp-failover'));

    const runResponse = await fetch(`${baseUrl}/api/scenarios/labs/${encodeURIComponent(lab.slug)}/run`, {
      method: 'POST',
      headers: sessionHeaders,
      body: JSON.stringify({ scenarioSlug: 'isp-failover' }),
    });
    assert.equal(runResponse.status, 200);
    const runPayload = await runResponse.json() as Record<string, any>;
    assert.equal(runPayload.data.runtime.status, 'ACTIVE');

    const simulatedResponse = await fetch(`${baseUrl}/api/network/labs/${encodeURIComponent(lab.slug)}`, { headers: { 'X-Lab-Session': sessionKey } });
    const simulatedPayload = await simulatedResponse.json() as Record<string, any>;
    assert.equal(simulatedPayload.data.links.find((entry: Record<string, any>) => entry.key === 'isp1-r1')?.status, 'DOWN');

    const separateSessionResponse = await fetch(`${baseUrl}/api/network/labs/${encodeURIComponent(lab.slug)}`);
    const separateSessionPayload = await separateSessionResponse.json() as Record<string, any>;
    assert.equal(separateSessionPayload.data.links.find((entry: Record<string, any>) => entry.key === 'isp1-r1')?.status, baselineLink.status);

    const verifyFault = await fetch(`${baseUrl}/api/scenarios/labs/${encodeURIComponent(lab.slug)}/verify`, { method: 'POST', headers: sessionHeaders, body: '{}' });
    assert.equal(verifyFault.status, 200);
    const faultPayload = await verifyFault.json() as Record<string, any>;
    assert.equal(faultPayload.data.runtime.verification.phase, 'SCENARIO_STATE');
    assert.equal(faultPayload.data.runtime.verification.passed, true);

    const remediateResponse = await fetch(`${baseUrl}/api/scenarios/labs/${encodeURIComponent(lab.slug)}/remediate`, { method: 'POST', headers: sessionHeaders, body: '{}' });
    assert.equal(remediateResponse.status, 200);
    const remediatePayload = await remediateResponse.json() as Record<string, any>;
    assert.equal(remediatePayload.data.runtime.status, 'REMEDIATED');

    const recoveredResponse = await fetch(`${baseUrl}/api/network/labs/${encodeURIComponent(lab.slug)}`, { headers: { 'X-Lab-Session': sessionKey } });
    const recoveredPayload = await recoveredResponse.json() as Record<string, any>;
    assert.equal(recoveredPayload.data.links.find((entry: Record<string, any>) => entry.key === 'isp1-r1')?.status, baselineLink.status);

    const verifyRecovery = await fetch(`${baseUrl}/api/scenarios/labs/${encodeURIComponent(lab.slug)}/verify`, { method: 'POST', headers: sessionHeaders, body: '{}' });
    assert.equal(verifyRecovery.status, 200);
    const recoveryPayload = await verifyRecovery.json() as Record<string, any>;
    assert.equal(recoveryPayload.data.runtime.status, 'VERIFIED');
    assert.equal(recoveryPayload.data.runtime.verification.phase, 'RECOVERY');
    assert.equal(recoveryPayload.data.runtime.verification.passed, true);

    const resetResponse = await fetch(`${baseUrl}/api/scenarios/labs/${encodeURIComponent(lab.slug)}/runtime`, { method: 'DELETE', headers: { 'X-Lab-Session': sessionKey } });
    assert.equal(resetResponse.status, 200);
    const resetPayload = await resetResponse.json() as Record<string, any>;
    assert.equal(resetPayload.data.runtime, null);

    const missingSession = await fetch(`${baseUrl}/api/scenarios/labs/${encodeURIComponent(lab.slug)}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioSlug: 'isp-failover' }),
    });
    assert.equal(missingSession.status, 400);

    await scenarioEngineService.reset(lab.id, raceSessionKey);
    const raceScenarioSlugs = overviewPayload.data.scenarios
      .map((entry: Record<string, any>) => entry.slug)
      .filter((slug: unknown): slug is string => typeof slug === 'string')
      .slice(0, 2);
    assert.equal(raceScenarioSlugs.length, 2, 'expected two enabled scenarios for HTTP concurrency regression');
    const raceHeaders = { 'Content-Type': 'application/json', 'X-Lab-Session': raceSessionKey };
    const raceResponses = await Promise.all(raceScenarioSlugs.map((scenarioSlug: string) => fetch(
      `${baseUrl}/api/scenarios/labs/${encodeURIComponent(lab.slug)}/run`,
      {
        method: 'POST',
        headers: raceHeaders,
        body: JSON.stringify({ scenarioSlug }),
      },
    )));
    assert.deepEqual(
      raceResponses.map((response) => response.status).sort((left, right) => left - right),
      [200, 409],
      'concurrent HTTP scenario starts must have exactly one winner and one conflict',
    );
    await scenarioEngineService.reset(lab.id, raceSessionKey);

    console.log('Scenario Engine HTTP regression: PASS');
  } finally {
    await scenarioEngineService.reset(lab.id, sessionKey).catch(() => undefined);
    await scenarioEngineService.reset(lab.id, raceSessionKey).catch(() => undefined);
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(`Scenario Engine HTTP regression: FAIL (${error instanceof Error ? error.stack ?? error.message : String(error)})`);
  process.exitCode = 1;
});
