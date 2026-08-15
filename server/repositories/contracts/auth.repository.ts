export type AuthRole = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR';

export interface AuthUserRecord {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string | null;
  role: AuthRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSessionRecord {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  lastSeenAt: Date | null;
  createdAt: Date;
}

export interface AuthSessionWithUser extends AuthSessionRecord {
  user: AuthUserRecord;
}

export interface BootstrapAdminInput {
  email: string;
  displayName: string;
  passwordHash: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
  findUserById(id: string): Promise<AuthUserRecord | null>;
  createLoginSession(userId: string, expiresAt: Date, loginAt: Date): Promise<AuthSessionRecord>;
  findSessionWithUser(sessionId: string): Promise<AuthSessionWithUser | null>;
  touchSession(sessionId: string, seenAt: Date): Promise<void>;
  revokeSession(sessionId: string, revokedAt: Date): Promise<boolean>;
  revokeAllSessionsForUser(userId: string, revokedAt: Date): Promise<number>;
  deleteStaleSessions(before: Date): Promise<number>;
  upsertBootstrapAdmin(input: BootstrapAdminInput): Promise<AuthUserRecord>;
}
