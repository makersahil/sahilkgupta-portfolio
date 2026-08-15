import dotenv from 'dotenv';
import { ConfigurationError } from '../lib/errors.js';

dotenv.config();

export type PersistenceMode = 'legacy' | 'prisma';

export function resolvePersistenceMode(
  configuredMode = process.env.PERSISTENCE_MODE,
  nodeEnv = process.env.NODE_ENV || 'development',
): PersistenceMode {
  const normalizedMode = configuredMode?.trim().toLowerCase();

  if (normalizedMode !== undefined && normalizedMode !== 'legacy' && normalizedMode !== 'prisma') {
    throw new ConfigurationError('PERSISTENCE_MODE must be either "legacy" or "prisma"');
  }

  if (nodeEnv === 'production' && normalizedMode !== 'prisma') {
    throw new ConfigurationError('PERSISTENCE_MODE=prisma is required in production');
  }

  if (normalizedMode === 'prisma') return 'prisma';
  return 'legacy';
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PERSISTENCE_MODE: resolvePersistenceMode(),
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  ADMIN_DISPLAY_NAME: process.env.ADMIN_DISPLAY_NAME,
  PORT: process.env.PORT || 3000,
};
