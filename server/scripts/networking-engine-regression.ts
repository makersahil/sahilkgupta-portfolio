import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { markRegressionLabReady } from './orchestrator-test-helpers.js';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) throw new Error('DATABASE_URL is required for the Networking engine regression suite');
  process.env.NODE_ENV = 'test';

  const [{ prisma }, { labService }, { networkingService }] = await Promise.all([
    import('../lib/prisma.js'),
    import('../services/labs/index.js'),
    import('../services/networking/index.js'),
  ]);

  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const createdLabIds: string[] = [];
  let secondaryProjectId: string | undefined;

  try {
    const project = await prisma.project.findUnique({ where: { slug: 'cisco-enterprise-wan-bgp-hsrp' } });
    assert.ok(project, 'published Networking project fixture must exist');

    const createLab = async (name: string, status: 'DRAFT' | 'READY') => {
      const lab = await labService.create({
        slug: `network-engine-${name}-${suffix}`,
        title: `Networking Engine ${name}`,
        summary: 'Reusable Networking engine regression fixture',
        domain: 'NETWORKING',
        kind: 'NETWORK_TOPOLOGY',
        status: 'DRAFT',
        projectId: project.id,
        isInteractive: true,
        manifestVersion: '1.0',
        capabilities: ['topology', 'interfaces', 'routing-state', 'packet-path'],
        normalizedState: {
          schemaVersion: 'networking.v1',
          overview: `${name} control-plane fixture`,
          routingTable: [{ network: '10.20.0.0/16', nextHop: '10.0.0.2', interfaceName: 'Gi0/0', protocolCode: 'O', protocolName: 'OSPF', administrativeDistance: 110, metric: '20' }],
          vlans: [{ vlanId: 20, name: 'SERVER', ports: ['Gi1/0/20'], status: 'UP' }],
          accessControlLists: [{ id: 'acl-1', name: 'EDGE-IN', action: 'permit', protocol: 'tcp', source: 'any', destination: '10.20.0.0/16' }],
          verificationChecks: [{ id: 'check-1', title: 'Inspect route', command: 'show ip route', expectedObservation: 'OSPF route is recorded', status: 'EXPECTED' }],
          specifications: { environment: 'Regression fixture', protocols: ['OSPF'], addressing: ['10.20.0.0/16'] },
          provenance: { sourceType: 'CANONICAL_MANIFEST', packetTracerReference: null, notes: ['Persisted regression fixture'] },
        },
      });
      createdLabIds.push(lab.id);
      await labService.createInput(lab.id, {
        inputKey: 'topology', inputType: 'NETWORK_TOPOLOGY', label: 'Normalized topology', sourceKind: 'INLINE', schemaVersion: 'networking.input.v1',
        payload: { schemaVersion: 'networking.input.v1' }, isPrimary: true, sortOrder: 0,
      });
      if (status === 'READY') await markRegressionLabReady(lab.id);
      return lab;
    };

    const ready = await createLab('ready', 'READY');
    const secondary = await createLab('secondary', 'READY');
    const draft = await createLab('draft', 'DRAFT');

    const secondaryProject = await prisma.project.create({
      data: {
        slug: `network-engine-project-${suffix}`,
        title: 'Secondary Networking Project Fixture',
        domain: 'NETWORKING',
        summary: 'A second published Networking project used to prove the engine is not tied to one flagship project.',
        status: 'PUBLISHED',
        lifecycleStatus: 'COMPLETED',
        formatType: 'STANDARD',
        featured: false,
        sortOrder: 999,
        technologies: ['Canonical Lab Platform'],
        tags: ['networking-engine-regression'],
        categoryId: project.categoryId,
        publishedAt: new Date(),
      },
    });
    secondaryProjectId = secondaryProject.id;

    const normalizedOnlyLab = await labService.create({
      slug: `network-engine-normalized-${suffix}`,
      title: 'Normalized-State Networking Fixture',
      summary: 'A second-project Lab rendered without project-specific React or persisted topology-node assumptions.',
      domain: 'NETWORKING',
      kind: 'NETWORK_TOPOLOGY',
      status: 'DRAFT',
      projectId: secondaryProject.id,
      isInteractive: true,
      manifestVersion: '1.0',
      capabilities: ['topology', 'packet-path'],
      normalizedState: {
        schemaVersion: 'networking.v1',
        devices: [
          { id: 'left', name: 'Left Edge', type: 'router', status: 'UP', position: { x: 10, y: 50 } },
          { id: 'right', name: 'Right Edge', type: 'router', status: 'UP', position: { x: 90, y: 50 } },
        ],
        links: [
          { key: 'left-right', source: 'left', target: 'right', status: 'UP', protocol: 'OSPF' },
        ],
        provenance: { sourceType: 'NORMALIZED_PROJECT_FIXTURE', notes: ['Regression fixture'] },
      },
    });
    createdLabIds.push(normalizedOnlyLab.id);
    await labService.createInput(normalizedOnlyLab.id, {
      inputKey: 'normalized-topology', inputType: 'NETWORK_TOPOLOGY', label: 'Normalized topology', sourceKind: 'INLINE', schemaVersion: 'networking.input.v1',
      payload: { schemaVersion: 'networking.input.v1' }, isPrimary: true, sortOrder: 0,
    });
    await markRegressionLabReady(normalizedOnlyLab.id);

    await labService.replaceTopology(
      ready.id,
      [
        { nodeKey: 'client', label: 'Client', kind: 'workstation', position: { x: 100, y: 280 }, configuration: { device: { status: 'UP', managementIp: '10.10.10.10', interfaces: [{ name: 'eth0', ipAddress: '10.10.10.10', status: 'UP', vlan: '10' }] } } },
        { nodeKey: 'router', label: 'Edge Router', kind: 'router', position: { x: 500, y: 280 }, configuration: { device: { status: 'UP', managementIp: '10.0.0.1', routingProtocols: ['OSPF'], configurationText: 'router ospf 1', interfaces: [{ name: 'Gi0/0', status: 'UP' }, { name: 'Gi0/1', status: 'UP' }] } } },
        { nodeKey: 'server', label: 'Server', kind: 'server', position: { x: 900, y: 280 }, configuration: { device: { status: 'UP', managementIp: '10.20.0.10', interfaces: [{ name: 'eth0', status: 'UP' }] } } },
      ],
      [
        { linkKey: 'client-router', sourceNodeKey: 'client', targetNodeKey: 'router', kind: 'access', configuration: { status: 'UP', protocol: 'Ethernet', sourceInterface: 'eth0', targetInterface: 'Gi0/0' } },
        { linkKey: 'router-server', sourceNodeKey: 'router', targetNodeKey: 'server', kind: 'routed', configuration: { status: 'UP', protocol: 'OSPF', sourceInterface: 'Gi0/1', targetInterface: 'eth0' } },
      ],
    );

    await labService.replaceTopology(
      secondary.id,
      [
        { nodeKey: 'left', label: 'Left', kind: 'router', position: { x: 250, y: 280 }, configuration: { device: { status: 'UP' } } },
        { nodeKey: 'right', label: 'Right', kind: 'router', position: { x: 750, y: 280 }, configuration: { device: { status: 'UP' } } },
      ],
      [],
    );

    const listed = await networkingService.listPublic(project.slug);
    assert.ok(listed.some((entry) => entry.id === ready.id));
    assert.ok(listed.some((entry) => entry.id === secondary.id));
    assert.equal(listed.some((entry) => entry.id === draft.id), false, 'DRAFT Networking Labs must not be listed publicly');

    const allNetworkingLabs = await networkingService.listPublic();
    assert.ok(allNetworkingLabs.some((entry) => entry.id === ready.id && entry.project.id === project.id));
    assert.ok(allNetworkingLabs.some((entry) => entry.id === normalizedOnlyLab.id && entry.project.id === secondaryProject.id));
    const secondProjectLabs = await networkingService.listPublic(secondaryProject.slug);
    assert.deepEqual(secondProjectLabs.map((entry) => entry.id), [normalizedOnlyLab.id]);

    const normalizedState = await networkingService.getPublic(normalizedOnlyLab.slug);
    assert.deepEqual(normalizedState.devices.map((device) => device.key), ['left', 'right']);
    assert.deepEqual(normalizedState.devices.map((device) => device.position), [{ x: 100, y: 280 }, { x: 900, y: 280 }]);
    assert.deepEqual((await networkingService.tracePath(normalizedOnlyLab.slug, 'left', 'right')).hops, ['left', 'right']);

    const state = await networkingService.getPublic(ready.slug);
    assert.equal(state.schemaVersion, 'networking.v1');
    assert.equal(state.devices.length, 3);
    assert.equal(state.links.length, 2);
    assert.equal(state.routingTable[0]?.protocol, 'O');
    assert.equal(state.vlans[0]?.vlanId, 20);
    assert.equal(state.aclRules[0]?.name, 'EDGE-IN');
    assert.equal(state.inputs[0]?.inputType, 'NETWORK_TOPOLOGY');

    const device = await networkingService.getDevice(ready.slug, 'router');
    assert.deepEqual(device.routingProtocols, ['OSPF']);
    assert.equal(device.configurationSnippet, 'router ospf 1');

    const trace = await networkingService.tracePath(ready.slug, 'client', 'server', 'ICMP');
    assert.equal(trace.status, 'PATH_FOUND');
    assert.deepEqual(trace.hops, ['client', 'router', 'server']);
    assert.deepEqual(trace.linkKeys, ['client-router', 'router-server']);

    await labService.replaceTopology(
      ready.id,
      [
        { nodeKey: 'client', label: 'Client', kind: 'workstation', position: { x: 100, y: 280 }, configuration: { device: { status: 'UP', managementIp: '10.10.10.10', interfaces: [{ name: 'eth0', ipAddress: '10.10.10.10', status: 'UP', vlan: '10' }] } } },
        { nodeKey: 'router', label: 'Edge Router', kind: 'router', position: { x: 500, y: 280 }, configuration: { device: { status: 'UP', managementIp: '10.0.0.1', routingProtocols: ['OSPF'], configurationText: 'router ospf 1', interfaces: [{ name: 'Gi0/0', status: 'UP' }, { name: 'Gi0/1', status: 'DOWN' }] } } },
        { nodeKey: 'server', label: 'Server', kind: 'server', position: { x: 900, y: 280 }, configuration: { device: { status: 'UP', managementIp: '10.20.0.10', interfaces: [{ name: 'eth0', status: 'UP' }] } } },
      ],
      [
        { linkKey: 'client-router', sourceNodeKey: 'client', targetNodeKey: 'router', kind: 'access', configuration: { status: 'UP', protocol: 'Ethernet', sourceInterface: 'eth0', targetInterface: 'Gi0/0' } },
        { linkKey: 'router-server', sourceNodeKey: 'router', targetNodeKey: 'server', kind: 'routed', configuration: { status: 'UP', protocol: 'OSPF', sourceInterface: 'Gi0/1', targetInterface: 'eth0' } },
      ],
    );
    const interfaceDown = await networkingService.tracePath(ready.slug, 'client', 'server', 'ICMP');
    assert.equal(interfaceDown.status, 'UNREACHABLE', 'core topology trace must exclude links attached to DOWN endpoint interfaces');
    assert.deepEqual(interfaceDown.hops, []);

    const unreachable = await networkingService.tracePath(secondary.slug, 'left', 'right', 'ICMP');
    assert.equal(unreachable.status, 'UNREACHABLE');
    assert.deepEqual(unreachable.hops, []);

    await assert.rejects(() => networkingService.getPublic(draft.slug), /not found/i);
    console.log('Networking engine regression: PASS');
  } finally {
    if (createdLabIds.length) await prisma.lab.deleteMany({ where: { id: { in: createdLabIds } } });
    if (secondaryProjectId) await prisma.project.deleteMany({ where: { id: secondaryProjectId } });
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(`Networking engine regression: FAIL (${error instanceof Error ? error.stack ?? error.message : String(error)})`);
  process.exitCode = 1;
});
