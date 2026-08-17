import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import type { AddressInfo } from 'node:net';

import { loadEnvironment } from '../config/env.js';
import { closeHttpServer, createConfiguredHttpServer } from '../runtime/http-server.js';

async function main(): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'portfolio-deploy-'));
  const base = {
    NODE_ENV: 'production',
    PORT: '3000',
    DATABASE_URL: 'postgresql://user:password@db.example.invalid/db?sslmode=verify-full',
    DIRECT_URL: 'postgresql://user:password@db-direct.example.invalid/db?sslmode=verify-full',
    JWT_SECRET: '0123456789abcdef0123456789abcdef',
    CSRF_SECRET: 'abcdef0123456789abcdef0123456789',
    RATE_LIMIT_HASH_SECRET: 'fedcba9876543210fedcba9876543210',
    RATE_LIMIT_ENABLED: 'true',
    REQUIRE_HTTPS: 'true',
    SECURITY_ENFORCEMENT: 'true',
    CSRF_ENFORCEMENT: 'true',
    ARTIFACT_STORAGE_ENABLED: 'true',
    PUBLIC_ORIGIN: 'https://portfolio.example.test',
    ALLOWED_HOSTS: 'portfolio.example.test',
    ALLOWED_ORIGINS: 'https://portfolio.example.test',
    TRUST_PROXY: '1',
    ARTIFACT_STORAGE_DIR: root,
  } as NodeJS.ProcessEnv;
  try {
    const environment = loadEnvironment(base);
    assert.equal(environment.NODE_ENV, 'production');
    assert.equal(environment.REQUIRE_HTTPS, true);
    assert.equal(environment.CSRF_ENFORCEMENT, true);
    assert.equal(environment.RATE_LIMIT_ENABLED, true);
    assert.equal(environment.TRUST_PROXY, 1);

    assert.throws(() => loadEnvironment({ ...base, PUBLIC_ORIGIN: 'http://portfolio.example.test' }), /https/i);
    assert.throws(() => loadEnvironment({ ...base, JWT_SECRET: 'weak' }), /32 characters/i);
    assert.throws(() => loadEnvironment({ ...base, DATABASE_URL: base.DATABASE_URL!.replace('verify-full', 'require') }), /verify-full/i);
    assert.throws(() => loadEnvironment({ ...base, DATABASE_URL: `${base.DATABASE_URL}&note=sslmode%3Dverify-full`.replace('sslmode=verify-full&', 'sslmode=require&') }), /verify-full/i);
    assert.throws(() => loadEnvironment({ ...base, PUBLIC_ORIGIN: 'https://portfolio.example.test/path' }), /only an origin/i);
    assert.throws(() => loadEnvironment({ ...base, ALLOWED_ORIGINS: 'ftp://portfolio.example.test' }), /http or https/i);
    assert.throws(() => loadEnvironment({ ...base, TRUST_PROXY: 'true' }), /too broad/i);
    assert.throws(() => loadEnvironment({ ...base, CSRF_SECRET: '' }), /CSRF_SECRET/i);
    assert.throws(() => loadEnvironment({ ...base, RATE_LIMIT_ENABLED: 'false' }), /must be enabled/i);
    assert.throws(() => loadEnvironment({ ...base, ARTIFACT_STORAGE_DIR: '.runtime/artifacts' }), /absolute/i);

    const app = express();
    app.get('/test', (_request, response) => response.json({ success: true }));
    const server = createConfiguredHttpServer(app, environment);
    assert.equal(server.requestTimeout, environment.HTTP_REQUEST_TIMEOUT_MS);
    assert.equal(server.headersTimeout, environment.HTTP_HEADERS_TIMEOUT_MS);
    assert.equal(server.keepAliveTimeout, environment.HTTP_KEEP_ALIVE_TIMEOUT_MS);
    await new Promise<void>((resolve, reject) => {
      server.listen(0, '127.0.0.1', resolve);
      server.once('error', reject);
    });
    const port = (server.address() as AddressInfo).port;
    const response = await fetch(`http://127.0.0.1:${port}/test`);
    assert.equal(response.status, 200);
    await closeHttpServer(server, 2_000);
    assert.equal(server.listening, false);
    console.log('Deployment and graceful-shutdown regression: PASS');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(`Deployment and graceful-shutdown regression: FAIL (${error instanceof Error ? error.stack ?? error.message : String(error)})`);
  process.exitCode = 1;
});
