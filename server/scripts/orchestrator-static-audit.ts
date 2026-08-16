import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function text(path: string): Promise<string> {
  return readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

async function main(): Promise<void> {
  const [
    schema,
    migration,
    server,
    routes,
    projectRoutes,
    labRoutes,
    input,
    service,
    validation,
    preview,
    bundle,
    repository,
    labService,
    projectRepository,
    adminModal,
    orchestratorUi,
    hook,
    api,
    types,
    verify,
    seed,
  ] = await Promise.all([
    text('prisma/schema.prisma'),
    text('prisma/migrations/20260816120000_phase_8_portfolio_orchestrator/migration.sql'),
    text('server.ts'),
    text('server/routes/orchestrator.routes.ts'),
    text('server/routes/projects.routes.ts'),
    text('server/routes/labs.routes.ts'),
    text('server/services/orchestrator/orchestrator-input.ts'),
    text('server/services/orchestrator/portfolio-orchestrator.service.ts'),
    text('server/services/orchestrator/portfolio-validation.service.ts'),
    text('server/services/orchestrator/portfolio-preview.service.ts'),
    text('server/services/orchestrator/portfolio-bundle.service.ts'),
    text('server/repositories/prisma/portfolio-orchestrator.repository.ts'),
    text('server/services/labs/lab.service.ts'),
    text('server/repositories/prisma/project.repository.ts'),
    text('src/components/AdminCMS/AdminModal.tsx'),
    text('src/components/AdminOrchestrator/AdminOrchestrator.tsx'),
    text('src/hooks/usePortfolioOrchestrator.ts'),
    text('src/lib/api.ts'),
    text('src/types.ts'),
    text('server/scripts/verify.ts'),
    text('prisma/seed.ts'),
  ]);

  assert.match(schema, /revision\s+Int\s+@default\(1\)/);
  assert.match(schema, /sortOrder\s+Int\s+@default\(0\)/);
  assert.match(migration, /ADD COLUMN\s+"revision"\s+INTEGER NOT NULL DEFAULT 1/i);
  assert.match(migration, /ADD COLUMN\s+"sortOrder"\s+INTEGER NOT NULL DEFAULT 0/i);
  assert.doesNotMatch(migration, /DROP\s+(TABLE|COLUMN)|TRUNCATE|DELETE\s+FROM/i);

  assert.match(server, /app\.use\('\/api\/admin\/orchestrator', orchestratorRoutes\)/);
  assert.match(routes, /router\.use\(authenticateToken, requireRole\('SUPER_ADMIN', 'ADMIN'\)\)/);
  assert.match(routes, /requireRole\('SUPER_ADMIN'\)/);
  assert.match(routes, /\/projects\/:projectId\/publish/);
  assert.match(routes, /\/labs\/:labId\/mark-ready/);
  assert.match(routes, /\/import\/dry-run/);
  assert.match(routes, /\/artifacts/);
  assert.doesNotMatch(routes, /from '@prisma\/client'/);
  assert.match(projectRoutes, /deleteProjectPermanent/);
  assert.match(projectRoutes, /parseDeleteConfirmation/);
  assert.match(labRoutes, /deleteLabPermanent/);
  assert.match(labRoutes, /parseDeleteConfirmation/);

  assert.match(service, /assertNoActiveRuntime/);
  assert.match(service, /expectedRevision/);
  assert.match(service, /deleteProjectPermanent/);
  assert.match(validation, /LabManifestService|labManifestService/);
  assert.match(validation, /applyScenarioActions/);
  assert.match(validation, /verifyScenarioActions/);
  assert.match(preview, /networkingLabAdapter\.toState/);
  assert.match(preview, /linuxLabAdapter\.toState/);
  assert.match(preview, /devOpsLabAdapter\.toState/);
  assert.doesNotMatch(preview, /update\(|publish|status\s*:/);

  assert.match(bundle, /MAX_BYTES\s*=\s*2\s*\*\s*1024\s*\*\s*1024/);
  assert.match(bundle, /MAX_DEPTH/);
  assert.match(bundle, /MAX_NODES/);
  assert.match(bundle, /__proto__/);
  assert.match(bundle, /prototype/);
  assert.match(bundle, /constructor/);
  assert.match(bundle, /networking\.companion-manifest\.v1/);
  assert.match(bundle, /reference-only/i);
  assert.doesNotMatch(bundle, /fetch\(|axios|child_process|eval\(|new Function|Function\(/);

  assert.match(repository, /\$transaction/);
  assert.match(repository, /revision:\s*\{ increment: 1 \}/);
  assert.match(repository, /status:\s*'DRAFT'/);
  assert.match(repository, /reference:/);
  assert.doesNotMatch(repository, /MockDatabaseService/);
  assert.doesNotMatch(repository, /storageKey:\s*row\.storageKey/);
  assert.match(labService, /Admin Lab creation must start in DRAFT|Orchestrator readiness\/archive workflow/);
  assert.match(projectRepository, /status:\s*'DRAFT'/);
  assert.match(projectRepository, /publishedAt:\s*null/);

  assert.match(adminModal, /AdminOrchestrator/);
  assert.doesNotMatch(adminModal, /editingProject|handleSaveProject|AdminLabBuilder/);
  assert.match(orchestratorUi, /Single writable Project\/Lab control plane/);
  assert.match(orchestratorUi, /ProjectNavigator/);
  assert.match(orchestratorUi, /PublicationWizard/);
  assert.match(orchestratorUi, /BundleImportExportPanel/);
  assert.match(hook, /usePortfolioOrchestrator/);
  assert.match(api, /\/api\/admin\/orchestrator/);
  assert.match(types, /OrchestratorValidationReport/);

  const implementation = [service, validation, preview, bundle, repository, orchestratorUi].join('\n');
  assert.doesNotMatch(implementation, /from ['"]node:child_process['"]|require\(['"]child_process|spawn\(|exec\(|eval\(|new Function|Function\(/i);
  assert.doesNotMatch(implementation, /proj-cisco|proj-rhel|cisco-enterprise-wan-bgp-hsrp|cloud-native-gitops/i);

  assert.match(input, /expectedRevision/);
  assert.match(seed, /referenceOnly:\s*true/);
  assert.match(verify, /Orchestrator/);
  assert.doesNotMatch([adminModal, orchestratorUi, validation, service].join('\n'), /Phase 8.*COMPLETE and exit-verified/i);

  console.log('Portfolio Orchestrator static audit: PASS');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`Portfolio Orchestrator static audit: FAIL (${message})`);
  process.exitCode = 1;
});
