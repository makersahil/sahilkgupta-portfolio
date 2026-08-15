import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function source(path: string): Promise<string> {
  return readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

async function main(): Promise<void> {
  const [schema, server, routes, service, manifest, registry, seed, repository, migration] = await Promise.all([
    source('prisma/schema.prisma'),
    source('server.ts'),
    source('server/routes/labs.routes.ts'),
    source('server/services/labs/lab.service.ts'),
    source('server/services/labs/lab-manifest.service.ts'),
    source('server/services/labs/lab-input-registry.ts'),
    source('prisma/seed.ts'),
    source('server/repositories/prisma/lab.repository.ts'),
    source('prisma/migrations/20260815090000_canonical_lab_platform/migration.sql'),
  ]);

  for (const required of ['model LabInput', 'model LabRunbookStep', 'manifestVersion', 'normalizedState', '@@unique([labId, slug])']) {
    assert.ok(schema.includes(required), `schema must contain ${required}`);
  }
  assert.ok(server.includes("app.use('/api/labs', labsRoutes)"), 'server must mount /api/labs');
  assert.ok(routes.includes("requireRole('SUPER_ADMIN', 'ADMIN')"), 'lab writes must require ADMIN/SUPER_ADMIN');
  assert.ok(routes.includes("'/:identifier/manifest'"), 'public manifest route must exist');
  assert.equal(routes.includes("from '@prisma/client'"), false, 'lab routes must not import Prisma');
  assert.equal(service.includes("from '@prisma/client'"), false, 'lab service must not import Prisma');
  assert.equal(service.includes('MockDatabaseService'), false, 'lab service must not depend on legacy mock persistence');
  assert.ok(registry.includes('PACKET_TRACER') && registry.includes('SYSTEM_SNAPSHOT') && registry.includes('ARGOCD'), 'domain input registries must cover all three domains');
  assert.ok(registry.includes('No arbitrary .pkt binary parsing is implied'), 'Packet Tracer registry must be truthful');
  assert.ok(manifest.includes('hasPayload') && manifest.includes('externalReference'), 'public manifest must expose descriptors instead of raw input sources');
  assert.equal(manifest.includes('storageKey'), false, 'public manifest must not expose internal storage keys');
  assert.ok(seed.includes('labInput.upsert') && seed.includes('labRunbookStep.upsert'), 'seed must upgrade compatibility fixtures to canonical lab data');
  assert.equal(service.includes('cisco-wan-topology'), false, 'lab engine must not branch on flagship project slugs');
  assert.equal(repository.includes('MockDatabaseService'), false, 'Prisma lab repository must be native');
  assert.equal(/DROP\s+(TABLE|COLUMN)/i.test(migration), false, 'canonical lab migration must not drop tables or columns');

  console.log('Lab platform static audit: PASS');
}

main().catch((error) => {
  console.error(`Lab platform static audit: FAIL (${error instanceof Error ? error.message : String(error)})`);
  process.exitCode = 1;
});
