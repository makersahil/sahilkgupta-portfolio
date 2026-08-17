import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { AUTH_COOKIE_NAME, verifySessionToken } from '../lib/auth-token.js';
import { ForbiddenError, UnauthorizedError } from '../lib/errors.js';
import type { AuthRole } from '../repositories/contracts/auth.repository.js';
import { authService, type SafeAuthUser } from '../services/auth/auth.service.js';

export interface AuthenticatedRequest extends Request {
  user?: SafeAuthUser;
  authSessionId?: string;
}

export function extractAuthToken(req: Request): string | null {
  const authorization = req.headers.authorization;
  const bearerToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : '';
  if (bearerToken) return bearerToken;

  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  return typeof cookieToken === 'string' && cookieToken ? cookieToken : null;
}

export const authenticateToken: RequestHandler = (request, _response, next) => {
  const req = request as AuthenticatedRequest;

  void (async () => {
    const token = extractAuthToken(req);
    if (!token) {
      throw new UnauthorizedError('Authentication required');
    }

    const tokenPayload = verifySessionToken(token);
    const authenticated = await authService.authenticateSession(
      tokenPayload.userId,
      tokenPayload.sessionId,
    );

    req.user = authenticated.user;
    req.authSessionId = authenticated.sessionId;
    next();
  })().catch(next);
};

export const optionalAuthenticateToken: RequestHandler = (request, _response, next) => {
  const req = request as AuthenticatedRequest;
  void (async () => {
    const token = extractAuthToken(req);
    if (!token) { next(); return; }
    try {
      const tokenPayload = verifySessionToken(token);
      const authenticated = await authService.authenticateSession(tokenPayload.userId, tokenPayload.sessionId);
      req.user = authenticated.user;
      req.authSessionId = authenticated.sessionId;
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) throw error;
    }
    next();
  })().catch(next);
};

export function requireRole(...roles: AuthRole[]): RequestHandler {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const req = request as AuthenticatedRequest;
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError(`Forbidden: Requires one of roles [${roles.join(', ')}]`));
      return;
    }

    next();
  };
}
