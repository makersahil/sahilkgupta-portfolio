import { Router } from 'express';
import { dbService } from '../services/db.service.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// POST /api/contact (Public)
router.post('/', async (req, res) => {
  const { name, email, subject, message, category } = req.body;

  if (!name || !email || !message) {
    res.status(400).json({ success: false, message: 'Name, email, and message are required' });
    return;
  }

  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ success: false, message: 'Invalid email address format' });
    return;
  }

  const inquiry = dbService.addInquiry({
    name,
    email,
    subject: subject || 'General Inquiries',
    message,
    category,
    ipAddress: req.ip || '127.0.0.1',
  });

  res.status(201).json({
    success: true,
    data: inquiry,
    message: 'Message dispatched successfully. Connection established with Sahil K Gupta.',
  });
});

// GET /api/contact/inquiries (Admin only)
router.get('/inquiries', authenticateToken, requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  const inquiries = dbService.getInquiries();
  res.json({ success: true, data: inquiries });
});

// PATCH /api/contact/inquiries/:id/status (Admin only)
router.patch('/inquiries/:id/status', authenticateToken, requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  const { status } = req.body;
  const updated = dbService.updateInquiryStatus(req.params.id, status);
  if (!updated) {
    res.status(404).json({ success: false, message: 'Inquiry not found' });
    return;
  }
  res.json({ success: true, message: `Inquiry status updated to ${status}` });
});

export default router;
