import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import type { Request, RequestHandler, Response } from 'express';

import { env } from '../config/env.js';
import { AUTH_COOKIE_NAME } from '../lib/auth-token.js';
import { ForbiddenError } from '../lib/errors.js';

export const CSRF_COOKIE_NAME = 'portfolio_csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}\.[A-Za-z0-9_-]{32,128}$/;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const DEVELOPMENT_SECRET = randomBytes(32).toString('base64url');

function cookieOptions(production: boolean) {
  return {
    httpOnly: false,
    secure: production,
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 8 * 60 * 60 * 1000,
  };
}

function csrfSecret(): string {
  return env.CSRF_SECRET
    || env.JWT_SECRET
    || (env.NODE_ENV === 'production' ? '' : DEVELOPMENT_SECRET);
}

function sessionBinding(sessionToken: unknown): string {
  if (typeof sessionToken !== 'string' || !sessionToken) return 'anonymous';
  return createHash('sha256').update(sessionToken).digest('base64url');
}

function signature(nonce: string, binding: string): string {
  const secret = csrfSecret();
  if (!secret) throw new ForbiddenError('CSRF protection is not configured');
  return createHmac('sha256', secret).update(`portfolio-csrf-v1|${binding}|${nonce}`).digest('base64url');
}

function equalTokens(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function validSignedToken(value: unknown, binding: string): value is string {
  if (typeof value !== 'string' || !TOKEN_PATTERN.test(value)) return false;
  const [nonce, suppliedSignature] = value.split('.', 2);
  return equalTokens(suppliedSignature, signature(nonce, binding));
}

function createToken(binding: string): string {
  const nonce = randomBytes(32).toString('base64url');
  return `${nonce}.${signature(nonce, binding)}`;
}

function requestBinding(request: Request): string {
  return sessionBinding(request.cookies?.[AUTH_COOKIE_NAME]);
}

export function setCsrfToken(response: Response, production: boolean, authToken?: string): string {
  const token = createToken(sessionBinding(authToken));
  response.cookie(CSRF_COOKIE_NAME, token, cookieOptions(production));
  response.setHeader('X-CSRF-Token', token);
  return token;
}

export function issueCsrfToken(request: Request, response: Response, production: boolean): string {
  const binding = requestBinding(request);
  const existing = request.cookies?.[CSRF_COOKIE_NAME];
  const token = validSignedToken(existing, binding) ? existing : createToken(binding);
  if (token !== existing) response.cookie(CSRF_COOKIE_NAME, token, cookieOptions(production));
  response.setHeader('X-CSRF-Token', token);
  return token;
}

function browserLikeRequest(request: Request): boolean {
  return Boolean(request.headers.origin || request.headers['sec-fetch-site'] || request.headers.cookie);
}

export function createCsrfProtection(options: { enforce: boolean; production: boolean }): RequestHandler {
  return (request, response, next) => {
    try {
      if (SAFE_METHODS.has(request.method)) {
        // Safe reads do not mint CSRF tokens implicitly. The dedicated
        // /api/security/csrf endpoint is the single anonymous issuance path,
        // while login/logout explicitly rebind the token to auth state.
        next();
        return;
      }

      const bearerOnly = typeof request.headers.authorization === 'string' && !request.headers.cookie;
      if (!options.enforce || bearerOnly || !browserLikeRequest(request)) {
        next();
        return;
      }

      const binding = requestBinding(request);
      const cookieToken = request.cookies?.[CSRF_COOKIE_NAME];
      const headerToken = request.headers[CSRF_HEADER_NAME];
      if (
        !validSignedToken(cookieToken, binding)
        || !validSignedToken(headerToken, binding)
        || !equalTokens(cookieToken, headerToken)
      ) {
        throw new ForbiddenError('CSRF token is missing or invalid');
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
