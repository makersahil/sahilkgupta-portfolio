import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { markRegressionLabReady } from './orchestrator-test-helpers.js';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) throw new Error('DATABASE_URL is required for Linux operations HTTP regression');
  process.env.NODE_ENV = 'test';

  const [{ default: express }, { default: linuxRoutes }, { errorHandler }, { prisma }, { labService }] = await Promise.all([
    import('express'),
    import('../routes/linux.routes.js'),
    import('../middlewares/error.middleware.js'),
    import('../lib/prisma.js'),
    import('../services/labs/index.js'),
  ]);

  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  let labId: string | undefined;
  let server: Server | null = null;

  try {
    const project = await prisma.project.findFirst({ where: { domain: 'LINUX', status: 'PUBLISHED' } });
    assert.ok(project);

    const host = {
      key: 'rhel-node', label: 'RHEL Node', hostname: 'rhel-node', osName: 'Red Hat Enterprise Linux', osVersion: '9.4', kernelVersion: '5.14.0-test', architecture: 'x86_64', bootTarget: 'multi-user.target', status: 'UP',
      services: [{ unit: 'sshd.service', description: 'SSH', activeState: 'ACTIVE', enabled: true, source: 'RECORDED_SNAPSHOT' }],
      blockDevices: [], volumeGroups: [], logicalVolumes: [], mounts: [], fstab: [],
      selinux: { mode: 'ENFORCING', configuredMode: 'ENFORCING', policy: 'targeted', booleans: [], ports: [], contexts: [], source: 'RECORDED_SNAPSHOT' },
      interfaces: [{ name: 'ens160', type: 'ethernet', state: 'UP', addresses: ['10.50.0.10/24'], gateway: '10.50.0.1', dns: [], connection: 'ens160', mtu: 1500 }],
      routes: [{ destination: '0.0.0.0/0', gateway: '10.50.0.1', interface: 'ens160', metric: 100, protocol: 'static' }],
      logs: [], configurations: [], verificationRecords: [],
    };

    const lab = await labService.create({
      slug: `linux-ops-http-${suffix}`,
      title: 'Linux Operations HTTP Regression',
      domain: 'LINUX', kind: 'LINUX_SYSTEM', status: 'DRAFT', projectId: project.id,
      isInteractive: true, manifestVersion: '1.0', capabilities: ['host-state', 'health-analysis', 'operator-context'],
      normalizedState: { schemaVersion: 'linux.v1', hosts: [host] },
    });
    await markRegressionLabReady(lab.id);
    labId = lab.id;
    await labService.createInput(lab.id, { inputKey: 'system', inputType: 'SYSTEM_SNAPSHOT', label: 'System Snapshot', sourceKind: 'INLINE', schemaVersion: 'linux.input.v1', payload: {}, isPrimary: true, sortOrder: 0 });
    await labService.replaceTopology(lab.id, [{ nodeKey: 'rhel-node', label: 'RHEL Node', kind: 'linux_host', configuration: { host } }], []);

    const app = express();
    app.use(express.json({ limit: '1mb' }));
    app.use('/api/linux', linuxRoutes);
    app.use('/api', errorHandler);
    server = await new Promise<Server>((resolve, reject) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
      listener.once('error', reject);
    });
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    async function request(path: string) {
      const response = await fetch(`${baseUrl}${path}`);
      return { response, payload: await response.json() as Record<string, any> };
    }

    const operations = await request(`/api/linux/labs/${lab.slug}/operations?hostKey=rhel-node`);
    assert.equal(operations.response.status, 200);
    assert.equal(operations.payload.data.schemaVersion, 'linux.operations.v1');
    assert.equal(operations.payload.data.hostname, 'rhel-node');
    assert.equal(operations.payload.data.executionAvailable, false);
    assert.equal('cpuPercent' in operations.payload.data, false);
    assert.equal('memoryPercent' in operations.payload.data, false);
    assert.equal('remediationApplied' in operations.payload.data, false);

    const defaultHost = await request(`/api/linux/labs/${lab.slug}/operations`);
    assert.equal(defaultHost.response.status, 200);
    assert.equal(defaultHost.payload.data.hostKey, 'rhel-node');

    const context = await request(`/api/linux/labs/${lab.slug}/context?hostKey=rhel-node`);
    assert.equal(context.response.status, 200);
    assert.equal(context.payload.data.contextId, 'RHEL/RHEL-NODE');
    assert.equal(context.payload.data.executionAvailable, false);

    const labContext = await request(`/api/linux/labs/${lab.slug}/context`);
    assert.equal(labContext.response.status, 200);
    assert.equal(labContext.payload.data.scope, 'LAB');

    const missingOperations = await request(`/api/linux/labs/${lab.slug}/operations?hostKey=missing`);
    assert.equal(missingOperations.response.status, 404);
    const missingContext = await request(`/api/linux/labs/${lab.slug}/context?hostKey=missing`);
    assert.equal(missingContext.response.status, 404);

    console.log('Linux operations HTTP regression: PASS');
  } finally {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    if (labId) await prisma.lab.deleteMany({ where: { id: labId } });
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(`Linux operations HTTP regression: FAIL (${error instanceof Error ? error.stack ?? error.message : String(error)})`);
  process.exitCode = 1;
});
