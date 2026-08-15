import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../middlewares/async-handler.js';
import { contentServices } from '../services/content/index.js';
import { optionalQueryString, parseInquiryCreate, parseInquiryStatus } from './content-input.js';

const router = Router();

router.post(
  '/',
  asyncHandler(async (request, response) => {
    const inquiry = await contentServices.inquiries.create(parseInquiryCreate(request.body, request.ip));
    response.status(201).json({
      success: true,
      data: inquiry,
      message: 'Message dispatched successfully. Connection established with Sahil K Gupta.',
    });
  }),
);

router.get(
  '/inquiries',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(async (request, response) => {
    const status = optionalQueryString(request.query.status, 'status');
    const inquiries = await contentServices.inquiries.list(
      status as import('../types/index.js').InquiryStatus | undefined,
    );
    response.json({ success: true, data: inquiries });
  }),
);

router.patch(
  '/inquiries/:id/status',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(async (request, response) => {
    const status = parseInquiryStatus(request.body);
    const inquiry = await contentServices.inquiries.updateStatus(request.params.id, status);
    response.json({ success: true, data: inquiry, message: `Inquiry status updated to ${status}` });
  }),
);

export default router;
