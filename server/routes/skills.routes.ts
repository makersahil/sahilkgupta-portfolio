import { Router } from 'express';
import { dbService } from '../services/db.service.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/skills
router.get('/', async (req, res) => {
  const { categoryId } = req.query;
  const skills = dbService.getSkills(categoryId as string);
  res.json({ success: true, data: skills });
});

// POST /api/skills (Admin only)
router.post('/', authenticateToken, requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  const { name, level, proficiencyPercent, yearsOfExperience, categoryId, iconName, terminalSnippet, sortOrder } = req.body;

  if (!name || !categoryId) {
    res.status(400).json({ success: false, message: 'Name and categoryId are required' });
    return;
  }

  const skill = dbService.createSkill({
    name,
    level: level || 'Advanced',
    proficiencyPercent: Number(proficiencyPercent) || 85,
    yearsOfExperience: Number(yearsOfExperience) || 3,
    categoryId,
    iconName: iconName || 'Code',
    terminalSnippet: terminalSnippet || '',
    sortOrder: sortOrder || 0,
  });

  res.status(201).json({ success: true, data: skill, message: 'Skill added successfully' });
});

// PUT /api/skills/:id (Admin only)
router.put('/:id', authenticateToken, requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  const updated = dbService.updateSkill(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ success: false, message: 'Skill not found' });
    return;
  }
  res.json({ success: true, data: updated, message: 'Skill updated successfully' });
});

// DELETE /api/skills/:id (Admin only)
router.delete('/:id', authenticateToken, requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  const deleted = dbService.deleteSkill(req.params.id);
  if (!deleted) {
    res.status(404).json({ success: false, message: 'Skill not found' });
    return;
  }
  res.json({ success: true, message: 'Skill deleted successfully' });
});

export default router;
