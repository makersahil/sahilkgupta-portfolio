import { prisma } from '../lib/prisma';
import { env } from '../config/env';

async function main() {
  if (!env.DATABASE_URL) {
    console.error('NOT EXECUTED — DATABASE_URL NOT CONFIGURED');
    process.exit(1);
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('DATABASE CONNECTION: OK');
    process.exit(0);
  } catch (error) {
    console.error('DATABASE CONNECTION: FAILED');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
