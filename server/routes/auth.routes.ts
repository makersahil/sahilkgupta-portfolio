import { Router } from 'express';

import {
  AUTH_COOKIE_NAME,
  signSessionToken,
  verifySessionToken,
} from '../lib/auth-token.js';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../lib/errors.js';
import { asyncHandler } from '../middlewares/async-handler.js';
import { createRateLimitMiddleware } from '../middlewares/rate-limit.middleware.js';
import {
  authenticateToken,
  extractAuthToken,
  type AuthenticatedRequest,
} from '../middlewares/auth.middleware.js';
import { loginRateLimiter } from '../security/login-rate-limiter.js';
import { setCsrfToken } from '../security/csrf.js';
import { authService, normalizeAuthEmail } from '../services/auth/auth.service.js';

const router = Router();
const loginAttemptLimit = createRateLimitMiddleware({
  policy: { scope: 'auth.login-attempt', limit: 20, windowMs: 15 * 60 * 1_000 },
  key: (request) => request.ip ?? 'unknown',
  message: 'Too many login attempts. Try again later.',
});

function cookieOptions(expiresAt?: Date) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    ...(expiresAt ? { expires: expiresAt } : {}),
  };
}

router.post(
  '/login',
  loginAttemptLimit,
  asyncHandler(async (req, res) => {
    const rawEmail = typeof req.body?.email === 'string' ? req.body.email : '';
    const normalizedEmail = normalizeAuthEmail(rawEmail);
    await loginRateLimiter.assertAllowed(req.ip, normalizedEmail);

    try {
      const result = await authService.login(req.body?.email, req.body?.password);
      await loginRateLimiter.clear(req.ip, normalizedEmail);

      const token = signSessionToken(result.user.id, result.session.id, result.session.expiresAt);
      res.cookie(AUTH_COOKIE_NAME, token, cookieOptions(result.session.expiresAt));
      setCsrfToken(res, env.NODE_ENV === 'production', token);
      res.json({
        success: true,
        message: 'Authentication successful',
        user: result.user,
      });
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        await loginRateLimiter.recordFailure(req.ip, normalizedEmail);
      }
      throw error;
    }
  }),
);

router.get(
  '/me',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    res.json({
      success: true,
      user: req.user,
    });
  }),
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const token = extractAuthToken(req);
    let deferredError: unknown;

    try {
      if (token) {
        try {
          const payload = verifySessionToken(token);
          await authService.logout(payload.sessionId);
        } catch (error) {
          // Invalid/expired sessions are already effectively logged out. Persistence/configuration
          // errors are still surfaced after the browser cookie is cleared.
          if (!(error instanceof UnauthorizedError)) {
            deferredError = error;
          }
        }
      }
    } finally {
      res.clearCookie(AUTH_COOKIE_NAME, cookieOptions());
      setCsrfToken(res, env.NODE_ENV === 'production');
    }

    if (deferredError) throw deferredError;

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  }),
);

export default router;
