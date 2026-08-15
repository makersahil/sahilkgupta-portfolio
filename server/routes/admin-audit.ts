import type { Request } from 'express';

import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { auditService } from '../services/admin/audit.service.js';

export interface AdminAuditEvent {
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function recordAdminAudit(request: Request, event: AdminAuditEvent): Promise<void> {
  const authenticated = request as AuthenticatedRequest;
  if (!authenticated.user) return;

  const transportMetadata: Record<string, unknown> = {
    method: request.method,
    path: request.originalUrl.split('?')[0],
    ...(request.ip ? { ipAddress: request.ip } : {}),
    ...(typeof request.headers['user-agent'] === 'string'
      ? { userAgent: request.headers['user-agent'] }
      : {}),
  };

  try {
    await auditService.record({
      actorUserId: authenticated.user.id,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId ?? null,
      metadata: { ...transportMetadata, ...(event.metadata ?? {}) },
    });
  } catch (error) {
    // The mutation has already committed. Do not turn a successful write into a false failure.
    console.error('[Admin Audit] Failed to persist audit event', {
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId ?? null,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
