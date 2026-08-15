import type { UserRole as PrismaUserRole } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';
import type {
  AuthRepository,
  AuthRole,
  AuthSessionRecord,
  AuthSessionWithUser,
  AuthUserRecord,
  BootstrapAdminInput,
} from '../contracts/auth.repository.js';

type PrismaDataSource = typeof prisma;

type UserRow = {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string | null;
  role: PrismaUserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type SessionRow = {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  lastSeenAt: Date | null;
  createdAt: Date;
};

function mapUser(row: UserRow): AuthUserRecord {
  return {
    ...row,
    role: row.role as AuthRole,
  };
}

function mapSession(row: SessionRow): AuthSessionRecord {
  return { ...row };
}

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly db: PrismaDataSource = prisma) {}

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    const row = await this.db.user.findUnique({ where: { email } });
    return row ? mapUser(row) : null;
  }

  async findUserById(id: string): Promise<AuthUserRecord | null> {
    const row = await this.db.user.findUnique({ where: { id } });
    return row ? mapUser(row) : null;
  }

  async createLoginSession(userId: string, expiresAt: Date, loginAt: Date): Promise<AuthSessionRecord> {
    return this.db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { lastLoginAt: loginAt },
      });

      const session = await tx.authSession.create({
        data: {
          userId,
          expiresAt,
          lastSeenAt: loginAt,
        },
      });

      return mapSession(session);
    });
  }

  async findSessionWithUser(sessionId: string): Promise<AuthSessionWithUser | null> {
    const row = await this.db.authSession.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!row) return null;

    return {
      ...mapSession(row),
      user: mapUser(row.user),
    };
  }

  async touchSession(sessionId: string, seenAt: Date): Promise<void> {
    await this.db.authSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { lastSeenAt: seenAt },
    });
  }

  async revokeSession(sessionId: string, revokedAt: Date): Promise<boolean> {
    const result = await this.db.authSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt },
    });
    return result.count > 0;
  }

  async revokeAllSessionsForUser(userId: string, revokedAt: Date): Promise<number> {
    const result = await this.db.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt },
    });
    return result.count;
  }

  async deleteStaleSessions(before: Date): Promise<number> {
    const result = await this.db.authSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: before } },
          { revokedAt: { not: null, lt: before } },
        ],
      },
    });
    return result.count;
  }

  async upsertBootstrapAdmin(input: BootstrapAdminInput): Promise<AuthUserRecord> {
    const row = await this.db.user.upsert({
      where: { email: input.email },
      create: {
        email: input.email,
        displayName: input.displayName,
        passwordHash: input.passwordHash,
        role: input.role as PrismaUserRole,
        isActive: true,
      },
      update: {
        displayName: input.displayName,
        passwordHash: input.passwordHash,
        role: input.role as PrismaUserRole,
        isActive: true,
      },
    });
    return mapUser(row);
  }
}

export const authRepository = new PrismaAuthRepository();
