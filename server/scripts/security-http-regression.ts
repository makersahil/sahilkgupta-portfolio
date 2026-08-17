import 'dotenv/config';

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import http, { type Server } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';

interface Result {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Record<string, any>;
}

async function request(port: number, requestPath: string, options: { method?: string; headers?: Record<string, string>; body?: string } = {}): Promise<Result> {
  return new Promise((resolve, reject) => {
    const body = options.body ?? '';
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: requestPath,
      method: options.method ?? 'GET',
      headers: {
        Host: 'portfolio.example.test',
        'X-Forwarded-Proto': 'https',
        ...(body ? { 'Content-Length': String(Buffer.byteLength(body)) } : {}),
        ...options.headers,
      },
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve({ status: res.statusCode ?? 0, headers: res.headers, body: raw ? JSON.parse(raw) : {} });
      });
    });
    req.once('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) throw new Error('DATABASE_URL is required for security HTTP regression');
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = `${randomUUID()}${randomUUID()}`;
  process.env.RATE_LIMIT_ENABLED = 'false';
  const storageRoot = await mkdtemp(path.join(os.tmpdir(), 'portfolio-security-'));

  const [{ createPortfolioApp }, { loadEnvironment }, { disconnectPersistence }] = await Promise.all([
    import('../app.js'),
    import('../config/env.js'),
    import('../lib/prisma.js'),
  ]);
  // Keep the process itself in test mode so imported modules do not require
  // production secrets or enable unrelated shared throttling. Then promote only
  // the explicit app snapshot to production mode so this regression exercises
  // the real production header/cookie policy (including HSTS) over the trusted
  // X-Forwarded-Proto=https request path.
  const testEnvironment = loadEnvironment({
    ...process.env,
    NODE_ENV: 'test',
    PUBLIC_ORIGIN: 'https://portfolio.example.test',
    ALLOWED_HOSTS: 'portfolio.example.test',
    ALLOWED_ORIGINS: 'https://portfolio.example.test',
    TRUST_PROXY: '1',
    REQUIRE_HTTPS: 'true',
    SECURITY_ENFORCEMENT: 'true',
    CSRF_ENFORCEMENT: 'true',
    RATE_LIMIT_ENABLED: 'false',
    ARTIFACT_STORAGE_DIR: storageRoot,
  });
  const productionPolicyEnvironment = {
    ...testEnvironment,
    NODE_ENV: 'production' as const,
  };
  const app = createPortfolioApp({
    environment: productionPolicyEnvironment,
    enforceSecurity: true,
    enforceCsrf: true,
    serveFrontend: false,
  });
  let server: Server | null = null;
  try {
    server = await new Promise<Server>((resolve, reject) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
      listener.once('error', reject);
    });
    const port = (server.address() as AddressInfo).port;

    const live = await request(port, '/api/live', { headers: { 'X-Request-Id': 'request-test-0001' } });
    assert.equal(live.status, 200);
    assert.equal(live.body.status, 'alive');
    assert.equal(live.headers['x-request-id'], 'request-test-0001');
    assert.equal(live.headers['x-powered-by'], undefined);
    assert.match(String(live.headers['content-security-policy']), /frame-ancestors 'none'/);
    assert.match(String(live.headers['strict-transport-security']), /max-age=31536000/);
    assert.equal(live.headers['x-content-type-options'], 'nosniff');

    const ready = await request(port, '/api/ready');
    assert.equal(ready.status, 200);
    assert.equal(ready.body.status, 'ready');
    assert.equal(ready.body.dependencies.persistence.ready, true);
    assert.equal(ready.body.dependencies.artifactStorage.ready, true);

    const wrongHost = await request(port, '/api/live', { headers: { Host: 'evil.example.test' } });
    assert.equal(wrongHost.status, 403);

    const wrongOrigin = await request(port, '/api/live', { headers: { Origin: 'https://evil.example.test' } });
    assert.equal(wrongOrigin.status, 403);

    const csrf = await request(port, '/api/security/csrf', { headers: { Origin: 'https://portfolio.example.test' } });
    assert.equal(csrf.status, 200);
    assert.equal(typeof csrf.body.data.token, 'string');
    const setCookie = Array.isArray(csrf.headers['set-cookie']) ? csrf.headers['set-cookie'][0] : csrf.headers['set-cookie'];
    assert.ok(setCookie);
    const cookie = setCookie!.split(';', 1)[0];

    const noCsrf = await request(port, '/api/auth/login', {
      method: 'POST',
      headers: { Origin: 'https://portfolio.example.test', Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.invalid', password: 'invalid' }),
    });
    assert.equal(noCsrf.status, 403);
    assert.match(noCsrf.body.error.message, /CSRF/i);

    const acceptedCsrf = await request(port, '/api/auth/login', {
      method: 'POST',
      headers: {
        Origin: 'https://portfolio.example.test',
        Cookie: cookie,
        'X-CSRF-Token': csrf.body.data.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'nobody@example.invalid', password: 'invalid' }),
    });
    assert.equal(acceptedCsrf.status, 401);

    const crossSite = await request(port, '/api/auth/login', {
      method: 'POST',
      headers: {
        Origin: 'https://portfolio.example.test',
        Cookie: cookie,
        'X-CSRF-Token': csrf.body.data.token,
        'Sec-Fetch-Site': 'cross-site',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'nobody@example.invalid', password: 'invalid' }),
    });
    assert.equal(crossSite.status, 403);

    console.log('Production security HTTP regression: PASS');
  } finally {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    await disconnectPersistence();
    await rm(storageRoot, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(`Production security HTTP regression: FAIL (${error instanceof Error ? error.stack ?? error.message : String(error)})`);
  process.exitCode = 1;
});