import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();

async function text(path: string): Promise<string> {
  return readFile(resolve(ROOT, path), 'utf8');
}

async function assertMissing(path: string): Promise<void> {
  try {
    await access(resolve(ROOT, path), constants.F_OK);
  } catch {
    return;
  }
  assert.fail(`${path} must be removed after legacy runtime retirement`);
}

async function main(): Promise<void> {
  await assertMissing('server/services/db.service.ts');
  await assertMissing('server/repositories/legacy');
  await assertMissing('server/scripts/content-legacy-regression.ts');

  const factory = await text('server/repositories/repository.factory.ts');
  assert.match(factory, /mode:\s*'prisma'/);
  assert.doesNotMatch(factory, /legacyRepositories|Legacy[A-Z]|case\s+['"]legacy['"]/);

  const mediaRoute = await text('server/routes/media.routes.ts');
  assert.match(mediaRoute, /mediaService/);
  assert.doesNotMatch(mediaRoute, /dbService|MockDatabaseService/);
  assert.match(mediaRoute, /artifact reference registered/i);

  const mediaService = await text('server/services/media/media.service.ts');
  assert.match(mediaService, /ArtifactRepository/);
  assert.doesNotMatch(mediaService, /PrismaClient|prisma\./);
  assert.doesNotMatch(mediaService, /102400|fake|simulated upload/i);

  const architecture = await text('server/routes/architecture.routes.ts');
  assert.match(architecture, /systemMetricsService/);
  assert.doesNotMatch(architecture, /cpuUsagePercent|ramUsagePercent|uptimeSeconds|Legacy compatibility in-memory/);

  const systemRepository = await text('server/repositories/prisma/system.repository.ts');
  assert.match(systemRepository, /prisma\.project\.count/);
  assert.match(systemRepository, /prisma\.lab\.count/);
  assert.match(systemRepository, /prisma\.artifact\.count/);

  const network = await text('server/routes/network.routes.ts');
  assert.doesNotMatch(network, /upload-pkt|parseAndAttachPktFile|dbService/);

  const apiClient = await text('src/lib/api.ts');
  const admin = await text('src/components/AdminCMS/AdminModal.tsx');
  const networkingUi = await text('src/components/networking/NetworkingLabExplorer.tsx');
  assert.doesNotMatch(apiClient, /uploadPktFile/);
  assert.doesNotMatch(admin, /Parse \.PKT|uploadPktFile/);
  assert.doesNotMatch(networkingUi, /uploadPktFile|Successfully parsed|Parsing Cisco Packet Tracer structure/);

  const envExample = await text('.env.example');
  assert.doesNotMatch(envExample, /^PERSISTENCE_MODE=/m);

  const packageJson = JSON.parse(await text('package.json')) as { scripts?: Record<string, string> };
  assert.equal(packageJson.scripts?.['test:content:legacy'], undefined);
  assert.ok(packageJson.scripts?.['test:runtime:static']);
  assert.ok(packageJson.scripts?.['test:runtime:http']);

  console.log('Persistent runtime static audit: PASS');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error';
  console.error(`Persistent runtime static audit: FAIL (${message})`);
  process.exitCode = 1;
});
