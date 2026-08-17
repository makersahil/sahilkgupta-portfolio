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
  const authRoute = await text('server/routes/auth.routes.ts');
  const authMiddleware = await text('server/middlewares/auth.middleware.ts');
  const authService = await text('server/services/auth/auth.service.ts');
  const authRepository = await text('server/repositories/prisma/auth.repository.ts');
  const bootstrap = await text('server/scripts/bootstrap-admin.ts');
  const seed = await text('prisma/seed.ts');
  const schema = await text('prisma/schema.prisma');
  const migration = await text('prisma/migrations/20260815000000_phase_2c_persistent_auth/migration.sql');
  const apiClient = await text('src/lib/api.ts');
  const authContract = await text('server/repositories/contracts/auth.repository.ts');
  const loginLimiter = await text('server/security/login-rate-limiter.ts');
  const rateLimitService = await text('server/security/rate-limit.service.ts');

  for (const [source, label] of [
    [authRoute, 'auth route'],
    [authMiddleware, 'auth middleware'],
    [authService, 'auth service'],
    [authRepository, 'auth repository'],
  ] as const) {
    assertNotContains(source, 'dbService', label);
    assertNotContains(source, 'MockDatabaseService', label);
  }

  assertContains(schema, 'model AuthSession', 'Prisma auth schema');
  assertContains(schema, 'lastLoginAt', 'Prisma User schema');
  assertContains(migration, 'CREATE TABLE "AuthSession"', 'auth migration');
  assertNotContains(migration.toUpperCase(), 'DROP TABLE', 'auth migration');
  assertNotContains(migration.toUpperCase(), 'DROP COLUMN', 'auth migration');

  assertContains(authMiddleware, 'authService.authenticateSession', 'persisted middleware validation');
  assertNotContains(authMiddleware, 'decoded.role', 'auth middleware');
  assertNotContains(authMiddleware, 'role: decoded', 'auth middleware');
  assertContains(authRoute, 'AUTH_COOKIE_NAME', 'auth cookie route');
  assertNotContains(authRoute, 'ADMIN_PASSWORD', 'runtime login route');
  assertNotContains(authRoute, 'process.env.ADMIN_PASSWORD', 'runtime login route');

  assertContains(bootstrap, 'ADMIN_EMAIL', 'admin bootstrap');
  assertContains(bootstrap, 'ADMIN_PASSWORD', 'admin bootstrap');
  assertNotContains(seed, 'prisma.user.', 'normal portfolio seed');
  assertNotContains(seed, 'passwordHash:', 'normal portfolio seed');

  assertNotContains(apiClient, 'nexus_auth_token', 'frontend API client');
  assertNotContains(apiClient, 'localStorage', 'frontend API client');
  assertContains(apiClient, "credentials: 'same-origin'", 'frontend cookie authentication');

  assertNotContains(authContract, "'VIEWER'", 'server RBAC roles');
  assertContains(authContract, "'SUPER_ADMIN' | 'ADMIN' | 'EDITOR'", 'server RBAC roles');
  assertContains(loginLimiter, 'DatabaseRateLimitService', 'shared login limiter');
  assertContains(rateLimitService, 'rateLimitBucket', 'PostgreSQL rate-limit persistence');
  assertNotContains(loginLimiter, 'new Map', 'shared login limiter');

  console.log('Authentication static audit: PASS');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error';
  console.error(`Authentication static audit: FAIL (${message})`);
  process.exitCode = 1;
});
