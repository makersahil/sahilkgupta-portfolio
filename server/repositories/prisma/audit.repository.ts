import type { Prisma } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';
import type {
  AuditLogQuery,
  AuditLogRecord,
  AuditRepository,
  CreateAuditLogInput,
} from '../contracts/audit.repository.js';

const auditInclude = {
  actorUser: {
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
    },
  },
} satisfies Prisma.AuditLogInclude;

type AuditRow = Prisma.AuditLogGetPayload<{ include: typeof auditInclude }>;

function mapAudit(row: AuditRow): AuditLogRecord {
  return {
    id: row.id,
    actorUserId: row.actorUserId,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    metadata: row.metadata,
    createdAt: row.createdAt,
    actorUser: row.actorUser
      ? {
          id: row.actorUser.id,
          email: row.actorUser.email,
          displayName: row.actorUser.displayName,
          role: row.actorUser.role,
        }
      : null,
  };
}

export class PrismaAuditRepository implements AuditRepository {
  async create(input: CreateAuditLogInput): Promise<AuditLogRecord> {
    const row = await prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: input.metadata === undefined ? undefined : (input.metadata as Prisma.InputJsonValue),
      },
      include: auditInclude,
    });
    return mapAudit(row);
  }

  async findMany(query: AuditLogQuery = {}): Promise<AuditLogRecord[]> {
    const rows = await prisma.auditLog.findMany({
      where: {
        ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
        ...(query.entityType ? { entityType: query.entityType } : {}),
        ...(query.action ? { action: query.action } : {}),
      },
      include: auditInclude,
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 100,
    });
    return rows.map(mapAudit);
  }

}

export const auditRepository = new PrismaAuditRepository();
