import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../middlewares/async-handler.js';
import { contentServices } from '../services/content/index.js';
import {
  optionalQueryString,
  parseCertificationCreate,
  parseCertificationUpdate,
} from './content-input.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (request, response) => {
    const certifications = await contentServices.certifications.list(
      optionalQueryString(request.query.categoryId, 'categoryId'),
    );
    response.json({ success: true, data: certifications });
  }),
);

router.post(
  '/',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(async (request, response) => {
    const certification = await contentServices.certifications.create(
      parseCertificationCreate(request.body),
    );
    response.status(201).json({ success: true, data: certification, message: 'Certification created successfully' });
  }),
);

router.put(
  '/:id',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(async (request, response) => {
    const certification = await contentServices.certifications.update(
      request.params.id,
      parseCertificationUpdate(request.body),
    );
    response.json({ success: true, data: certification, message: 'Certification updated successfully' });
  }),
);

router.delete(
  '/:id',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(async (request, response) => {
    await contentServices.certifications.delete(request.params.id);
    response.json({ success: true, message: 'Certification deleted successfully' });
  }),
);

export default router;
