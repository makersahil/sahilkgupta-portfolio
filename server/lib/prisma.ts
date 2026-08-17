import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { env } from '../config/env.js';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaPool?: Pool;
};

export const prismaPool = globalForPrisma.prismaPool ?? new Pool({
  connectionString: env.DATABASE_URL,
  max: env.NODE_ENV === 'production' ? 10 : 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  allowExitOnIdle: env.NODE_ENV === 'test',
});
const adapter = new PrismaPg(prismaPool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaPool = prismaPool;
}

let disconnectPromise: Promise<void> | null = null;

export function disconnectPersistence(): Promise<void> {
  disconnectPromise ??= (async () => {
    await prisma.$disconnect().catch(() => undefined);
    await prismaPool.end().catch(() => undefined);
  })();
  return disconnectPromise;
}
