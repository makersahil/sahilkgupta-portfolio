import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../middlewares/async-handler.js';
import { contentServices } from '../services/content/index.js';
import { optionalQueryString, parseSkillCreate, parseSkillUpdate } from './content-input.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (request, response) => {
    const skills = await contentServices.skills.list(
      optionalQueryString(request.query.categoryId, 'categoryId'),
    );
    response.json({ success: true, data: skills });
  }),
);

router.post(
  '/',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(async (request, response) => {
    const skill = await contentServices.skills.create(parseSkillCreate(request.body));
    response.status(201).json({ success: true, data: skill, message: 'Skill added successfully' });
  }),
);

router.put(
  '/:id',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(async (request, response) => {
    const skill = await contentServices.skills.update(request.params.id, parseSkillUpdate(request.body));
    response.json({ success: true, data: skill, message: 'Skill updated successfully' });
  }),
);

router.delete(
  '/:id',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(async (request, response) => {
    await contentServices.skills.delete(request.params.id);
    response.json({ success: true, message: 'Skill deleted successfully' });
  }),
);

export default router;
