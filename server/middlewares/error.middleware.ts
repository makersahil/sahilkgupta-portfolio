import { Request, Response, NextFunction } from 'express';
import { normalizeApplicationError } from '../lib/errors.js';

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  const applicationError = normalizeApplicationError(err);
  const original = err as { name?: unknown; code?: unknown; message?: unknown; stack?: unknown } | null;

  console.error('[Portfolio Error Handler]', {
    name: typeof original?.name === 'string' ? original.name : 'UnknownError',
    code: typeof original?.code === 'string' ? original.code : applicationError.code,
    message: applicationError.message,
  });

  res.status(applicationError.statusCode).json({
    success: false,
    error: {
      message: applicationError.message,
      code: applicationError.code,
      ...(applicationError.details && { details: applicationError.details }),
    },
  });
}
