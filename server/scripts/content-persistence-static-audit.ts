import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = process.cwd();

async function text(path: string): Promise<string> {
  return readFile(resolve(ROOT, path), 'utf8');
}

function assertContains(source: string, needle: string, label: string): void {
  assert.ok(source.includes(needle), `${label} is missing: ${needle}`);
}

function assertNotContains(source: string, needle: string, label: string): void {
  assert.ok(!source.includes(needle), `${label} must not contain: ${needle}`);
}

async function main(): Promise<void> {
  const contentRoutes = [
    'server/routes/categories.routes.ts',
    'server/routes/projects.routes.ts',
    'server/routes/blogs.routes.ts',
    'server/routes/certifications.routes.ts',
    'server/routes/skills.routes.ts',
    'server/routes/contact.routes.ts',
  ];

  const serviceFiles = [
    'server/services/content/category.service.ts',
    'server/services/content/project.service.ts',
    'server/services/content/blog.service.ts',
    'server/services/content/certification.service.ts',
    'server/services/content/skill.service.ts',
    'server/services/content/inquiry.service.ts',
  ];

  for (const path of contentRoutes) {
    const source = await text(path);
    assertNotContains(source, 'dbService', path);
    assertNotContains(source, 'MockDatabaseService', path);
    assertNotContains(source, 'PrismaClient', path);
    assertNotContains(source, 'prisma.', path);
    assertContains(source, 'contentServices', path);
  }

  for (const path of serviceFiles) {
    const source = await text(path);
    assertNotContains(source, "from 'express'", path);
    assertNotContains(source, 'PrismaClient', path);
    assertNotContains(source, 'prisma.', path);
  }

  const factory = await text('server/repositories/repository.factory.ts');
  assertContains(factory, "mode: 'prisma'", 'repository factory');
  assertContains(factory, 'DATABASE_URL is required', 'repository factory');
  assertNotContains(factory, 'Legacy', 'repository factory');
  assertNotContains(factory, "case 'legacy'", 'repository factory');
  assertNotContains(factory, 'legacyRepositories', 'repository factory');

  const env = await text('server/config/env.ts');
  assertContains(env, 'DATABASE_URL', 'environment validation');
  assertContains(env, 'Legacy persistence has been retired', 'retired persistence guard');
  assertNotContains(env, "export type PersistenceMode = 'legacy'", 'environment validation');

  const server = await text('server.ts');
  assertContains(server, 'contentRepositories.checkHealth()', 'health endpoint');
  assertContains(server, 'Number(env.PORT)', 'server port configuration');
  assertContains(server, "app.use('/api', errorHandler)", 'global API error handler');

  const network = await text('server/routes/network.routes.ts');
  assertNotContains(network, 'upload-pkt', 'retired Packet Tracer parser endpoint');
  assertContains(network, "router.post('/simulate-packet'", 'representative packet simulation');

  const apiClient = await text('src/lib/api.ts');
  assertContains(apiClient, 'if (!response.ok)', 'frontend API HTTP failure handling');
  assertContains(apiClient, 'payload.success !== true', 'frontend API envelope validation');
  assertNotContains(apiClient, 'uploadPktFile', 'retired Packet Tracer parser client');

  const context = await text('src/context/PortfolioContext.tsx');
  for (const state of ['loading', 'error', 'empty', 'loaded']) {
    assertContains(context, `'${state}'`, 'PortfolioContext data status');
  }
  assertContains(context, 'Retry', 'PortfolioContext retry state');

  const schema = await text('prisma/schema.prisma');
  for (const field of ['mission', 'architectureSummary', 'whatIBuilt']) {
    assertContains(schema, field, 'Prisma Project story fields');
  }
  for (const model of ['model Lab ', 'model LabNode ', 'model LabLink ', 'model LabScenario ', 'model Evidence ', 'model Artifact ']) {
    assertContains(schema, model, 'multi-project/multi-lab schema foundation');
  }

  const apiParityMigration = await text('prisma/migrations/20260814000000_phase_2b_api_parity/migration.sql');
  assertNotContains(apiParityMigration.toUpperCase(), 'DROP TABLE', 'API parity migration');
  assertNotContains(apiParityMigration.toUpperCase(), 'DROP COLUMN', 'API parity migration');
  assertContains(apiParityMigration, 'DROP INDEX "Lab_projectId_key"', 'multi-lab migration');
  assertContains(apiParityMigration, 'BlogPost_categoryId_fkey', 'Blog category relation migration');

  const activeContentFiles = [
    ...contentRoutes,
    ...serviceFiles,
    'server/repositories/prisma/category.repository.ts',
    'server/repositories/prisma/project.repository.ts',
    'server/repositories/prisma/blog.repository.ts',
    'server/repositories/prisma/certification.repository.ts',
    'server/repositories/prisma/skill.repository.ts',
    'server/repositories/prisma/inquiry.repository.ts',
  ];

  const forbiddenPatterns: Array<[RegExp, string]> = [
    [/\bnotImplemented\b/i, 'notImplemented'],
    [/id\s*:\s*['"]tmp['"]/i, 'temporary id'],
    [/Promise\.resolve\(input\)/i, 'fake Promise.resolve persistence'],
    [/TODO\s*[:_-]?\s*implement/i, 'TODO implement'],
  ];

  for (const path of activeContentFiles) {
    const source = await text(path);
    for (const [pattern, label] of forbiddenPatterns) {
      assert.ok(!pattern.test(source), `${path} contains forbidden active content persistence pattern: ${label}`);
    }
  }

  console.log('Content persistence static audit: PASS');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error';
  console.error(`Content persistence static audit: FAIL (${message})`);
  process.exitCode = 1;
});
