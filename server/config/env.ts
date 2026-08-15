import dotenv from 'dotenv';
import { ConfigurationError } from '../lib/errors.js';

dotenv.config();

function validateRetiredPersistenceMode(value = process.env.PERSISTENCE_MODE): void {
  const normalized = value?.trim().toLowerCase();
  if (normalized && normalized !== 'prisma') {
    throw new ConfigurationError('Legacy persistence has been retired. Remove PERSISTENCE_MODE or set it to "prisma".');
  }
}

validateRetiredPersistenceMode();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  ADMIN_DISPLAY_NAME: process.env.ADMIN_DISPLAY_NAME,
  PORT: process.env.PORT || 3000,
};
