import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { markRegressionLabReady } from './orchestrator-test-helpers.js';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) throw new Error('DATABASE_URL is required for Linux engine regression');
  process.env.NODE_ENV = 'test';

  const [{ prisma }, { labService }, { linuxService }] = await Promise.all([
    import('../lib/prisma.js'),
    import('../services/labs/index.js'),
    import('../services/linux/index.js'),
  ]);

  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const labIds: string[] = [];
  let tempProjectId: string | undefined;

  try {
    const canonicalProject = await prisma.project.findFirst({ where: { domain: 'LINUX', status: 'PUBLISHED' } });
    assert.ok(canonicalProject, 'a published Linux project fixture is required');

    const category = await prisma.category.findFirst({ where: { domain: 'LINUX' } });
    assert.ok(category, 'a Linux category fixture is required');

    const tempProject = await prisma.project.create({
      data: {
        slug: `linux-engine-project-${suffix}`,
        title: 'Linux Engine Secondary Project',
        domain: 'LINUX',
        summary: 'Temporary multi-project Linux engine regression fixture',
        status: 'PUBLISHED',
        lifecycleStatus: 'COMPLETED',
        formatType: 'STANDARD',
        technologies: ['RHEL 9.4'],
        tags: ['linux-regression'],
        categoryId: category.id,
        publishedAt: new Date(),
      },
    });
    tempProjectId = tempProject.id;

    const normalizedState = {
      schemaVersion: 'linux.v1',
      overview: 'Linux engine regression fixture',
      hosts: [
        {
          key: 'host-a', label: 'Host A', hostname: 'host-a', osName: 'Red Hat Enterprise Linux', osVersion: '9.4', kernelVersion: '5.14.0-test', architecture: 'x86_64', bootTarget: 'multi-user.target', status: 'UP', fipsMode: true,
          services: [{ unit: 'sshd.service', description: 'SSH', activeState: 'ACTIVE', enabled: true, source: 'NORMALIZED_INPUT' }],
          blockDevices: [{ name: '/dev/vg_data/lv_app', type: 'lvm', size: '10G', filesystem: 'xfs', mountPoint: '/srv/app', state: 'MOUNTED' }],
          volumeGroups: [{ name: 'vg_data', physicalVolumes: ['/dev/sdb1'] }],
          logicalVolumes: [{ name: 'lv_app', volumeGroup: 'vg_data', size: '10G', filesystem: 'xfs', mountPoint: '/srv/app', state: 'MOUNTED' }],
          mounts: [{ source: '/dev/vg_data/lv_app', target: '/srv/app', filesystem: 'xfs', options: ['defaults'], state: 'MOUNTED' }],
          fstab: [{ source: '/dev/vg_data/lv_app', target: '/srv/app', filesystem: 'xfs', options: ['defaults'], dump: 0, pass: 0 }],
          selinux: { mode: 'ENFORCING', configuredMode: 'ENFORCING', policy: 'targeted', booleans: [{ name: 'httpd_can_network_connect', enabled: false }], contexts: [], ports: [], source: 'NORMALIZED_INPUT' },
          interfaces: [{ name: 'ens160', type: 'ethernet', state: 'UP', addresses: ['10.50.0.10/24'], gateway: '10.50.0.1', dns: ['10.50.0.53'], connection: 'ens160', mtu: 1500 }],
          routes: [{ destination: '0.0.0.0/0', gateway: '10.50.0.1', interface: 'ens160', metric: 100, protocol: 'static' }],
          logs: [{ id: 'log-1', source: 'sshd.service', priority: 'info', timestamp: null, message: 'Recorded regression log', recorded: true }],
          configurations: [{ path: '/etc/ssh/sshd_config.d/01-hardening.conf', format: 'text', content: 'PasswordAuthentication no', description: 'Regression config', source: 'NORMALIZED_INPUT' }],
          verificationRecords: [{ id: 'check-1', title: 'SSH syntax', command: 'sshd -t', recordedObservation: 'exit 0', source: 'NORMALIZED_INPUT' }],
        },
        {
          key: 'host-b', label: 'Host B', hostname: 'host-b', osName: 'Red Hat Enterprise Linux', osVersion: '9.4', kernelVersion: '5.14.0-test', status: 'DEGRADED', services: [], blockDevices: [], volumeGroups: [], logicalVolumes: [], mounts: [], fstab: [], selinux: { mode: 'PERMISSIVE', configuredMode: 'ENFORCING', policy: 'targeted', booleans: [], contexts: [], ports: [], source: 'RECORDED_SNAPSHOT' }, interfaces: [], routes: [], logs: [], configurations: [], verificationRecords: [],
        },
      ],
      provenance: { sourceType: 'CANONICAL_MANIFEST', notes: ['Regression fixture'] },
    };

    const labOne = await labService.create({
      slug: `linux-engine-a-${suffix}`,
      title: 'Linux Engine Regression A',
      summary: 'Multi-host Linux regression fixture',
      domain: 'LINUX', kind: 'LINUX_SYSTEM', status: 'DRAFT', projectId: canonicalProject.id,
      isInteractive: true, manifestVersion: '1.0', capabilities: ['host-state', 'services', 'storage', 'selinux'], normalizedState,
    });
    await markRegressionLabReady(labOne.id);
    labIds.push(labOne.id);
    await labService.createInput(labOne.id, { inputKey: 'system', inputType: 'SYSTEM_SNAPSHOT', label: 'System Snapshot', sourceKind: 'INLINE', schemaVersion: 'linux.input.v1', payload: {}, isPrimary: true, sortOrder: 0 });
    await labService.replaceTopology(labOne.id, [
      { nodeKey: 'host-a', label: 'Host A', kind: 'linux_host', configuration: { host: normalizedState.hosts[0] } },
      { nodeKey: 'host-b', label: 'Host B', kind: 'linux_host', configuration: { host: normalizedState.hosts[1] } },
    ], []);

    const draftLab = await labService.create({
      slug: `linux-engine-draft-${suffix}`,
      title: 'Linux Draft Hidden', domain: 'LINUX', kind: 'LINUX_SYSTEM', status: 'DRAFT', projectId: canonicalProject.id,
      isInteractive: true, manifestVersion: '1.0', capabilities: ['host-state'], normalizedState,
    });
    labIds.push(draftLab.id);
    await labService.createInput(draftLab.id, { inputKey: 'system', inputType: 'SYSTEM_SNAPSHOT', label: 'System Snapshot', sourceKind: 'INLINE', schemaVersion: 'linux.input.v1', payload: {}, isPrimary: true, sortOrder: 0 });

    const labTwo = await labService.create({
      slug: `linux-engine-b-${suffix}`,
      title: 'Linux Engine Regression B', domain: 'LINUX', kind: 'LINUX_SYSTEM', status: 'DRAFT', projectId: tempProject.id,
      isInteractive: true, manifestVersion: '1.0', capabilities: ['host-state'], normalizedState: { ...normalizedState, hosts: [normalizedState.hosts[0]] },
    });
    await markRegressionLabReady(labTwo.id);
    labIds.push(labTwo.id);
    await labService.createInput(labTwo.id, { inputKey: 'system', inputType: 'SYSTEM_SNAPSHOT', label: 'System Snapshot', sourceKind: 'INLINE', schemaVersion: 'linux.input.v1', payload: {}, isPrimary: true, sortOrder: 0 });
    await labService.replaceTopology(labTwo.id, [{ nodeKey: 'host-a', label: 'Host A', kind: 'linux_host', configuration: { host: normalizedState.hosts[0] } }], []);

    const allLabs = await linuxService.listPublic();
    assert.ok(allLabs.some((entry) => entry.slug === labOne.slug));
    assert.ok(allLabs.some((entry) => entry.slug === labTwo.slug), 'Linux engine must support a second project without code changes');
    assert.ok(!allLabs.some((entry) => entry.slug === draftLab.slug), 'DRAFT Linux Labs must remain private');

    const projectLabs = await linuxService.listPublic(tempProject.slug);
    assert.ok(projectLabs.some((entry) => entry.slug === labTwo.slug));
    assert.ok(projectLabs.every((entry) => entry.project.slug === tempProject.slug));

    const state = await linuxService.getPublic(labOne.slug);
    assert.equal(state.schemaVersion, 'linux.v1');
    assert.equal(state.hosts.length, 2);
    assert.equal(state.hosts[0]?.osVersion, '9.4');
    assert.equal(state.hosts[0]?.services[0]?.unit, 'sshd.service');
    assert.equal(state.hosts[0]?.logicalVolumes[0]?.name, 'lv_app');
    assert.equal(state.hosts[0]?.fstab[0]?.target, '/srv/app');
    assert.equal(state.hosts[0]?.selinux.mode, 'ENFORCING');
    assert.equal(state.hosts[0]?.interfaces[0]?.addresses[0], '10.50.0.10/24');
    assert.equal(state.hosts[0]?.logs[0]?.message, 'Recorded regression log');
    assert.equal(state.hosts[0]?.configurations[0]?.path, '/etc/ssh/sshd_config.d/01-hardening.conf');
    assert.equal(state.hosts[0]?.verificationRecords[0]?.command, 'sshd -t');

    const host = await linuxService.getHost(labOne.slug, 'host-b');
    assert.equal(host.status, 'DEGRADED');
    assert.equal(host.selinux.mode, 'PERMISSIVE');
    await assert.rejects(() => linuxService.getHost(labOne.slug, 'missing-host'), /Linux host not found/);

    console.log('Linux engine regression: PASS');
  } finally {
    for (const labId of labIds.reverse()) await prisma.lab.deleteMany({ where: { id: labId } });
    if (tempProjectId) await prisma.project.deleteMany({ where: { id: tempProjectId } });
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(`Linux engine regression: FAIL (${error instanceof Error ? error.stack ?? error.message : String(error)})`);
  process.exitCode = 1;
});
