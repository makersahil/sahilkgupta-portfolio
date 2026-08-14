import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function getJwtSecret(): string {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'dev-portfolio-jwt-secret-not-for-prod';
  }

  throw new Error('JWT_SECRET must be configured for authentication in production');
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    fullName: string;
  };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // Check authorization header or HttpOnly cookie
  const authHeader = req.headers['authorization'];
  const tokenFromHeader = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const tokenFromCookie = req.cookies ? req.cookies['infra_auth_token'] : null;
  const token = tokenFromHeader || tokenFromCookie;

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.',
    });
    return;
  }

  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as {
      id: string;
      email: string;
      role: string;
      fullName: string;
    };
    req.user = decoded;
    next();
  } catch (error: any) {
    if (error.message?.includes('JWT_SECRET is required in production')) {
      res.status(500).json({
        success: false,
        message: 'Authentication is not configured in this production environment.',
      });
      return;
    }
    res.status(403).json({
      success: false,
      message: 'Invalid or expired authentication token.',
    });
    return;
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Requires one of roles [${roles.join(', ')}]`,
      });
      return;
    }

    next();
  };
}
