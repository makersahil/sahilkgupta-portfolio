import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../middlewares/async-handler.js';
import { contentServices } from '../services/content/index.js';
import { parseCategoryCreate, parseCategoryUpdate } from './content-input.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_request, response) => {
    const categories = await contentServices.categories.listPublic();
    response.json({ success: true, data: categories });
  }),
);

router.get(
  '/:slug',
  asyncHandler(async (request, response) => {
    const category = await contentServices.categories.getPublicBySlug(request.params.slug);
    response.json({ success: true, data: category });
  }),
);

router.post(
  '/',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(async (request, response) => {
    const category = await contentServices.categories.create(parseCategoryCreate(request.body));
    response.status(201).json({ success: true, data: category, message: 'Category created successfully' });
  }),
);

router.put(
  '/:id',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(async (request, response) => {
    const category = await contentServices.categories.update(
      request.params.id,
      parseCategoryUpdate(request.body),
    );
    response.json({ success: true, data: category, message: 'Category updated successfully' });
  }),
);

router.delete(
  '/:id',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(async (request, response) => {
    await contentServices.categories.delete(request.params.id);
    response.json({ success: true, message: 'Category deleted successfully' });
  }),
);

export default router;
