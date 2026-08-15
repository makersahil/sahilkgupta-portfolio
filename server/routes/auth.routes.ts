import { Router } from 'express';

import {
  AUTH_COOKIE_NAME,
  signSessionToken,
  verifySessionToken,
} from '../lib/auth-token.js';
import { UnauthorizedError } from '../lib/errors.js';
import { asyncHandler } from '../middlewares/async-handler.js';
import {
  authenticateToken,
  extractAuthToken,
  type AuthenticatedRequest,
} from '../middlewares/auth.middleware.js';
import { loginRateLimiter } from '../security/login-rate-limiter.js';
import { authService, normalizeAuthEmail } from '../services/auth/auth.service.js';

const router = Router();

function cookieOptions(expiresAt?: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    ...(expiresAt ? { expires: expiresAt } : {}),
  };
}

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const rawEmail = typeof req.body?.email === 'string' ? req.body.email : '';
    const normalizedEmail = normalizeAuthEmail(rawEmail);
    loginRateLimiter.assertAllowed(req.ip, normalizedEmail);

    try {
      const result = await authService.login(req.body?.email, req.body?.password);
      loginRateLimiter.clear(req.ip, normalizedEmail);

      const token = signSessionToken(result.user.id, result.session.id, result.session.expiresAt);
      res.cookie(AUTH_COOKIE_NAME, token, cookieOptions(result.session.expiresAt));
      res.json({
        success: true,
        message: 'Authentication successful',
        user: result.user,
      });
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        loginRateLimiter.recordFailure(req.ip, normalizedEmail);
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
    }

    if (deferredError) throw deferredError;

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  }),
);

export default router;
