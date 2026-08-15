import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) throw new Error('DATABASE_URL is required for Networking operations HTTP regression');
  process.env.NODE_ENV = 'test';

  const [{ default: express }, { default: networkRoutes }, { errorHandler }, { prisma }, { labService }] = await Promise.all([
    import('express'),
    import('../routes/network.routes.js'),
    import('../middlewares/error.middleware.js'),
    import('../lib/prisma.js'),
    import('../services/labs/index.js'),
  ]);

  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  let labId: string | undefined;
  let server: Server | null = null;

  try {
    const project = await prisma.project.findFirst({ where: { domain: 'NETWORKING', status: 'PUBLISHED' } });
    assert.ok(project);

    const lab = await labService.create({
      slug: `network-ops-http-${suffix}`,
      title: 'Networking Operations HTTP Fixture',
      domain: 'NETWORKING',
      kind: 'NETWORK_TOPOLOGY',
      status: 'READY',
      projectId: project.id,
      isInteractive: true,
      manifestVersion: '1.0',
      capabilities: ['topology', 'control-plane', 'route-lookup', 'health-analysis', 'operator-context'],
      normalizedState: {
        schemaVersion: 'networking.v1',
        routingTable: [{ network: '0.0.0.0/0', nextHop: '192.0.2.1', interfaceName: 'Gi0/0', protocolCode: 'B', protocolName: 'eBGP', deviceKey: 'r1' }],
        bgpNeighbors: [{ id: 'peer', deviceKey: 'r1', peerDeviceKey: 'isp', peerAddress: '192.0.2.1', localAs: 65001, remoteAs: 64500, sessionType: 'EBGP', state: 'ESTABLISHED', source: 'NORMALIZED_INPUT' }],
        ospfNeighbors: [], gatewayRedundancy: [], vlans: [], accessControlLists: [], verificationChecks: [],
        specifications: { environment: 'HTTP regression', protocols: ['eBGP'], addressing: ['10.10.10.0/24'] },
        provenance: { sourceType: 'CANONICAL_MANIFEST', notes: [] },
      },
    });
    labId = lab.id;
    await labService.createInput(lab.id, { inputKey: 'topology', inputType: 'NETWORK_TOPOLOGY', label: 'Topology', sourceKind: 'INLINE', schemaVersion: 'networking.input.v1', payload: {}, isPrimary: true, sortOrder: 0 });
    await labService.replaceTopology(lab.id, [
      { nodeKey: 'client', label: 'Client', kind: 'workstation', configuration: { device: { status: 'UP', managementIp: '10.10.10.10', interfaces: [{ name: 'eth0', status: 'UP' }] } } },
      { nodeKey: 'r1', label: 'R1', kind: 'router', configuration: { device: { status: 'UP', managementIp: '10.0.0.1', interfaces: [{ name: 'Gi0/0', status: 'UP' }] } } },
      { nodeKey: 'isp', label: 'ISP', kind: 'isp', configuration: { device: { status: 'UP', managementIp: '192.0.2.1' } } },
    ], [
      { linkKey: 'client-r1', sourceNodeKey: 'client', targetNodeKey: 'r1', configuration: { status: 'UP', sourceInterface: 'eth0', targetInterface: 'Gi0/0' } },
      { linkKey: 'r1-isp', sourceNodeKey: 'r1', targetNodeKey: 'isp', configuration: { status: 'UP', sourceInterface: 'Gi0/0' } },
    ]);

    const app = express();
    app.use(express.json({ limit: '1mb' }));
    app.use('/api/network', networkRoutes);
    app.use('/api', errorHandler);
    server = await new Promise<Server>((resolve, reject) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
      listener.once('error', reject);
    });
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    async function request(path: string, init?: RequestInit) {
      const response = await fetch(`${baseUrl}${path}`, init);
      return { response, payload: await response.json() as Record<string, any> };
    }
    async function expect(path: string, status: number, init?: RequestInit) {
      const result = await request(path, init);
      assert.equal(result.response.status, status, `${init?.method ?? 'GET'} ${path}`);
      return result;
    }

    const operations = await expect(`/api/network/labs/${lab.slug}/operations`, 200);
    assert.equal(operations.payload.data.schemaVersion, 'networking.operations.v1');
    assert.equal(operations.payload.data.bgpNeighbors[0].state, 'ESTABLISHED');
    assert.equal('cpuPercent' in operations.payload.data, false);

    const lookup = await expect(`/api/network/labs/${lab.slug}/route-lookup?destination=8.8.8.8&deviceKey=r1`, 200);
    assert.equal(lookup.payload.data.matchedRoute.network, '0.0.0.0/0');
    await expect(`/api/network/labs/${lab.slug}/route-lookup?destination=999.1.1.1`, 400);

    const context = await expect(`/api/network/labs/${lab.slug}/context?deviceKey=r1`, 200);
    assert.equal(context.payload.data.contextId, 'NETOPS/R1');
    assert.equal(context.payload.data.executionAvailable, false);

    const analysis = await expect(`/api/network/labs/${lab.slug}/analyze-path`, 200, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceDeviceKey: 'client', targetDeviceKey: 'isp', protocol: 'TCP/443' }),
    });
    assert.equal(analysis.payload.data.status, 'FORWARDABLE');
    assert.deepEqual(analysis.payload.data.hops, ['client', 'r1', 'isp']);
    assert.equal(analysis.payload.data.aclAssessment.status, 'NOT_EVALUATED');
    assert.equal('latencyMs' in analysis.payload.data, false);
    assert.equal('roundTripMs' in analysis.payload.data, false);

    await expect(`/api/network/labs/${lab.slug}/analyze-path`, 400, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceDeviceKey: '', targetDeviceKey: 'isp' }),
    });
    await expect(`/api/network/labs/${lab.slug}/context?deviceKey=missing`, 404);

    console.log('Networking operations HTTP regression: PASS');
  } finally {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    if (labId) await prisma.lab.deleteMany({ where: { id: labId } });
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(`Networking operations HTTP regression: FAIL (${error instanceof Error ? error.stack ?? error.message : String(error)})`);
  process.exitCode = 1;
});
