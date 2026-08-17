import 'dotenv/config';

import { databaseRateLimitService } from '../security/rate-limit.service.js';
import { disconnectPersistence } from '../lib/prisma.js';

async function main(): Promise<void> {
  const deleted = await databaseRateLimitService.prune();
  console.log(`Rate-limit cleanup: deleted ${deleted} expired bucket(s)`);
}

main()
  .catch((error) => {
    console.error('Rate-limit cleanup failed', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(() => disconnectPersistence());
