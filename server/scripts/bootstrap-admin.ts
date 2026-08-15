import 'dotenv/config';

import { bootstrapAdmin } from '../services/auth/bootstrap-admin.js';
import { prisma } from '../lib/prisma.js';

async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const displayName = process.env.ADMIN_DISPLAY_NAME?.trim();

  if (!email) {
    throw new Error('ADMIN_EMAIL is required for auth:bootstrap-admin');
  }
  if (!password) {
    throw new Error('ADMIN_PASSWORD is required for auth:bootstrap-admin');
  }

  const user = await bootstrapAdmin({ email, password, displayName });
  console.log(`Persistent administrator ready: ${user.email} (${user.role})`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown bootstrap error';
    console.error(`Admin bootstrap failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
