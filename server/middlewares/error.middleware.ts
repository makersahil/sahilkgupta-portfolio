import type { NextFunction, Request, Response } from 'express';

import { normalizeApplicationError } from '../lib/errors.js';
import { log } from '../lib/logger.js';

export function errorHandler(err: unknown, request: Request, response: Response, _next: NextFunction): void {
  const applicationError = normalizeApplicationError(err);
  const retryAfterSeconds = applicationError.details?.retryAfterSeconds;
  if (typeof retryAfterSeconds === 'number') response.setHeader('Retry-After', String(retryAfterSeconds));

  log(applicationError.statusCode >= 500 ? 'error' : 'warn', 'request_error', {
    requestId: request.requestId,
    method: request.method,
    path: request.path,
    statusCode: applicationError.statusCode,
    code: applicationError.code,
    message: applicationError.message,
    error: err instanceof Error ? err : undefined,
  });

  response.status(applicationError.statusCode).json({
    success: false,
    error: {
      message: applicationError.message,
      code: applicationError.code,
      ...(applicationError.details && { details: applicationError.details }),
      ...(request.requestId && { requestId: request.requestId }),
    },
  });
}
