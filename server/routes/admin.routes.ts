import { Router } from 'express';

import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../middlewares/async-handler.js';
import { ValidationError } from '../lib/errors.js';
import { auditService } from '../services/admin/audit.service.js';

const router = Router();
const adminOnly = [authenticateToken, requireRole('SUPER_ADMIN', 'ADMIN')] as const;

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new ValidationError(`${field} must be a string`);
  const normalized = value.trim();
  return normalized || undefined;
}

function optionalLimit(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) throw new ValidationError('limit must be a positive integer');
  return Number(value);
}

router.get(
  '/audit',
  ...adminOnly,
  asyncHandler(async (request, response) => {
    const logs = await auditService.list({
      limit: optionalLimit(request.query.limit),
      entityType: optionalString(request.query.entityType, 'entityType'),
      action: optionalString(request.query.action, 'action'),
      actorUserId: optionalString(request.query.actorUserId, 'actorUserId'),
    });
    response.json({ success: true, data: logs });
  }),
);

export default router;
