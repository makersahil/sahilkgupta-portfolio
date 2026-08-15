import { ValidationError } from '../../lib/errors.js';
import type {
  AuditLogQuery,
  AuditLogRecord,
  AuditRepository,
  CreateAuditLogInput,
} from '../../repositories/contracts/audit.repository.js';
import { auditRepository } from '../../repositories/prisma/audit.repository.js';

const MAX_AUDIT_LIMIT = 250;

function normalizeLimit(value: number | undefined): number {
  if (value === undefined) return 100;
  if (!Number.isInteger(value) || value < 1 || value > MAX_AUDIT_LIMIT) {
    throw new ValidationError(`limit must be an integer between 1 and ${MAX_AUDIT_LIMIT}`);
  }
  return value;
}

function requiredText(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new ValidationError(`${field} is required`);
  return normalized;
}

export class AuditService {
  constructor(private readonly repository: AuditRepository = auditRepository) {}

  list(query: AuditLogQuery = {}): Promise<AuditLogRecord[]> {
    return this.repository.findMany({ ...query, limit: normalizeLimit(query.limit) });
  }

  record(input: CreateAuditLogInput): Promise<AuditLogRecord> {
    return this.repository.create({
      ...input,
      action: requiredText(input.action, 'action'),
      entityType: requiredText(input.entityType, 'entityType'),
      entityId: input.entityId?.trim() || null,
    });
  }
}

export const auditService = new AuditService();
