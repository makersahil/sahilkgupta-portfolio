import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) throw new Error('DATABASE_URL is required for the lab platform regression suite');
  process.env.NODE_ENV = 'test';

  const [{ prisma }, { labService }] = await Promise.all([
    import('../lib/prisma.js'),
    import('../services/labs/index.js'),
  ]);

  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const created: string[] = [];
  try {
    const project = await prisma.project.findUnique({ where: { slug: 'cisco-enterprise-wan-bgp-hsrp' } });
    assert.ok(project, 'networking seed project must exist');

    await assert.rejects(
      () => labService.create({
        slug: `lab-domain-mismatch-${suffix}`, title: 'Mismatch', domain: 'LINUX', kind: 'LINUX_SYSTEM', status: 'DRAFT',
        projectId: project.id, isInteractive: true, manifestVersion: '1.0', capabilities: [],
      }),
      /domain must match/i,
    );

    const first = await labService.create({
      slug: `lab-platform-a-${suffix}`, title: 'Lab Platform A', summary: 'Regression fixture', domain: 'NETWORKING',
      kind: 'NETWORK_TOPOLOGY', status: 'DRAFT', projectId: project.id, isInteractive: true,
      manifestVersion: '1.0', capabilities: ['topology', 'routing-state'], normalizedState: { state: 'baseline' },
    });
    created.push(first.id);
    const second = await labService.create({
      slug: `lab-platform-b-${suffix}`, title: 'Lab Platform B', summary: 'Second lab under same project', domain: 'NETWORKING',
      kind: 'NETWORK_TOPOLOGY', status: 'DRAFT', projectId: project.id, isInteractive: false,
      manifestVersion: '1.0', capabilities: ['topology'], normalizedState: { state: 'secondary' },
    });
    created.push(second.id);

    const projectLabs = await labService.listAdmin({ projectId: project.id });
    assert.ok(projectLabs.some((lab) => lab.id === first.id) && projectLabs.some((lab) => lab.id === second.id), 'one project must support multiple labs');

    await labService.createInput(first.id, {
      inputKey: 'topology', inputType: 'NETWORK_TOPOLOGY', label: 'Topology', sourceKind: 'INLINE', schemaVersion: '1.0',
      payload: { nodes: 2 }, isPrimary: true, sortOrder: 0,
    });
    await labService.createInput(first.id, {
      inputKey: 'routing', inputType: 'ROUTING_SNAPSHOT', label: 'Routing Snapshot', sourceKind: 'INLINE', schemaVersion: '1.0',
      payload: { routes: [] }, isPrimary: false, sortOrder: 1,
    });
    await assert.rejects(
      () => labService.createInput(first.id, {
        inputKey: 'wrong-domain', inputType: 'SELINUX_AUDIT', label: 'Wrong', sourceKind: 'INLINE', schemaVersion: '1.0', payload: {}, isPrimary: false, sortOrder: 2,
      }),
      /not supported/i,
    );

    await labService.replaceTopology(first.id,
      [
        { nodeKey: 'r1', label: 'R1', kind: 'router' },
        { nodeKey: 'r2', label: 'R2', kind: 'router' },
      ],
      [{ linkKey: 'r1-r2', sourceNodeKey: 'r1', targetNodeKey: 'r2', kind: 'wan' }],
    );

    const scenarioSlug = `same-scenario-${suffix}`;
    await labService.createScenario(first.id, { slug: scenarioSlug, title: 'Shared scenario', summary: 'First lab', order: 1, isEnabled: true });
    await labService.createScenario(second.id, { slug: scenarioSlug, title: 'Shared scenario', summary: 'Second lab', order: 1, isEnabled: true });

    await labService.createRunbookStep(first.id, { order: 1, title: 'Inspect', description: 'Inspect the topology', command: 'show state', expectedObservation: 'Two nodes are present' });
    await labService.createEvidence(first.id, { kind: 'TOPOLOGY', title: 'Topology verification', content: { verified: true }, isPublic: true, sortOrder: 0 });

    const aggregate = await labService.getAdmin(first.id);
    assert.equal(aggregate.inputs.length, 2);
    assert.equal(aggregate.nodes.length, 2);
    assert.equal(aggregate.links.length, 1);
    assert.equal(aggregate.scenarios.length, 1);
    assert.equal(aggregate.runbookSteps.length, 1);
    assert.equal(aggregate.evidence.length, 1);

    await assert.rejects(() => labService.getPublic(first.slug), /not found/i, 'DRAFT labs must not be public');
    await labService.update(first.id, { status: 'READY' });
    const publicLab = await labService.getPublic(first.slug);
    assert.equal(publicLab.status, 'READY');

    console.log('Lab platform regression: PASS');
  } finally {
    for (const id of created.reverse()) await prisma.lab.deleteMany({ where: { id } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`Lab platform regression: FAIL (${error instanceof Error ? error.stack ?? error.message : String(error)})`);
  process.exitCode = 1;
});
