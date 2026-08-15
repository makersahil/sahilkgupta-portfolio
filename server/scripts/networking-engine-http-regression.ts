import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

interface ApiResult { response: Response; payload: Record<string, any>; }

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) throw new Error('DATABASE_URL is required for the Networking engine HTTP regression suite');
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
  let draftLabId: string | undefined;
  let server: Server | null = null;

  try {
    const project = await prisma.project.findUnique({ where: { slug: 'cisco-enterprise-wan-bgp-hsrp' } });
    assert.ok(project);

    const lab = await labService.create({
      slug: `network-http-${suffix}`, title: 'Networking HTTP Fixture', summary: 'HTTP fixture', domain: 'NETWORKING', kind: 'NETWORK_TOPOLOGY', status: 'READY',
      projectId: project.id, isInteractive: true, manifestVersion: '1.0', capabilities: ['topology', 'packet-path'],
      normalizedState: { schemaVersion: 'networking.v1', overview: 'HTTP fixture', routingTable: [], vlans: [], accessControlLists: [], verificationChecks: [], specifications: { protocols: [], addressing: [] }, provenance: { sourceType: 'CANONICAL_MANIFEST', notes: [] } },
    });
    labId = lab.id;
    const draft = await labService.create({
      slug: `network-http-draft-${suffix}`, title: 'Draft Networking Fixture', domain: 'NETWORKING', kind: 'NETWORK_TOPOLOGY', status: 'DRAFT',
      projectId: project.id, isInteractive: true, manifestVersion: '1.0', capabilities: ['topology'], normalizedState: { schemaVersion: 'networking.v1' },
    });
    draftLabId = draft.id;

    await labService.createInput(lab.id, { inputKey: 'topology', inputType: 'NETWORK_TOPOLOGY', label: 'Topology', sourceKind: 'INLINE', schemaVersion: 'networking.input.v1', payload: {}, isPrimary: true, sortOrder: 0 });
    await labService.replaceTopology(lab.id,
      [
        { nodeKey: 'client', label: 'Client', kind: 'workstation', position: { x: 150, y: 280 }, configuration: { device: { status: 'UP', managementIp: '10.10.10.10' } } },
        { nodeKey: 'firewall', label: 'Firewall', kind: 'firewall', position: { x: 500, y: 280 }, configuration: { device: { status: 'UP', managementIp: '10.0.0.1' } } },
        { nodeKey: 'server', label: 'Server', kind: 'server', position: { x: 850, y: 280 }, configuration: { device: { status: 'UP', managementIp: '10.20.0.10' } } },
      ],
      [
        { linkKey: 'client-firewall', sourceNodeKey: 'client', targetNodeKey: 'firewall', configuration: { status: 'UP', protocol: 'Ethernet' } },
        { linkKey: 'firewall-server', sourceNodeKey: 'firewall', targetNodeKey: 'server', configuration: { status: 'UP', protocol: 'Ethernet' } },
      ],
    );

    const app = express();
    app.use(express.json({ limit: '1mb' }));
    app.use('/api/network', networkRoutes);
    app.use('/api', errorHandler);
    server = await new Promise<Server>((resolve, reject) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
      listener.once('error', reject);
    });
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    async function request(path: string, init?: RequestInit): Promise<ApiResult> {
      const response = await fetch(`${baseUrl}${path}`, init);
      return { response, payload: await response.json() as Record<string, any> };
    }
    async function expect(path: string, status: number, init?: RequestInit) {
      const result = await request(path, init);
      assert.equal(result.response.status, status, `${init?.method ?? 'GET'} ${path}`);
      return result;
    }

    const list = await expect(`/api/network/labs?projectSlug=${encodeURIComponent(project.slug)}`, 200);
    assert.ok(list.payload.data.some((entry: { id: string }) => entry.id === lab.id));
    assert.equal(list.payload.data.some((entry: { id: string }) => entry.id === draft.id), false);

    const state = await expect(`/api/network/labs/${lab.slug}`, 200);
    assert.equal(state.payload.data.devices.length, 3);
    assert.equal(state.payload.data.schemaVersion, 'networking.v1');

    const device = await expect(`/api/network/labs/${lab.slug}/devices/firewall`, 200);
    assert.equal(device.payload.data.kind, 'firewall');
    await expect(`/api/network/labs/${lab.slug}/devices/missing`, 404);

    const trace = await expect(`/api/network/labs/${lab.slug}/trace`, 200, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceDeviceKey: 'client', targetDeviceKey: 'server', protocol: 'TCP/443' }),
    });
    assert.equal(trace.payload.data.status, 'PATH_FOUND');
    assert.equal(trace.payload.data.traversesFirewall, true);
    assert.equal('roundTripMs' in trace.payload.data, false, 'Networking engine must not fabricate latency measurements');

    await expect(`/api/network/labs/${lab.slug}/trace`, 400, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceDeviceKey: '', targetDeviceKey: 'server' }),
    });
    await expect(`/api/network/labs/${draft.slug}`, 404);

    const compatibility = await expect(`/api/network/topology?lab=${encodeURIComponent(lab.slug)}`, 200);
    assert.equal(compatibility.payload.data.nodes.length, 3);
    const compatibilityTrace = await expect('/api/network/simulate-packet', 200, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ labIdentifier: lab.slug, sourceId: 'client', targetId: 'server' }),
    });
    assert.deepEqual(compatibilityTrace.payload.data.hops, ['client', 'firewall', 'server']);

    console.log('Networking engine HTTP regression: PASS');
  } finally {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    const ids = [labId, draftLabId].filter((entry): entry is string => Boolean(entry));
    if (ids.length) await prisma.lab.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(`Networking engine HTTP regression: FAIL (${error instanceof Error ? error.stack ?? error.message : String(error)})`);
  process.exitCode = 1;
});
