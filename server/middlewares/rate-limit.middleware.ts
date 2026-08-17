import type { Request, RequestHandler } from 'express';

import { env } from '../config/env.js';
import { databaseRateLimitService, type RateLimitPolicy } from '../security/rate-limit.service.js';

export interface RateLimitMiddlewareOptions {
  policy: RateLimitPolicy;
  key?: (request: Request) => string;
  message?: string;
}

export function createRateLimitMiddleware(options: RateLimitMiddlewareOptions): RequestHandler {
  return async (request, response, next) => {
    try {
      if (!env.RATE_LIMIT_ENABLED) {
        next();
        return;
      }
      const key = options.key?.(request) ?? request.ip ?? 'unknown';
      const result = await databaseRateLimitService.assertAllowed(options.policy, key, options.message);
      response.setHeader('RateLimit-Limit', String(result.limit));
      response.setHeader('RateLimit-Remaining', String(Math.max(0, result.limit - result.count)));
      response.setHeader('RateLimit-Reset', String(Math.ceil(result.resetAt.getTime() / 1_000)));
      next();
    } catch (error) {
      next(error);
    }
  };
}
