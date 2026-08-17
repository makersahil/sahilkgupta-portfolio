import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function text(path: string): Promise<string> {
  return readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

async function main(): Promise<void> {
  const [
    schema,
    migration,
    app,
    server,
    env,
    securityPolicy,
    csrf,
    requestContext,
    logger,
    rateLimit,
    loginLimiter,
    mediaRoutes,
    mediaService,
    storage,
    api,
    picker,
    verify,
    packageJson,
    gitignore,
  ] = await Promise.all([
    text('prisma/schema.prisma'),
    text('prisma/migrations/20260817090000_phase_9_production_hardening/migration.sql'),
    text('server/app.ts'),
    text('server.ts'),
    text('server/config/env.ts'),
    text('server/security/security-policy.ts'),
    text('server/security/csrf.ts'),
    text('server/middlewares/request-context.ts'),
    text('server/lib/logger.ts'),
    text('server/security/rate-limit.service.ts'),
    text('server/security/login-rate-limiter.ts'),
    text('server/routes/media.routes.ts'),
    text('server/services/media/media.service.ts'),
    text('server/services/media/managed-artifact-storage.ts'),
    text('src/lib/api.ts'),
    text('src/components/AdminOrchestrator/ArtifactReferencePicker.tsx'),
    text('server/scripts/verify.ts'),
    text('package.json'),
    text('.gitignore'),
  ]);

  assert.match(schema, /model RateLimitBucket/);
  assert.match(schema, /@@unique\(\[scope, keyHash, windowStart\]\)/);
  assert.match(migration, /CREATE TABLE "RateLimitBucket"/);
  assert.doesNotMatch(migration, /DROP\s+(TABLE|COLUMN)|TRUNCATE|DELETE\s+FROM/i);

  assert.match(app, /createPortfolioApp/);
  assert.match(app, /createSecurityPolicy/);
  assert.match(app, /createCsrfProtection/);
  assert.match(app, /app\.disable\('x-powered-by'\)/);
  assert.match(server, /createConfiguredHttpServer/);
  assert.match(server, /SIGTERM/);
  assert.match(server, /disconnectPersistence/);
  assert.match(env, /sslmode=verify-full/);
  assert.match(env, /PUBLIC_ORIGIN/);
  assert.match(env, /ARTIFACT_STORAGE_DIR/);
  assert.match(env, /HTTP_HEADERS_TIMEOUT_MS must not exceed/);
  assert.match(env, /TRUST_PROXY=true is too broad/);
  assert.match(env, /requireVerifyFullDatabaseUrl/);
  assert.match(env, /shared rate-limit enforcement must be enabled|rate-limit enforcement must be enabled/);

  for (const header of ['Content-Security-Policy', 'Strict-Transport-Security', 'X-Content-Type-Options', 'Permissions-Policy']) {
    assert.match(securityPolicy, new RegExp(header));
  }
  assert.match(csrf, /timingSafeEqual/);
  assert.match(csrf, /createHmac\('sha256'/);
  assert.match(csrf, /sessionBinding/);
  assert.match(csrf, /X-CSRF-Token|x-csrf-token/);
  assert.match(api, /ensureCsrfToken/);
  assert.match(requestContext, /X-Request-Id/);
  assert.match(logger, /REDACTED/);
  assert.doesNotMatch(logger, /console\.log\(metadata\)/);

  assert.match(rateLimit, /rateLimitBucket\.upsert/);
  assert.match(rateLimit, /createHmac\('sha256'/);
  assert.doesNotMatch(loginLimiter, /new Map/);
  assert.match(loginLimiter, /DatabaseRateLimitService/);

  assert.match(storage, /createHash\('sha256'\)/);
  assert.match(storage, /flag: 'wx'/);
  assert.match(storage, /COPYFILE_EXCL/);
  assert.match(storage, /path escaped the storage root/);
  assert.match(mediaService, /LOCAL_MANAGED/);
  assert.match(mediaService, /MANAGED_MIME_TYPES/);
  assert.doesNotMatch(mediaService, /'image\/svg\+xml'/);
  assert.match(mediaService, /validateSignature/);
  assert.match(mediaService, /resolveAssociation/);
  assert.match(mediaRoutes, /verify-integrity/);
  assert.match(mediaRoutes, /application\/octet-stream/);
  assert.match(mediaRoutes, /canReadPrivateArtifact/);
  assert.match(mediaRoutes, /if-none-match/);
  assert.match(picker, /Upload managed bytes/);
  assert.match(picker, /server-calculated SHA-256/);

  const runtimeSources = [app, server, env, securityPolicy, csrf, requestContext, logger, rateLimit, mediaRoutes, mediaService, storage].join('\n');
  assert.doesNotMatch(runtimeSources, /eval\(|new Function|Function\(|from ['"]node:child_process['"]|require\(['"]child_process/i);
  assert.doesNotMatch(runtimeSources, /proj-cisco|proj-rhel|cisco-enterprise-wan-bgp-hsrp/i);

  assert.match(verify, /Phase 9 production security static audit/);
  assert.match(verify, /Managed artifact storage regression/);
  assert.match(verify, /Deployment and graceful-shutdown regression/);
  assert.match(packageJson, /test:phase9:static/);
  assert.match(packageJson, /test:performance/);
  assert.match(gitignore, /\.runtime\//);
  assert.doesNotMatch(packageJson, /@google\/genai/);

  console.log('Phase 9 production security static audit: PASS');
}

main().catch((error: unknown) => {
  console.error(`Phase 9 production security static audit: FAIL (${error instanceof Error ? error.stack ?? error.message : String(error)})`);
  process.exitCode = 1;
});
