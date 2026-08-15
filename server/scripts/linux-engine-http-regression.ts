import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) throw new Error('DATABASE_URL is required for Linux engine HTTP regression');
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
      key: 'rhel-node', label: 'RHEL Node', hostname: 'rhel-node', osName: 'Red Hat Enterprise Linux', osVersion: '9.4', kernelVersion: '5.14.0-test', architecture: 'x86_64', bootTarget: 'multi-user.target', status: 'UP', fipsMode: true,
      services: [{ unit: 'sshd.service', activeState: 'ACTIVE', source: 'NORMALIZED_INPUT' }],
      blockDevices: [], volumeGroups: [], logicalVolumes: [], mounts: [], fstab: [],
      selinux: { mode: 'ENFORCING', configuredMode: 'ENFORCING', policy: 'targeted', booleans: [], ports: [], contexts: [], source: 'NORMALIZED_INPUT' },
      interfaces: [], routes: [], logs: [], configurations: [], verificationRecords: [],
    };

    const lab = await labService.create({
      slug: `linux-http-${suffix}`,
      title: 'Linux HTTP Regression', domain: 'LINUX', kind: 'LINUX_SYSTEM', status: 'READY', projectId: project.id,
      isInteractive: true, manifestVersion: '1.0', capabilities: ['host-state', 'services', 'selinux'], normalizedState: { schemaVersion: 'linux.v1', hosts: [host] },
    });
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

    const list = await request('/api/linux/labs');
    assert.equal(list.response.status, 200);
    assert.ok(list.payload.data.some((entry: any) => entry.slug === lab.slug));

    const state = await request(`/api/linux/labs/${lab.slug}`);
    assert.equal(state.response.status, 200);
    assert.equal(state.payload.data.schemaVersion, 'linux.v1');
    assert.equal(state.payload.data.hosts[0].hostname, 'rhel-node');
    assert.equal('cpuPercent' in state.payload.data.hosts[0], false, 'Linux engine must not fabricate live CPU telemetry');

    const hostResponse = await request(`/api/linux/labs/${lab.slug}/hosts/rhel-node`);
    assert.equal(hostResponse.response.status, 200);
    assert.equal(hostResponse.payload.data.selinux.mode, 'ENFORCING');

    const missing = await request(`/api/linux/labs/${lab.slug}/hosts/missing`);
    assert.equal(missing.response.status, 404);

    console.log('Linux engine HTTP regression: PASS');
  } finally {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    if (labId) await prisma.lab.deleteMany({ where: { id: labId } });
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(`Linux engine HTTP regression: FAIL (${error instanceof Error ? error.stack ?? error.message : String(error)})`);
  process.exitCode = 1;
});
