import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { markRegressionLabReady } from './orchestrator-test-helpers.js';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) throw new Error('DATABASE_URL is required for Linux operations regression');
  process.env.NODE_ENV = 'test';

  const [{ prisma }, { labService }, { linuxOperationsService }] = await Promise.all([
    import('../lib/prisma.js'),
    import('../services/labs/index.js'),
    import('../services/linux/index.js'),
  ]);

  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  let labId: string | undefined;

  try {
    const project = await prisma.project.findFirst({ where: { domain: 'LINUX', status: 'PUBLISHED' } });
    assert.ok(project, 'a published Linux project fixture is required');

    const host = {
      key: 'host-a',
      label: 'Host A',
      hostname: 'host-a',
      osName: 'Red Hat Enterprise Linux',
      osVersion: '9.4',
      kernelVersion: '5.14.0-test',
      architecture: 'x86_64',
      bootTarget: 'multi-user.target',
      status: 'DEGRADED',
      fipsMode: true,
      services: [
        { unit: 'httpd.service', description: 'Apache HTTP Server', activeState: 'FAILED', subState: 'failed', enabled: true, source: 'RECORDED_SNAPSHOT' },
        { unit: 'sshd.service', description: 'OpenSSH', activeState: 'ACTIVE', subState: 'running', enabled: true, source: 'RECORDED_SNAPSHOT' },
      ],
      blockDevices: [{ name: '/dev/vg_app/lv_web', type: 'lvm', size: '5G', filesystem: 'xfs', mountPoint: '/srv/web', state: 'UNMOUNTED' }],
      volumeGroups: [{ name: 'vg_app', size: '10G', free: '5G', physicalVolumes: ['/dev/sdb1'] }],
      logicalVolumes: [{ name: 'lv_web', volumeGroup: 'vg_app', size: '5G', filesystem: 'xfs', mountPoint: '/srv/web', state: 'UNMOUNTED' }],
      mounts: [{ source: '/dev/vg_app/lv_web', target: '/srv/web', filesystem: 'xfs', options: ['defaults'], state: 'UNMOUNTED' }],
      fstab: [{ source: '/dev/vg_app/lv_web', target: '/srv/web', filesystem: 'xfs', options: ['defaults'], dump: 0, pass: 0 }],
      selinux: {
        mode: 'PERMISSIVE', configuredMode: 'ENFORCING', policy: 'targeted', booleans: [], ports: [], contexts: [], source: 'RECORDED_SNAPSHOT',
      },
      interfaces: [{ name: 'ens192', type: 'ethernet', state: 'DOWN', addresses: ['10.20.30.10/24'], gateway: '10.20.30.1', dns: ['10.20.30.53'], connection: 'ens192', mtu: 1500 }],
      routes: [{ destination: '0.0.0.0/0', gateway: '10.20.30.1', interface: 'ens192', metric: 100, protocol: 'static' }],
      logs: [
        { id: 'httpd-fail', source: 'httpd.service', priority: 'err', timestamp: '2026-08-15T12:00:00Z', message: 'httpd.service: Failed with result exit-code', recorded: true },
        { id: 'avc-1', source: 'audit', priority: 'warning', timestamp: '2026-08-15T12:00:02Z', message: 'AVC denied { read } for pid=123 comm=httpd scontext=system_u:system_r:httpd_t:s0', recorded: true },
      ],
      configurations: [{ path: '/etc/httpd/conf/httpd.conf', format: 'text', content: 'DocumentRoot /srv/web', description: 'HTTPD fixture', source: 'NORMALIZED_INPUT' }],
      verificationRecords: [],
    };

    const lab = await labService.create({
      slug: `linux-ops-${suffix}`,
      title: 'Linux Operations Regression',
      summary: 'Recorded-state Linux operations fixture',
      domain: 'LINUX',
      kind: 'LINUX_SYSTEM',
      status: 'DRAFT',
      projectId: project.id,
      isInteractive: true,
      manifestVersion: '1.0',
      capabilities: ['host-state', 'health-analysis', 'diagnostics', 'operator-context', 'scenario-readiness'],
      normalizedState: { schemaVersion: 'linux.v1', hosts: [host], provenance: { sourceType: 'CANONICAL_MANIFEST', notes: ['operations regression'] } },
    });
    await markRegressionLabReady(lab.id);
    labId = lab.id;

    await labService.createInput(lab.id, {
      inputKey: 'system', inputType: 'SYSTEM_SNAPSHOT', label: 'System Snapshot', sourceKind: 'INLINE', schemaVersion: 'linux.input.v1', payload: {}, isPrimary: true, sortOrder: 0,
    });
    await labService.createInput(lab.id, {
      inputKey: 'journal', inputType: 'JOURNAL_EXTRACT', label: 'Journal Extract', sourceKind: 'INLINE', schemaVersion: 'linux.journal.v1', payload: { count: 2 }, isPrimary: false, sortOrder: 10,
    });
    await labService.replaceTopology(lab.id, [{ nodeKey: 'host-a', label: 'Host A', kind: 'linux_host', configuration: { host } }], []);
    await labService.createScenario(lab.id, {
      slug: 'service-failure',
      title: 'Service Failure',
      summary: 'Temporary scenario contract',
      order: 10,
      isEnabled: true,
      baselineState: { requiredSignals: ['service:httpd.service=ACTIVE'] },
      actions: { mutations: [{ type: 'SET_SERVICE_STATE', unit: 'httpd.service', activeState: 'FAILED' }] },
      expectedObservations: { observableSignals: ['service:httpd.service=FAILED', 'journal:httpd.service=ERROR'] },
      verificationCriteria: { checks: ['service finding visible'] },
    });

    const operations = await linuxOperationsService.getOperations(lab.slug, 'host-a');
    assert.equal(operations.schemaVersion, 'linux.operations.v1');
    assert.equal(operations.hostKey, 'host-a');
    assert.equal(operations.overallStatus, 'CRITICAL');
    assert.equal(operations.counts.failedServices, 1);
    assert.equal(operations.counts.downInterfaces, 1);
    assert.equal(operations.executionAvailable, false);
    assert.equal('cpuPercent' in operations, false);
    assert.equal('memoryPercent' in operations, false);

    const serviceFinding = operations.findings.find((entry) => entry.id === 'service:httpd.service');
    assert.ok(serviceFinding);
    assert.equal(serviceFinding.severity, 'CRITICAL');
    assert.ok(serviceFinding.evidence.some((entry) => /Failed with result/i.test(entry)));
    assert.ok(serviceFinding.suggestedCommands.some((entry) => entry.startsWith('systemctl status')));
    assert.equal(serviceFinding.interpretation, 'RECORDED_STATE_DIAGNOSTIC');

    assert.ok(operations.findings.some((entry) => entry.category === 'STORAGE' && entry.relatedPath === '/srv/web'));
    assert.ok(operations.findings.some((entry) => entry.category === 'SELINUX' && /denial/i.test(entry.title)));
    assert.ok(operations.findings.some((entry) => entry.category === 'NETWORK' && entry.relatedInterface === 'ens192'));

    const selinuxCheck = operations.healthChecks.find((entry) => entry.category === 'SELINUX');
    assert.ok(selinuxCheck);
    assert.equal(selinuxCheck.status, 'WARN');
    const networkCheck = operations.healthChecks.find((entry) => entry.category === 'NETWORK');
    assert.equal(networkCheck?.status, 'FAIL');

    assert.equal(operations.scenarioReadiness.length, 1);
    assert.equal(operations.scenarioReadiness[0]?.executionAvailable, true);
    assert.deepEqual(operations.scenarioReadiness[0]?.observableSignals, ['service:httpd.service=FAILED', 'journal:httpd.service=ERROR']);

    const hostContext = await linuxOperationsService.getContext(lab.slug, 'host-a');
    assert.equal(hostContext.contextId, 'RHEL/HOST-A');
    assert.equal(hostContext.prompt, 'RHEL/HOST-A>');
    assert.equal(hostContext.scope, 'HOST');
    assert.equal(hostContext.executionAvailable, false);
    assert.ok(hostContext.availableInspectors.includes('health'));
    assert.ok(hostContext.availableInspectors.includes('scenarios'));

    const labContext = await linuxOperationsService.getContext(lab.slug);
    assert.equal(labContext.scope, 'LAB');
    assert.match(labContext.contextId, /^RHEL\//);
    await assert.rejects(() => linuxOperationsService.getOperations(lab.slug, 'missing-host'), /Linux host not found/);
    await assert.rejects(() => linuxOperationsService.getContext(lab.slug, 'missing-host'), /Linux host not found/);

    console.log('Linux operations regression: PASS');
  } finally {
    if (labId) await prisma.lab.deleteMany({ where: { id: labId } });
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(`Linux operations regression: FAIL (${error instanceof Error ? error.stack ?? error.message : String(error)})`);
  process.exitCode = 1;
});
