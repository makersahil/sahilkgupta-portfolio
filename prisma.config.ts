import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';

dotenv.config();

const cliDatabaseUrl = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();

if (!cliDatabaseUrl) {
  throw new Error('DIRECT_URL or DATABASE_URL is required for Prisma CLI commands');
}

export default defineConfig({
  datasource: {
    // Prefer a direct PostgreSQL connection for migrations/introspection.
    // DATABASE_URL remains the pooled runtime connection used by the app.
    url: cliDatabaseUrl,
  },
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
