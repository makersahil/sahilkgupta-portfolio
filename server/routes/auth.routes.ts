import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbService } from '../services/db.service.js';
import { authenticateToken, AuthenticatedRequest, getJwtSecret } from '../middlewares/auth.middleware.js';

const router = Router();
const TOKEN_EXPIRY = '7d';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Email and password are required' });
    return;
  }

  let jwtSecret: string;
  try {
    jwtSecret = getJwtSecret();
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Authentication is not configured in this production environment.',
    });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const configuredAdminEmail = (process.env.ADMIN_EMAIL || 'sahilkguptaprivate@gmail.com').trim().toLowerCase();
  
  let user = dbService.getUserByEmail(normalizedEmail);

  // Check matching admin identity
  if (!user && normalizedEmail === configuredAdminEmail) {
    user = dbService.getUserByEmail('sahilkguptaprivate@gmail.com');
  }

  if (!user) {
    res.status(401).json({ success: false, message: 'Invalid credentials. Access denied.' });
    return;
  }

  const cleanPassword = password.trim();
  const configuredAdminPassword = process.env.ADMIN_PASSWORD;

  // Validate only against cryptographic hash or configured server environment secret
  let isPasswordValid = false;
  if (user.passwordHash && bcrypt.compareSync(cleanPassword, user.passwordHash)) {
    isPasswordValid = true;
  } else if (configuredAdminPassword && cleanPassword === configuredAdminPassword) {
    isPasswordValid = true;
  }

  if (!isPasswordValid) {
    res.status(401).json({ success: false, message: 'Invalid credentials. Access denied.' });
    return;
  }

  // Update last login
  dbService.updateUserLastLogin(user.id);

  // Generate JWT token
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    },
    jwtSecret,
    { expiresIn: TOKEN_EXPIRY }
  );

  // Set secure HttpOnly cookie
  res.cookie('infra_auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  const { passwordHash: _, ...safeUser } = user as any;

  res.json({
    success: true,
    message: 'Authentication successful',
    token,
    user: safeUser,
  });
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return;
  }

  const user = dbService.getUserById(req.user.id);
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  const { passwordHash: _, ...safeUser } = user as any;
  res.json({
    success: true,
    user: safeUser,
  });
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  res.clearCookie('infra_auth_token');
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
