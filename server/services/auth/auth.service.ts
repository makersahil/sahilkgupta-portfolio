import bcrypt from 'bcryptjs';

import { UnauthorizedError, ValidationError } from '../../lib/errors.js';
import { authRepository } from '../../repositories/prisma/auth.repository.js';
import type {
  AuthRepository,
  AuthRole,
  AuthSessionRecord,
  AuthUserRecord,
} from '../../repositories/contracts/auth.repository.js';

export const AUTH_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export interface SafeAuthUser {
  id: string;
  email: string;
  fullName: string;
  role: AuthRole;
  lastLoginAt?: string;
}

export interface LoginResult {
  user: SafeAuthUser;
  session: AuthSessionRecord;
}

export interface AuthenticatedSession {
  user: SafeAuthUser;
  sessionId: string;
  expiresAt: Date;
}

export function normalizeAuthEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function toSafeAuthUser(user: AuthUserRecord): SafeAuthUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.displayName,
    role: user.role,
    ...(user.lastLoginAt ? { lastLoginAt: user.lastLoginAt.toISOString() } : {}),
  };
}

export class AuthService {
  constructor(private readonly repository: AuthRepository = authRepository) {}

  async login(emailInput: unknown, passwordInput: unknown): Promise<LoginResult> {
    if (typeof emailInput !== 'string' || typeof passwordInput !== 'string') {
      throw new ValidationError('Email and password are required');
    }

    const email = normalizeAuthEmail(emailInput);
    const password = passwordInput;

    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    const user = await this.repository.findUserByEmail(email);
    if (!user || !user.isActive || !user.passwordHash) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const loginAt = new Date();
    const expiresAt = new Date(loginAt.getTime() + AUTH_SESSION_TTL_MS);
    const session = await this.repository.createLoginSession(user.id, expiresAt, loginAt);

    return {
      user: toSafeAuthUser({ ...user, lastLoginAt: loginAt }),
      session,
    };
  }

  async authenticateSession(userId: string, sessionId: string): Promise<AuthenticatedSession> {
    const session = await this.repository.findSessionWithUser(sessionId);
    const now = new Date();

    if (
      !session ||
      session.userId !== userId ||
      session.revokedAt ||
      session.expiresAt.getTime() <= now.getTime() ||
      !session.user.isActive
    ) {
      throw new UnauthorizedError('Authentication session is no longer valid');
    }

    const lastSeenMs = session.lastSeenAt?.getTime() ?? session.createdAt.getTime();
    if (now.getTime() - lastSeenMs >= SESSION_TOUCH_INTERVAL_MS) {
      await this.repository.touchSession(session.id, now);
    }

    return {
      user: toSafeAuthUser(session.user),
      sessionId: session.id,
      expiresAt: session.expiresAt,
    };
  }

  async logout(sessionId: string): Promise<void> {
    await this.repository.revokeSession(sessionId, new Date());
  }
}

export const authService = new AuthService();
