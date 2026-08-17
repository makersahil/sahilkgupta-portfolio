import type { Request, RequestHandler, Response } from 'express';

import { ForbiddenError, ValidationError } from '../lib/errors.js';
import type { EnvironmentSnapshot } from '../config/env.js';

export interface SecurityPolicyOptions {
  environment: EnvironmentSnapshot;
  enforce?: boolean;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function requestOrigin(request: Request): string | null {
  const value = request.headers.origin;
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    return new URL(value).origin;
  } catch {
    throw new ValidationError('Origin header is invalid');
  }
}

function normalizedHost(request: Request): string {
  const raw = request.headers.host ?? '';
  return raw.trim().toLowerCase().replace(/\.$/, '');
}

function applyCors(request: Request, response: Response, allowedOrigins: string[]): void {
  const origin = requestOrigin(request);
  if (!origin || !allowedOrigins.includes(origin)) return;
  response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.vary('Origin');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Lab-Session, X-Request-Id, X-File-Name, X-Artifact-Mime-Type, X-Artifact-Public, X-Project-Id, X-Lab-Id');
  response.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS');
  response.setHeader('Access-Control-Max-Age', '600');
}

function securityHeaders(request: Request, response: Response, production: boolean): void {
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    production
      ? "script-src 'self'"
      : "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    production
      ? "connect-src 'self'"
      : "connect-src 'self' ws: wss:",
    ...(production ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
  response.setHeader('Content-Security-Policy', csp);
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  response.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  if (production && request.secure) {
    response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
}

export function createSecurityPolicy(options: SecurityPolicyOptions): RequestHandler {
  const { environment } = options;
  const enforce = options.enforce ?? environment.SECURITY_ENFORCEMENT;
  return (request, response, next) => {
    try {
      securityHeaders(request, response, environment.NODE_ENV === 'production');
      applyCors(request, response, environment.ALLOWED_ORIGINS);

      if (enforce && environment.ALLOWED_HOSTS.length > 0) {
        const host = normalizedHost(request);
        if (!environment.ALLOWED_HOSTS.includes(host)) {
          throw new ForbiddenError('Request host is not allowed');
        }
      }

      const origin = requestOrigin(request);
      if (enforce && origin && !environment.ALLOWED_ORIGINS.includes(origin)) {
        throw new ForbiddenError('Request origin is not allowed');
      }

      if (enforce && !SAFE_METHODS.has(request.method) && request.headers['sec-fetch-site'] === 'cross-site') {
        throw new ForbiddenError('Cross-site state-changing request rejected');
      }

      if (
        enforce &&
        environment.REQUIRE_HTTPS &&
        !request.secure &&
        !['/api/live', '/api/ready', '/api/health'].includes(request.path)
      ) {
        throw new ForbiddenError('HTTPS is required');
      }

      if (request.method === 'OPTIONS') {
        response.status(204).end();
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
