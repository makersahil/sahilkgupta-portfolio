import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { markRegressionLabReady } from './orchestrator-test-helpers.js';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) throw new Error('DATABASE_URL is required for Networking operations regression');
  process.env.NODE_ENV = 'test';

  const [{ prisma }, { labService }, { networkingOperationsService }] = await Promise.all([
    import('../lib/prisma.js'),
    import('../services/labs/index.js'),
    import('../services/networking/index.js'),
  ]);

  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  let labId: string | undefined;

  try {
    const project = await prisma.project.findFirst({ where: { domain: 'NETWORKING', status: 'PUBLISHED' } });
    assert.ok(project, 'a published Networking project fixture is required');

    const lab = await labService.create({
      slug: `network-ops-${suffix}`,
      title: 'Networking Operations Regression',
      summary: 'Recorded-state operations fixture',
      domain: 'NETWORKING',
      kind: 'NETWORK_TOPOLOGY',
      status: 'DRAFT',
      projectId: project.id,
      isInteractive: true,
      manifestVersion: '1.0',
      capabilities: ['topology', 'control-plane', 'route-lookup', 'health-analysis', 'operator-context', 'scenario-readiness'],
      normalizedState: {
        schemaVersion: 'networking.v1',
        overview: 'Operations regression fixture',
        routingTable: [
          { network: '0.0.0.0/0', nextHop: '192.0.2.1', interfaceName: 'Gi0/0', protocolCode: 'B', protocolName: 'eBGP', administrativeDistance: 20, metric: '0', deviceKey: 'r1' },
          { network: '10.20.0.0/16', nextHop: '10.0.0.2', interfaceName: 'Gi0/1', protocolCode: 'O', protocolName: 'OSPF', administrativeDistance: 110, metric: '20', deviceKey: 'r1' },
          { network: '10.20.30.0/24', nextHop: '10.0.0.3', interfaceName: 'Gi0/1', protocolCode: 'O', protocolName: 'OSPF', administrativeDistance: 110, metric: '5', deviceKey: 'r1' },
        ],
        bgpNeighbors: [
          { id: 'bgp-r1-isp', deviceKey: 'r1', peerDeviceKey: 'isp', peerAddress: '192.0.2.1', localAs: 65001, remoteAs: 64500, sessionType: 'EBGP', state: 'ESTABLISHED', source: 'NORMALIZED_INPUT' },
        ],
        ospfNeighbors: [
          { id: 'ospf-r1-r2', deviceKey: 'r1', peerDeviceKey: 'r2', neighborId: '2.2.2.2', neighborAddress: '10.0.0.2', interfaceName: 'Gi0/1', area: '0.0.0.0', state: 'FULL/BDR', role: 'BDR', source: 'NORMALIZED_INPUT' },
        ],
        gatewayRedundancy: [
          { id: 'hsrp-1', protocol: 'HSRP', group: 1, virtualIp: '10.0.0.1', source: 'NORMALIZED_INPUT', members: [
            { deviceKey: 'r1', role: 'ACTIVE', priority: 110, preempt: true, trackedInterfaces: ['Gi0/0'], status: 'UP' },
            { deviceKey: 'r2', role: 'STANDBY', priority: 90, preempt: false, trackedInterfaces: [], status: 'STANDBY' },
          ] },
        ],
        vlans: [], accessControlLists: [{ id: 'deny-app', name: 'EDGE-IN', action: 'deny', protocol: 'tcp', source: '10.10.10.0/24', destination: '10.20.30.0/24 eq 443', deviceKey: 'r2', interface: 'Gi0/1', direction: 'IN', sequence: 10 }], verificationChecks: [],
        specifications: { environment: 'Regression fixture', protocols: ['eBGP', 'OSPF', 'HSRP'], addressing: ['10.20.30.0/24'] },
        provenance: { sourceType: 'CANONICAL_MANIFEST', notes: ['Regression fixture'] },
      },
    });
    await markRegressionLabReady(lab.id);
    labId = lab.id;

    await labService.createInput(lab.id, {
      inputKey: 'topology', inputType: 'NETWORK_TOPOLOGY', label: 'Topology', sourceKind: 'INLINE', schemaVersion: 'networking.input.v1', payload: {}, isPrimary: true, sortOrder: 0,
    });

    await labService.replaceTopology(lab.id, [
      { nodeKey: 'client', label: 'Client', kind: 'workstation', position: { x: 100, y: 250 }, configuration: { device: { status: 'UP', managementIp: '10.10.10.10', interfaces: [{ name: 'eth0', status: 'UP', ipAddress: '10.10.10.10' }] } } },
      { nodeKey: 'r1', label: 'R1', kind: 'router', position: { x: 350, y: 250 }, configuration: { device: { status: 'UP', managementIp: '10.0.0.1', interfaces: [{ name: 'Gi0/1', status: 'UP', ipAddress: '10.0.0.1' }] } } },
      { nodeKey: 'r2', label: 'R2', kind: 'router', position: { x: 600, y: 250 }, configuration: { device: { status: 'STANDBY', managementIp: '10.0.0.2', interfaces: [{ name: 'Gi0/1', status: 'UP', ipAddress: '10.0.0.2' }] } } },
      { nodeKey: 'server', label: 'Server', kind: 'server', position: { x: 850, y: 250 }, configuration: { device: { status: 'UP', managementIp: '10.20.30.10', interfaces: [{ name: 'eth0', status: 'UP', ipAddress: '10.20.30.10' }] } } },
      { nodeKey: 'isp', label: 'ISP', kind: 'isp', position: { x: 350, y: 80 }, configuration: { device: { status: 'UP', managementIp: '192.0.2.1' } } },
    ], [
      { linkKey: 'client-r1', sourceNodeKey: 'client', targetNodeKey: 'r1', configuration: { status: 'UP', sourceInterface: 'eth0', targetInterface: 'Gi0/1' } },
      { linkKey: 'r1-r2', sourceNodeKey: 'r1', targetNodeKey: 'r2', configuration: { status: 'UP', sourceInterface: 'Gi0/1', targetInterface: 'Gi0/1' } },
      { linkKey: 'r2-server', sourceNodeKey: 'r2', targetNodeKey: 'server', configuration: { status: 'UP', sourceInterface: 'Gi0/1', targetInterface: 'eth0' } },
      { linkKey: 'r1-isp', sourceNodeKey: 'r1', targetNodeKey: 'isp', configuration: { status: 'UP' } },
    ]);

    await labService.createScenario(lab.id, {
      slug: 'isp-failover', title: 'ISP Failover', summary: 'Definition only', order: 1, isEnabled: true,
      expectedObservations: { observableSignals: ['link:r1-isp=DOWN', 'bgp:bgp-r1-isp!=ESTABLISHED'] },
      actions: { mutations: [{ type: 'SET_LINK_STATUS', linkKey: 'r1-isp', status: 'DOWN' }] },
    });

    const operations = await networkingOperationsService.getOperations(lab.slug);
    assert.equal(operations.schemaVersion, 'networking.operations.v1');
    assert.equal(operations.bgpNeighbors[0]?.state, 'ESTABLISHED');
    assert.equal(operations.ospfNeighbors[0]?.state, 'FULL/BDR');
    assert.equal(operations.gatewayRedundancy[0]?.virtualIp, '10.0.0.1');
    assert.ok(operations.healthChecks.some((check) => check.category === 'BGP' && check.status === 'PASS'));
    assert.equal(operations.scenarioReadiness[0]?.executionAvailable, true);
    assert.deepEqual(operations.scenarioReadiness[0]?.observableSignals, ['link:r1-isp=DOWN', 'bgp:bgp-r1-isp!=ESTABLISHED']);

    const route = await networkingOperationsService.lookupRoute(lab.slug, '10.20.30.99', 'r1');
    assert.equal(route.status, 'MATCH_FOUND');
    assert.equal(route.matchedRoute?.network, '10.20.30.0/24', 'longest-prefix match must beat the /16 and default route');
    assert.equal(route.prefixLength, 24);
    const defaultRoute = await networkingOperationsService.lookupRoute(lab.slug, '8.8.8.8', 'r1');
    assert.equal(defaultRoute.matchedRoute?.network, '0.0.0.0/0');
    await assert.rejects(() => networkingOperationsService.lookupRoute(lab.slug, '999.1.1.1', 'r1'), /valid IPv4/i);

    const context = await networkingOperationsService.getContext(lab.slug, 'r1');
    assert.equal(context.contextId, 'NETOPS/R1');
    assert.equal(context.executionAvailable, false);
    assert.ok(context.availableInspectors.includes('bgp'));
    assert.ok(context.availableInspectors.includes('health'));

    const path = await networkingOperationsService.analyzePath(lab.slug, 'client', 'server', 'ICMP');
    assert.equal(path.status, 'FORWARDABLE');
    assert.deepEqual(path.hops, ['client', 'r1', 'r2', 'server']);
    assert.equal(path.aclAssessment.status, 'NO_MATCH');
    assert.equal('roundTripMs' in path, false);

    const denied = await networkingOperationsService.analyzePath(lab.slug, 'client', 'server', 'TCP/443');
    assert.equal(denied.status, 'BLOCKED');
    assert.equal(denied.aclAssessment.status, 'DENY');
    assert.equal(denied.aclAssessment.ruleId, 'deny-app');

    await labService.replaceTopology(lab.id, [
      { nodeKey: 'client', label: 'Client', kind: 'workstation', configuration: { device: { status: 'UP', interfaces: [{ name: 'eth0', status: 'UP' }] } } },
      { nodeKey: 'r1', label: 'R1', kind: 'router', configuration: { device: { status: 'UP', interfaces: [{ name: 'Gi0/1', status: 'UP' }] } } },
      { nodeKey: 'r2', label: 'R2', kind: 'router', configuration: { device: { status: 'STANDBY', interfaces: [{ name: 'Gi0/1', status: 'UP' }] } } },
      { nodeKey: 'server', label: 'Server', kind: 'server', configuration: { device: { status: 'UP', interfaces: [{ name: 'eth0', status: 'UP' }] } } },
      { nodeKey: 'isp', label: 'ISP', kind: 'isp', configuration: { device: { status: 'UP' } } },
    ], [
      { linkKey: 'client-r1', sourceNodeKey: 'client', targetNodeKey: 'r1', configuration: { status: 'UP', sourceInterface: 'eth0', targetInterface: 'Gi0/1' } },
      { linkKey: 'r1-r2', sourceNodeKey: 'r1', targetNodeKey: 'r2', configuration: { status: 'DOWN', sourceInterface: 'Gi0/1', targetInterface: 'Gi0/1' } },
      { linkKey: 'r2-server', sourceNodeKey: 'r2', targetNodeKey: 'server', configuration: { status: 'UP', sourceInterface: 'Gi0/1', targetInterface: 'eth0' } },
      { linkKey: 'r1-isp', sourceNodeKey: 'r1', targetNodeKey: 'isp', configuration: { status: 'UP' } },
    ]);
    const blocked = await networkingOperationsService.analyzePath(lab.slug, 'client', 'server', 'ICMP');
    assert.equal(blocked.status, 'BLOCKED');
    assert.ok(blocked.blockers.some((entry) => entry.type === 'LINK_DOWN' && entry.key === 'r1-r2'));

    console.log('Networking operations regression: PASS');
  } finally {
    if (labId) await prisma.lab.deleteMany({ where: { id: labId } });
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(`Networking operations regression: FAIL (${error instanceof Error ? error.stack ?? error.message : String(error)})`);
  process.exitCode = 1;
});
