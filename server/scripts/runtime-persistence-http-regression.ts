import 'dotenv/config';

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

interface JsonResult {
  response: Response;
  payload: Record<string, any>;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) throw new Error('DATABASE_URL is required');
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = `${randomUUID()}${randomUUID()}`;

  const suffix = randomUUID().replaceAll('-', '');
  const email = `runtime-admin-${suffix}@example.invalid`;
  const password = `Runtime-${randomUUID()}!`;

  const [
    { default: express },
    { default: cookieParser },
    { default: bcrypt },
    { default: authRoutes },
    { default: mediaRoutes },
    { default: architectureRoutes },
    { default: networkRoutes },
    { errorHandler },
    { prisma },
  ] = await Promise.all([
    import('express'),
    import('cookie-parser'),
    import('bcryptjs'),
    import('../routes/auth.routes.js'),
    import('../routes/media.routes.js'),
    import('../routes/architecture.routes.js'),
    import('../routes/network.routes.js'),
    import('../middlewares/error.middleware.js'),
    import('../lib/prisma.js'),
  ]);

  const user = await prisma.user.create({
    data: {
      email,
      displayName: 'Persistent Runtime Regression Admin',
      passwordHash: await bcrypt.hash(password, 12),
      role: 'ADMIN',
      isActive: true,
    },
  });

  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use('/api/auth', authRoutes);
  app.use('/api/media', mediaRoutes);
  app.use('/api/architecture', architectureRoutes);
  app.use('/api/network', networkRoutes);
  app.use('/api', errorHandler);

  const server = await new Promise<Server>((resolve, reject) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    listener.once('error', reject);
  });
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  let artifactId: string | undefined;
  let runFailure: unknown;
  const cleanupFailures: string[] = [];

  async function requestJson(path: string, init?: RequestInit): Promise<JsonResult> {
    const response = await fetch(`${baseUrl}${path}`, init);
    const payload = (await response.json()) as Record<string, any>;
    return { response, payload };
  }

  function cookieHeader(result: JsonResult): string {
    const value = result.response.headers.get('set-cookie');
    assert.ok(value, 'login must set session cookie');
    return value.split(';', 1)[0];
  }

  try {
    const login = await requestJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(login.response.status, 200);
    const adminHeaders = {
      Cookie: cookieHeader(login),
      'Content-Type': 'application/json',
    };

    const beforeCount = await prisma.artifact.count();
    const created = await requestJson('/api/media/upload', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        originalName: `runtime-${suffix}.png`,
        mimeType: 'image/png',
        sizeBytes: 321,
        url: `https://example.invalid/assets/runtime-${suffix}.png`,
      }),
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.payload.success, true);
    assert.equal(typeof created.payload.data.id, 'string');
    assert.equal('s3Key' in created.payload.data, false, 'storage keys must not be exposed by the public media contract');
    artifactId = created.payload.data.id;
    const createdArtifactId = artifactId;

    const stored = await prisma.artifact.findUnique({ where: { id: createdArtifactId } });
    assert.ok(stored);
    assert.equal(stored.storageProvider, 'EXTERNAL');
    assert.equal(stored.sizeBytes, 321);
    assert.equal(stored.uploadedById, user.id);
    assert.equal(await prisma.artifact.count(), beforeCount + 1);

    const media = await requestJson('/api/media');
    assert.equal(media.response.status, 200);
    const publicArtifact = media.payload.data.find(({ id }: { id: string }) => id === createdArtifactId);
    assert.ok(publicArtifact);
    assert.equal('s3Key' in publicArtifact, false, 'public media listings must not expose storage keys');

    const blueprint = await requestJson('/api/architecture/blueprint');
    assert.equal(blueprint.response.status, 200);
    assert.deepEqual(blueprint.payload.data.metrics.persistence, { provider: 'PostgreSQL', orm: 'Prisma' });
    assert.equal(typeof blueprint.payload.data.metrics.content.projects, 'number');
    assert.equal(typeof blueprint.payload.data.metrics.labs.labs, 'number');
    assert.ok(blueprint.payload.data.metrics.labs.artifacts >= beforeCount + 1);
    assert.equal('cpuUsagePercent' in blueprint.payload.data.metrics, false);
    assert.equal('uptimeSeconds' in blueprint.payload.data.metrics, false);

    const simulation = await requestJson('/api/network/simulate-packet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId: 'pc_devops', targetId: 'srv_k8s' }),
    });
    assert.equal(simulation.response.status, 200);

    const retiredUpload = await fetch(`${baseUrl}/api/network/upload-pkt`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ fileName: 'retired.pkt' }),
    });
    assert.equal(retiredUpload.status, 404, 'legacy Packet Tracer parser endpoint must be retired');

    const deleted = await requestJson(`/api/media/${createdArtifactId}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    assert.equal(deleted.response.status, 200);
    assert.equal(await prisma.artifact.count({ where: { id: createdArtifactId } }), 0);
    artifactId = undefined;

    const audits = await prisma.auditLog.findMany({
      where: { actorUserId: user.id, action: { in: ['ARTIFACT_REFERENCE_CREATE', 'ARTIFACT_DELETE'] } },
    });
    assert.equal(audits.length, 2);
  } catch (error) {
    runFailure = error;
  } finally {
    if (artifactId) {
      try { await prisma.artifact.deleteMany({ where: { id: artifactId } }); } catch { cleanupFailures.push('artifact'); }
    }
    try { await prisma.auditLog.deleteMany({ where: { actorUserId: user.id } }); } catch { cleanupFailures.push('audit'); }
    try { await prisma.user.delete({ where: { id: user.id } }); } catch { cleanupFailures.push('user'); }
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    await prisma.$disconnect();
  }

  if (cleanupFailures.length) throw new Error(`Persistent runtime regression cleanup failed: ${cleanupFailures.join(', ')}`);
  if (runFailure) throw runFailure;
  console.log('Persistent runtime HTTP regression: PASS');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error';
  console.error(`Persistent runtime HTTP regression: FAIL (${message})`);
  process.exitCode = 1;
});
