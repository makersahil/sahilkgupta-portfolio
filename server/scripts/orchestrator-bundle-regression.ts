import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import type { PortfolioProjectBundleV1 } from '../types/orchestrator.js';

function sorted(values: string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function deepObject(depth: number): unknown {
  let value: unknown = { leaf: true };
  for (let index = 0; index < depth; index += 1) value = { nested: value };
  return value;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) throw new Error('DATABASE_URL is required for Portfolio Orchestrator bundle regression');
  process.env.NODE_ENV = 'test';

  const [
    { prisma },
    { portfolioBundleService, portfolioOrchestratorService },
    { portfolioOrchestratorRepository },
  ] = await Promise.all([
    import('../lib/prisma.js'),
    import('../services/orchestrator/index.js'),
    import('../repositories/prisma/portfolio-orchestrator.repository.js'),
  ]);

  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const createdProjectIds: string[] = [];
  const originalFetch = globalThis.fetch;

  try {
    const source = await prisma.project.findFirst({
      where: {
        domain: 'NETWORKING',
        status: 'PUBLISHED',
        labs: { some: { domain: 'NETWORKING' } },
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    assert.ok(source, 'a published Networking Project with at least one Lab must exist');

    const exportedSource = await portfolioOrchestratorService.exportProject(source.id);
    assert.equal(exportedSource.schemaVersion, 'portfolio.project-bundle.v1');
    assert.ok(exportedSource.labs.length > 0, 'source Project export must contain a Lab');
    assert.ok(exportedSource.labs[0].inputs.some((entry) => entry.isPrimary), 'source Lab must have a primary input');

    const importBundle = structuredClone(exportedSource);
    importBundle.project.slug = `phase8-bundle-${suffix}`;
    importBundle.project.title = `Phase 8 Bundle ${suffix}`;
    importBundle.project.lifecycleStatus = 'COMPLETED';
    importBundle.labs.forEach((lab, index) => {
      lab.lab.slug = `phase8-bundle-lab-${suffix}-${index + 1}`;
      lab.lab.title = `Phase 8 Imported Lab ${index + 1}`;
    });
    importBundle.labs[0].inputs.push({
      inputKey: `external-pcap-${suffix}`,
      inputType: 'PCAP_REFERENCE',
      label: 'External PCAP metadata reference',
      description: 'An http(s) metadata reference. The importer must never fetch it.',
      sourceKind: 'EXTERNAL',
      schemaVersion: 'networking.reference.v1',
      payload: null,
      externalUrl: 'https://example.invalid/phase8-reference.pcap',
      artifactReference: null,
      isPrimary: false,
      sortOrder: 999,
    });

    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      throw new Error('Phase 8 bundle import must never fetch an external URL');
    }) as typeof fetch;

    const dryRun = await portfolioBundleService.dryRun({ bundle: importBundle, conflictMode: 'REJECT' });
    assert.equal(dryRun.valid, true, dryRun.errors.join('\n'));
    assert.equal(dryRun.schemaVersion, 'portfolio.project-bundle.v1');
    assert.equal(dryRun.proposedProjectSlug, importBundle.project.slug);
    assert.equal(dryRun.counts.projects, 1);
    assert.equal(dryRun.counts.labs, importBundle.labs.length);

    const imported = await portfolioBundleService.import({ bundle: importBundle, conflictMode: 'REJECT' });
    assert.ok(imported.projectId);
    createdProjectIds.push(imported.projectId);
    assert.equal(imported.labIds.length, importBundle.labs.length);
    assert.equal(fetchCalls, 0, 'import must not fetch external input references');

    const importedAggregate = await portfolioOrchestratorService.getProject(imported.projectId);
    assert.equal(importedAggregate.project.publicationStatus, 'DRAFT');
    assert.equal(importedAggregate.project.publishedAt, null);
    assert.equal(importedAggregate.labs.every((entry) => entry.status === 'DRAFT'), true);
    assert.equal(await prisma.labScenarioRuntime.count({ where: { labId: { in: imported.labIds } } }), 0);

    const roundTrip = await portfolioOrchestratorService.exportProject(imported.projectId);
    assert.equal(roundTrip.project.slug, importBundle.project.slug);
    assert.equal(roundTrip.project.categorySlug, importBundle.project.categorySlug);
    assert.equal(roundTrip.labs.length, importBundle.labs.length);
    assert.deepEqual(
      sorted(roundTrip.labs.flatMap((lab) => lab.inputs.map((entry) => `${lab.lab.slug}:${entry.inputKey}`))),
      sorted(importBundle.labs.flatMap((lab) => lab.inputs.map((entry) => `${lab.lab.slug}:${entry.inputKey}`))),
    );
    assert.deepEqual(
      sorted(roundTrip.labs.flatMap((lab) => lab.topology.nodes.map((entry) => `${lab.lab.slug}:${entry.nodeKey}`))),
      sorted(importBundle.labs.flatMap((lab) => lab.topology.nodes.map((entry) => `${lab.lab.slug}:${entry.nodeKey}`))),
    );

    const exportedText = JSON.stringify(roundTrip);
    assert.doesNotMatch(exportedText, /DATABASE_URL|DIRECT_URL|JWT_SECRET|ADMIN_PASSWORD|passwordHash|sessionKey|storageKey|AuditLog|LabScenarioRuntime/i);
    assert.doesNotMatch(exportedText, /"sha256"\s*:/i, 'reference-only bundle must not claim a verified hash');

    const rejectConflict = await portfolioBundleService.dryRun({ bundle: importBundle, conflictMode: 'REJECT' });
    assert.equal(rejectConflict.valid, false);
    assert.match(rejectConflict.errors.join(' '), /Project slug already exists/i);

    const renameOne = await portfolioBundleService.dryRun({ bundle: importBundle, conflictMode: 'RENAME' });
    const renameTwo = await portfolioBundleService.dryRun({ bundle: importBundle, conflictMode: 'RENAME' });
    assert.equal(renameOne.valid, true, renameOne.errors.join('\n'));
    assert.equal(renameOne.proposedProjectSlug, `${importBundle.project.slug}-imported`);
    assert.deepEqual(renameOne.proposedLabSlugs, renameTwo.proposedLabSlugs, 'rename dry-run must be deterministic');
    const renamed = await portfolioBundleService.import({ bundle: importBundle, conflictMode: 'RENAME' });
    assert.ok(renamed.projectId);
    createdProjectIds.push(renamed.projectId);
    assert.equal((await portfolioOrchestratorService.getProject(renamed.projectId)).project.slug, renameOne.proposedProjectSlug);

    const companion = await portfolioOrchestratorService.exportNetworkingCompanion(imported.labIds[0]);
    assert.equal(companion.schemaVersion, 'networking.companion-manifest.v1');
    assert.equal(companion.lab.domain, 'NETWORKING');
    assert.equal(companion.lab.kind, 'NETWORK_TOPOLOGY');
    assert.equal(companion.input.isPrimary, true);
    const companionDryRun = await portfolioBundleService.dryRun({
      bundle: companion,
      conflictMode: 'RENAME',
      targetProjectId: imported.projectId,
    });
    assert.equal(companionDryRun.valid, true, companionDryRun.errors.join('\n'));
    assert.match(companionDryRun.warnings.join(' '), /reference-only|not parsed/i);
    const companionImport = await portfolioBundleService.import({
      bundle: companion,
      conflictMode: 'RENAME',
      targetProjectId: imported.projectId,
    });
    assert.equal(companionImport.labIds.length, 1);
    const companionRoundTrip = await portfolioOrchestratorService.exportNetworkingCompanion(companionImport.labIds[0]);
    assert.deepEqual(
      sorted(companionRoundTrip.topology.nodes.map((entry) => entry.nodeKey)),
      sorted(companion.topology.nodes.map((entry) => entry.nodeKey)),
    );
    assert.deepEqual(
      sorted(companionRoundTrip.topology.links.map((entry) => entry.linkKey)),
      sorted(companion.topology.links.map((entry) => entry.linkKey)),
    );
    assert.equal(companionRoundTrip.input.inputType, companion.input.inputType);
    assert.equal(companionRoundTrip.packetTracerReference?.referenceOnly ?? true, true);

    const unsupported = await portfolioBundleService.dryRun({ bundle: { schemaVersion: 'portfolio.project-bundle.v999' } });
    assert.equal(unsupported.valid, false);
    assert.match(unsupported.errors.join(' '), /Unsupported bundle schemaVersion/i);

    await assert.rejects(
      () => portfolioBundleService.dryRun({
        bundle: { schemaVersion: 'portfolio.project-bundle.v1', payload: 'x'.repeat(2 * 1024 * 1024 + 1) },
      }),
      /2 MiB/i,
    );
    await assert.rejects(
      () => portfolioBundleService.dryRun({ bundle: { schemaVersion: 'portfolio.project-bundle.v1', value: deepObject(35) } }),
      /nesting is too deep/i,
    );
    const polluted = JSON.parse('{"schemaVersion":"portfolio.project-bundle.v1","__proto__":{"polluted":true}}') as unknown;
    await assert.rejects(
      () => portfolioBundleService.dryRun({ bundle: polluted }),
      /forbidden property/i,
    );
    assert.equal(({} as Record<string, unknown>).polluted, undefined);

    const rollbackBundle = structuredClone(importBundle) as PortfolioProjectBundleV1;
    rollbackBundle.project.slug = `phase8-rollback-${suffix}`;
    rollbackBundle.project.title = `Phase 8 Rollback ${suffix}`;
    rollbackBundle.labs.forEach((lab, index) => {
      lab.lab.slug = `phase8-rollback-lab-${suffix}-${index + 1}`;
    });
    const duplicateInput = structuredClone(rollbackBundle.labs[0].inputs[0]);
    rollbackBundle.labs[0].inputs.push(duplicateInput);
    await assert.rejects(
      () => portfolioOrchestratorRepository.importProjectBundle(rollbackBundle),
      /unique|constraint|inputKey|P2002/i,
    );
    assert.equal(await prisma.project.count({ where: { slug: rollbackBundle.project.slug } }), 0, 'failed transactional import must roll back the Project row');
    assert.equal(await prisma.lab.count({ where: { slug: { startsWith: `phase8-rollback-lab-${suffix}` } } }), 0, 'failed transactional import must roll back Lab rows');

    console.log('Portfolio Orchestrator bundle regression: PASS');
  } finally {
    globalThis.fetch = originalFetch;
    for (const projectId of [...createdProjectIds].reverse()) {
      await prisma.project.deleteMany({ where: { id: projectId } }).catch(() => undefined);
    }
    await prisma.project.deleteMany({ where: { slug: { startsWith: `phase8-rollback-${suffix}` } } }).catch(() => undefined);
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`Portfolio Orchestrator bundle regression: FAIL (${message})`);
  process.exitCode = 1;
});
