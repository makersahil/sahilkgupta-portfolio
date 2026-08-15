import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../middlewares/async-handler.js';
import { contentServices } from '../services/content/index.js';
import { optionalQueryString, parseBlogCreate, parseBlogUpdate } from './content-input.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (request, response) => {
    const blogs = await contentServices.blogs.listPublic({
      categoryId: optionalQueryString(request.query.categoryId, 'categoryId'),
      tag: optionalQueryString(request.query.tag, 'tag'),
    });
    response.json({ success: true, data: blogs });
  }),
);

router.get(
  '/:slug',
  asyncHandler(async (request, response) => {
    const blog = await contentServices.blogs.getPublicBySlug(request.params.slug);
    response.json({ success: true, data: blog });
  }),
);

router.post(
  '/',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(async (request, response) => {
    const blog = await contentServices.blogs.create(parseBlogCreate(request.body));
    response.status(201).json({ success: true, data: blog, message: 'Blog post published successfully' });
  }),
);

router.put(
  '/:id',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(async (request, response) => {
    const blog = await contentServices.blogs.update(request.params.id, parseBlogUpdate(request.body));
    response.json({ success: true, data: blog, message: 'Blog post updated successfully' });
  }),
);

router.delete(
  '/:id',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(async (request, response) => {
    await contentServices.blogs.delete(request.params.id);
    response.json({ success: true, message: 'Blog post deleted successfully' });
  }),
);

export default router;
