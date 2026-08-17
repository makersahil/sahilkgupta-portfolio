import { randomUUID } from 'node:crypto';

import type { RequestHandler } from 'express';

import { log } from '../lib/logger.js';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

function requestIdFromHeader(value: unknown): string | null {
  return typeof value === 'string' && REQUEST_ID_PATTERN.test(value) ? value : null;
}

export const requestContext: RequestHandler = (request, response, next) => {
  const requestId = requestIdFromHeader(request.headers['x-request-id']) ?? randomUUID();
  const startedAt = process.hrtime.bigint();
  request.requestId = requestId;
  response.setHeader('X-Request-Id', requestId);

  response.once('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    log('info', 'http_request', {
      requestId,
      method: request.method,
      path: request.path,
      statusCode: response.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
    });
  });

  next();
};
