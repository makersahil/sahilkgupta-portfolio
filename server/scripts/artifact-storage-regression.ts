import 'dotenv/config';

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) throw new Error('DATABASE_URL is required for managed artifact regression');
  process.env.NODE_ENV = 'test';
  const root = await mkdtemp(path.join(os.tmpdir(), 'portfolio-artifact-'));
  const [
    { ManagedArtifactStorage },
    { MediaService },
    { PrismaArtifactRepository },
    { prisma, disconnectPersistence },
  ] = await Promise.all([
    import('../services/media/managed-artifact-storage.js'),
    import('../services/media/media.service.js'),
    import('../repositories/prisma/artifact.repository.js'),
    import('../lib/prisma.js'),
  ]);
  const storage = new ManagedArtifactStorage(root, 1024 * 1024);
  const repository = new PrismaArtifactRepository(prisma);
  const service = new MediaService(repository, storage);
  let artifactId: string | null = null;
  try {
    const bytes = Buffer.from(JSON.stringify({ schemaVersion: 'phase9.test.v1', value: randomUUID() }), 'utf8');
    const asset = await service.registerManaged({
      originalName: 'integrity-fixture.json',
      mimeType: 'application/json',
      bytes,
      isPublic: false,
    });
    artifactId = asset.id;
    assert.equal(asset.managed, true);
    assert.equal(asset.storageProvider, 'LOCAL_MANAGED');
    assert.match(asset.sha256 ?? '', /^[a-f0-9]{64}$/);
    await assert.rejects(() => service.getDownload(asset.id, false), /not found/i);
    const download = await service.getDownload(asset.id, true);
    assert.deepEqual(download.bytes, bytes);
    const verified = await service.verifyManaged(asset.id);
    assert.equal(verified.valid, true);

    const row = await repository.findById(asset.id);
    assert.ok(row?.storageKey && row.sha256);
    const storedPath = path.join(root, row!.storageKey);
    assert.deepEqual(await readFile(storedPath), bytes);
    await writeFile(storedPath, Buffer.from('tampered', 'utf8'));
    await assert.rejects(() => service.verifyManaged(asset.id), /integrity/i);

    await assert.rejects(
      () => service.registerManaged({ originalName: 'fake.pdf', mimeType: 'application/pdf', bytes: Buffer.from('not-pdf') }),
      /signature/i,
    );
    await assert.rejects(
      () => service.registerManaged({ originalName: 'unsafe.svg', mimeType: 'image/svg+xml', bytes: Buffer.from('<svg><script>alert(1)</script></svg>') }),
      /not supported/i,
    );
    await assert.rejects(
      () => service.registerManaged({ originalName: 'unsafe.html', mimeType: 'text/html', bytes: Buffer.from('<script>alert(1)</script>') }),
      /not supported/i,
    );

    await service.delete(asset.id);
    artifactId = null;
    assert.equal(await repository.findById(asset.id), null);
    console.log('Managed artifact storage regression: PASS');
  } finally {
    if (artifactId) await prisma.artifact.deleteMany({ where: { id: artifactId } });
    await disconnectPersistence();
    await rm(root, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(`Managed artifact storage regression: FAIL (${error instanceof Error ? error.stack ?? error.message : String(error)})`);
  process.exitCode = 1;
});
