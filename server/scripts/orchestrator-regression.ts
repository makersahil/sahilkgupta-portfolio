import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

function networkState(label: string) {
  return {
    schemaVersion: 'networking.v1',
    overview: `${label} recorded topology`,
    routingTable: [],
    vlans: [],
    accessControlLists: [],
    verificationChecks: [],
    specifications: { environment: 'Phase 8 regression fixture', protocols: ['STATIC'], addressing: ['10.80.0.0/24'] },
    provenance: { sourceType: 'CANONICAL_MANIFEST', packetTracerReference: null, notes: ['Disposable Phase 8 regression fixture'] },
  };
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) throw new Error('DATABASE_URL is required for Portfolio Orchestrator regression');
  process.env.NODE_ENV = 'test';

  const [
    { prisma },
    { portfolioOrchestratorService },
    { labService },
    { scenarioEngineService },
    { contentServices },
  ] = await Promise.all([
    import('../lib/prisma.js'),
    import('../services/orchestrator/index.js'),
    import('../services/labs/index.js'),
    import('../services/scenarios/index.js'),
    import('../services/content/index.js'),
  ]);

  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const projectSlug = `phase8-orchestrator-${suffix}`;
  const sessionKey = `phase8-orchestrator-session-${suffix}`;
  const createdProjectIds: string[] = [];

  try {
    const category = await prisma.category.findFirst({ where: { domain: 'NETWORKING' }, orderBy: { createdAt: 'asc' } });
    assert.ok(category, 'a NETWORKING category must exist');

    let aggregate = await portfolioOrchestratorService.createProject({
      title: `Phase 8 Orchestrator ${suffix}`,
      slug: projectSlug,
      domain: 'NETWORKING',
      summary: 'Disposable Project proving data-driven Phase 8 orchestration.',
      lifecycleStatus: 'PLANNED',
      formatType: 'STANDARD',
      featured: false,
      sortOrder: 9000,
      technologies: ['Canonical Lab Platform'],
      tags: ['phase-8-regression'],
      categoryId: category.id,
    });
    createdProjectIds.push(aggregate.project.id);
    assert.equal(aggregate.project.publicationStatus, 'DRAFT');
    assert.equal(aggregate.project.revision, 1);

    const initialValidation = await portfolioOrchestratorService.validateProject(aggregate.project.id);
    assert.equal(initialValidation.valid, true);
    const noLabsFinding = initialValidation.findings.find((entry) => entry.code === 'PROJECT_HAS_NO_ACTIVE_LABS');
    assert.ok(noLabsFinding, 'STANDARD draft Project without Labs should surface a validation finding');
    assert.equal(noLabsFinding.severity, 'WARNING');

    aggregate = await portfolioOrchestratorService.createLab(aggregate.project.id, {
      slug: `phase8-primary-${suffix}`,
      title: 'Phase 8 Primary Networking Lab',
      summary: 'Primary orchestrated Lab',
      isInteractive: true,
      manifestVersion: '1.0',
      capabilities: ['topology', 'packet-path', 'scenarios'],
      normalizedState: networkState('Primary'),
      metadata: { owner: 'orchestrator-regression' },
      sortOrder: 10,
    });
    aggregate = await portfolioOrchestratorService.createLab(aggregate.project.id, {
      slug: `phase8-secondary-${suffix}`,
      title: 'Phase 8 Secondary Networking Lab',
      summary: 'Secondary orchestrated Lab',
      isInteractive: true,
      manifestVersion: '1.0',
      capabilities: ['topology'],
      normalizedState: networkState('Secondary'),
      metadata: { owner: 'orchestrator-regression' },
      sortOrder: 20,
    });
    assert.equal(aggregate.labs.length, 2);

    const [primaryEntry, secondaryEntry] = aggregate.labs;
    const configureLab = async (labId: string, prefix: string, includeScenario: boolean) => {
      await labService.createInput(labId, {
        inputKey: `${prefix}-topology`,
        inputType: 'NETWORK_TOPOLOGY',
        label: `${prefix} normalized topology`,
        description: 'Inline canonical topology descriptor',
        sourceKind: 'INLINE',
        schemaVersion: 'networking.input.v1',
        payload: { schemaVersion: 'networking.input.v1', source: 'orchestrator-regression' },
        isPrimary: true,
        sortOrder: 0,
      });
      await labService.replaceTopology(labId, [
        { nodeKey: `${prefix}-left`, label: `${prefix} Left`, kind: 'router', position: { x: 180, y: 240 }, configuration: { device: { status: 'UP', interfaces: [{ name: 'Gi0/0', status: 'UP' }] } }, metadata: {} },
        { nodeKey: `${prefix}-right`, label: `${prefix} Right`, kind: 'router', position: { x: 780, y: 240 }, configuration: { device: { status: 'UP', interfaces: [{ name: 'Gi0/0', status: 'UP' }] } }, metadata: {} },
      ], [
        { linkKey: `${prefix}-edge`, sourceNodeKey: `${prefix}-left`, targetNodeKey: `${prefix}-right`, kind: 'routed', configuration: { status: 'UP', sourceInterface: 'Gi0/0', targetInterface: 'Gi0/0', protocol: 'STATIC' }, metadata: {} },
      ]);
      if (includeScenario) {
        await labService.createScenario(labId, {
          slug: 'edge-link-failure',
          title: 'Edge Link Failure',
          summary: 'Session-scoped link failure used by the orchestrator regression.',
          order: 1,
          isEnabled: true,
          baselineState: { requiredSignals: [`link:${prefix}-edge=UP`] },
          actions: { schemaVersion: 'networking.scenario.v1', mutations: [{ type: 'SET_LINK_STATUS', linkKey: `${prefix}-edge`, status: 'DOWN' }] },
          expectedObservations: { observableSignals: [`link:${prefix}-edge=DOWN`] },
          verificationCriteria: { checks: ['selected link is down in the session overlay'] },
        });
      }
      await labService.createRunbookStep(labId, {
        order: 1,
        title: 'Inspect recorded topology',
        description: 'Review the persisted recorded state.',
        command: 'show topology',
        expectedObservation: 'Both nodes and the recorded link are visible.',
      });
      await labService.createEvidence(labId, {
        kind: 'TOPOLOGY',
        title: `${prefix} topology evidence`,
        description: 'Public disposable evidence for orchestration verification.',
        content: { source: 'recorded-state', measuredProductionEvidence: false },
        externalUrl: null,
        artifactId: null,
        isPublic: true,
        sortOrder: 1,
      });
    };

    await configureLab(primaryEntry.id, 'primary', true);
    await configureLab(secondaryEntry.id, 'secondary', false);

    aggregate = await portfolioOrchestratorService.getProject(aggregate.project.id);
    aggregate = await portfolioOrchestratorService.updateProject(aggregate.project.id, {
      expectedRevision: aggregate.project.revision,
      lifecycleStatus: 'COMPLETED',
      mission: 'Demonstrate revision-safe persisted orchestration.',
      architectureSummary: 'Admin Orchestrator to services to Prisma to PostgreSQL.',
      whatIBuilt: 'Two reusable Networking Labs configured without project-specific frontend code.',
    });

    const beforePreviewState = JSON.stringify((await portfolioOrchestratorService.getLab(primaryEntry.id)).normalizedState);
    const validation = await portfolioOrchestratorService.validateProject(aggregate.project.id);
    assert.equal(validation.valid, true, validation.findings.map((entry) => `${entry.code}:${entry.message}`).join('\n'));
    const preview = await portfolioOrchestratorService.previewProject(aggregate.project.id);
    assert.equal(preview.project.id, aggregate.project.id);
    assert.equal(preview.labs.length, 2);
    assert.equal(JSON.stringify((await portfolioOrchestratorService.getLab(primaryEntry.id)).normalizedState), beforePreviewState, 'preview/validation must not mutate canonical state');

    for (const labId of [primaryEntry.id, secondaryEntry.id]) {
      const current = await portfolioOrchestratorService.getLab(labId);
      const ready = await portfolioOrchestratorService.markLabReady(labId, current.revision);
      assert.equal(ready.lab.status, 'READY');
      assert.equal(ready.validation.valid, true);
    }

    aggregate = await portfolioOrchestratorService.getProject(aggregate.project.id);
    const publication = await portfolioOrchestratorService.publishProject(aggregate.project.id, {
      expectedProjectRevision: aggregate.project.revision,
      expectedLabRevisions: Object.fromEntries(aggregate.labs.map((entry) => [entry.id, entry.revision])),
      readyLabIds: aggregate.labs.map((entry) => entry.id),
    });
    assert.equal(publication.project.publicationStatus, 'PUBLISHED');
    assert.equal(publication.labs.every((entry) => entry.status === 'READY'), true);

    const publicProject = await contentServices.projects.getPublicBySlug(projectSlug);
    assert.equal(publicProject.id, aggregate.project.id);
    const publicLabs = await labService.listPublic({ projectId: aggregate.project.id });
    assert.deepEqual(new Set(publicLabs.map((entry) => entry.id)), new Set([primaryEntry.id, secondaryEntry.id]));
    assert.equal(publication.preview.project.id, publicProject.id);

    await assert.rejects(
      () => portfolioOrchestratorService.updateProject(aggregate.project.id, { expectedRevision: aggregate.project.revision, summary: 'stale write' }),
      /changed since it was loaded/i,
    );

    await scenarioEngineService.reset(primaryEntry.id, sessionKey);
    const started = await scenarioEngineService.run(primaryEntry.id, sessionKey, 'edge-link-failure');
    assert.equal(started.runtime?.status, 'ACTIVE');
    const currentPrimary = await portfolioOrchestratorService.getLab(primaryEntry.id);
    await assert.rejects(
      () => portfolioOrchestratorService.updateLab(primaryEntry.id, { expectedRevision: currentPrimary.revision, metadata: { changed: true } }),
      /active scenario runtime/i,
    );
    const reset = await portfolioOrchestratorService.resetLabRuntimes(primaryEntry.id);
    assert.ok(reset.deletedRuntimes >= 1);
    const afterReset = await portfolioOrchestratorService.getLab(primaryEntry.id);
    const updatedLab = await portfolioOrchestratorService.updateLab(primaryEntry.id, { expectedRevision: afterReset.revision, metadata: { changedAfterExplicitReset: true } });
    assert.deepEqual(updatedLab.metadata, { changedAfterExplicitReset: true });

    const duplicate = await portfolioOrchestratorService.duplicateProject(aggregate.project.id, {});
    createdProjectIds.push(duplicate.project.id);
    assert.equal(duplicate.project.publicationStatus, 'DRAFT');
    assert.notEqual(duplicate.project.id, aggregate.project.id);
    assert.equal(duplicate.labs.length, 2);
    assert.equal(duplicate.labs.every((entry) => entry.id !== primaryEntry.id && entry.activeRuntimeCount === 0), true);

    aggregate = await portfolioOrchestratorService.getProject(aggregate.project.id);
    const archived = await portfolioOrchestratorService.archiveProject(aggregate.project.id, aggregate.project.revision);
    assert.equal(archived.project.publicationStatus, 'ARCHIVED');
    await assert.rejects(() => contentServices.projects.getPublicBySlug(projectSlug), /Project not found/);
    const restored = await portfolioOrchestratorService.restoreProject(archived.project.id, archived.project.revision, 'PLANNED');
    assert.equal(restored.project.publicationStatus, 'DRAFT');
    assert.equal(restored.project.lifecycleStatus, 'PLANNED');

    console.log('Portfolio Orchestrator regression: PASS');
  } finally {
    await prisma.labScenarioRuntime.deleteMany({ where: { sessionKey } }).catch(() => undefined);
    for (const projectId of [...createdProjectIds].reverse()) {
      await prisma.project.deleteMany({ where: { id: projectId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`Portfolio Orchestrator regression: FAIL (${message})`);
  process.exitCode = 1;
});
