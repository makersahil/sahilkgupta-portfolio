import jwt from 'jsonwebtoken';

import { ConfigurationError, UnauthorizedError } from './errors.js';

export const AUTH_COOKIE_NAME = 'infra_auth_token';
export const AUTH_TOKEN_ISSUER = 'sahil-portfolio';
export const AUTH_TOKEN_AUDIENCE = 'sahil-portfolio-admin';

export interface SessionTokenPayload {
  userId: string;
  sessionId: string;
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new ConfigurationError('JWT_SECRET must be configured for authentication');
  }
  if (secret.length < 32) {
    throw new ConfigurationError('JWT_SECRET must contain at least 32 characters');
  }
  return secret;
}

export function signSessionToken(userId: string, sessionId: string, expiresAt: Date): string {
  const secondsUntilExpiry = Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  return jwt.sign({}, getJwtSecret(), {
    subject: userId,
    jwtid: sessionId,
    issuer: AUTH_TOKEN_ISSUER,
    audience: AUTH_TOKEN_AUDIENCE,
    expiresIn: secondsUntilExpiry,
  });
}

export function verifySessionToken(token: string): SessionTokenPayload {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      issuer: AUTH_TOKEN_ISSUER,
      audience: AUTH_TOKEN_AUDIENCE,
    });

    if (
      typeof decoded === 'string' ||
      typeof decoded.sub !== 'string' ||
      !decoded.sub ||
      typeof decoded.jti !== 'string' ||
      !decoded.jti
    ) {
      throw new UnauthorizedError('Invalid or expired authentication session');
    }

    return {
      userId: decoded.sub,
      sessionId: decoded.jti,
    };
  } catch (error) {
    if (error instanceof ConfigurationError || error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError('Invalid or expired authentication session');
  }
}
