import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../middlewares/async-handler.js';
import { contentServices } from '../services/content/index.js';
import { recordAdminAudit } from './admin-audit.js';
import { optionalQueryString, parseProjectCreate, parseProjectUpdate } from './content-input.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (request, response) => {
    const projects = await contentServices.projects.listPublic({
      categoryId: optionalQueryString(request.query.categoryId, 'categoryId'),
      tag: optionalQueryString(request.query.tag, 'tag'),
    });
    response.json({ success: true, data: projects });
  }),
);

router.get(
  '/:slug',
  asyncHandler(async (request, response) => {
    const project = await contentServices.projects.getPublicBySlug(request.params.slug);
    response.json({ success: true, data: project });
  }),
);

router.post(
  '/',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(async (request, response) => {
    const project = await contentServices.projects.create(parseProjectCreate(request.body));
    await recordAdminAudit(request, { action: 'PROJECT_CREATE', entityType: 'Project', entityId: project.id });
    response.status(201).json({ success: true, data: project, message: 'Project created successfully' });
  }),
);

router.put(
  '/:id',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(async (request, response) => {
    const project = await contentServices.projects.update(request.params.id, parseProjectUpdate(request.body));
    await recordAdminAudit(request, { action: 'PROJECT_UPDATE', entityType: 'Project', entityId: project.id });
    response.json({ success: true, data: project, message: 'Project updated successfully' });
  }),
);

router.delete(
  '/:id',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(async (request, response) => {
    await contentServices.projects.delete(request.params.id);
    await recordAdminAudit(request, { action: 'PROJECT_DELETE', entityType: 'Project', entityId: request.params.id });
    response.json({ success: true, message: 'Project deleted successfully' });
  }),
);

export default router;
