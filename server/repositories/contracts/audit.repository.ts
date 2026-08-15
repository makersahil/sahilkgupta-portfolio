export interface AuditActorSummary {
  id: string;
  email: string;
  displayName: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR';
}

export interface AuditLogRecord {
  id: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  createdAt: Date;
  actorUser: AuditActorSummary | null;
}

export interface CreateAuditLogInput {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: unknown;
}

export interface AuditLogQuery {
  limit?: number;
  actorUserId?: string;
  entityType?: string;
  action?: string;
}

export interface AuditRepository {
  create(input: CreateAuditLogInput): Promise<AuditLogRecord>;
  findMany(query?: AuditLogQuery): Promise<AuditLogRecord[]>;
}
