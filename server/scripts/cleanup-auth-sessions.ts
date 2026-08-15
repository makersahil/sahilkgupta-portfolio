import 'dotenv/config';

import { authRepository } from '../repositories/prisma/auth.repository.js';
import { prisma } from '../lib/prisma.js';

async function main(): Promise<void> {
  const retentionDays = 7;
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const deleted = await authRepository.deleteStaleSessions(cutoff);
  console.log(`Removed ${deleted} expired/revoked authentication sessions older than ${retentionDays} days.`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown cleanup error';
    console.error(`Authentication session cleanup failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
