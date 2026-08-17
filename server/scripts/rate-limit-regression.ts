import 'dotenv/config';

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) throw new Error('DATABASE_URL is required for rate-limit regression');
  process.env.NODE_ENV = 'test';
  process.env.RATE_LIMIT_ENABLED = 'true';
  process.env.JWT_SECRET = `${randomUUID()}${randomUUID()}`;
  const [{ DatabaseRateLimitService }, { prisma, disconnectPersistence }, { TooManyRequestsError }] = await Promise.all([
    import('../security/rate-limit.service.js'),
    import('../lib/prisma.js'),
    import('../lib/errors.js'),
  ]);
  const service = new DatabaseRateLimitService(prisma);
  const scope = `phase9.rate.${randomUUID()}`;
  const rawKey = `raw-ip-email-${randomUUID()}@example.invalid`;
  const policy = { scope, limit: 2, windowMs: 60_000 };
  try {
    const results = await Promise.all([
      service.consume(policy, rawKey),
      service.consume(policy, rawKey),
      service.consume(policy, rawKey),
    ]);
    assert.equal(results.filter((entry) => entry.allowed).length, 2);
    assert.equal(results.filter((entry) => !entry.allowed).length, 1);
    await assert.rejects(() => service.assertAllowed(policy, rawKey), TooManyRequestsError);
    const rows = await prisma.rateLimitBucket.findMany({ where: { scope } });
    assert.equal(rows.length, 1);
    assert.notEqual(rows[0].keyHash, rawKey);
    assert.match(rows[0].keyHash, /^[a-f0-9]{64}$/);
    await service.clear(policy, rawKey);
    assert.equal(await prisma.rateLimitBucket.count({ where: { scope } }), 0);
    console.log('Shared PostgreSQL rate-limit regression: PASS');
  } finally {
    await prisma.rateLimitBucket.deleteMany({ where: { scope } });
    await disconnectPersistence();
  }
}

main().catch((error: unknown) => {
  console.error(`Shared PostgreSQL rate-limit regression: FAIL (${error instanceof Error ? error.stack ?? error.message : String(error)})`);
  process.exitCode = 1;
});
