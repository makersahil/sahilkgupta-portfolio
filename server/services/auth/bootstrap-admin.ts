import bcrypt from 'bcryptjs';

import { ValidationError } from '../../lib/errors.js';
import type { AuthRepository } from '../../repositories/contracts/auth.repository.js';
import { authRepository } from '../../repositories/prisma/auth.repository.js';
import { normalizeAuthEmail, toSafeAuthUser, type SafeAuthUser } from './auth.service.js';

const MIN_BOOTSTRAP_PASSWORD_LENGTH = 12;
const BCRYPT_ROUNDS = 12;

export interface BootstrapAdminOptions {
  email: string;
  password: string;
  displayName?: string;
}

export async function bootstrapAdmin(
  options: BootstrapAdminOptions,
  repository: AuthRepository = authRepository,
): Promise<SafeAuthUser> {
  const email = normalizeAuthEmail(options.email);
  const password = options.password;
  const displayName = options.displayName?.trim() || 'Sahil K Gupta';

  if (!email || !email.includes('@')) {
    throw new ValidationError('ADMIN_EMAIL must be a valid email address');
  }
  if (password.length < MIN_BOOTSTRAP_PASSWORD_LENGTH) {
    throw new ValidationError(
      `ADMIN_PASSWORD must contain at least ${MIN_BOOTSTRAP_PASSWORD_LENGTH} characters`,
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await repository.upsertBootstrapAdmin({
    email,
    displayName,
    passwordHash,
    role: 'SUPER_ADMIN',
  });

  // Password or role rotation invalidates all pre-existing browser sessions.
  await repository.revokeAllSessionsForUser(user.id, new Date());
  return toSafeAuthUser(user);
}
