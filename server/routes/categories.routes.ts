import { Router } from 'express';
import { dbService } from '../services/db.service.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/categories
router.get('/', async (req, res) => {
  const categories = dbService.getCategories();
  res.json({ success: true, data: categories });
});

// GET /api/categories/:slug
router.get('/:slug', async (req, res) => {
  const category = dbService.getCategoryBySlug(req.params.slug);
  if (!category) {
    res.status(404).json({ success: false, message: 'Category not found' });
    return;
  }
  res.json({ success: true, data: category });
});

// POST /api/categories (Admin only)
router.post('/', authenticateToken, requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  const { name, slug, tagline, description, icon, accentColor, terminalTheme, sortOrder, isPublished } = req.body;

  if (!name || !slug) {
    res.status(400).json({ success: false, message: 'Name and slug are required' });
    return;
  }

  const newCategory = dbService.createCategory({
    name,
    slug,
    tagline: tagline || '',
    description: description || '',
    icon: icon || 'Terminal',
    accentColor: accentColor || '#10b981',
    terminalTheme: terminalTheme || 'green',
    sortOrder: sortOrder || 0,
    isPublished: isPublished !== undefined ? isPublished : true,
  });

  res.status(201).json({ success: true, data: newCategory, message: 'Category created successfully' });
});

// PUT /api/categories/:id (Admin only)
router.put('/:id', authenticateToken, requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  const updated = dbService.updateCategory(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ success: false, message: 'Category not found' });
    return;
  }
  res.json({ success: true, data: updated, message: 'Category updated successfully' });
});

// DELETE /api/categories/:id (Admin only)
router.delete('/:id', authenticateToken, requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  const deleted = dbService.deleteCategory(req.params.id);
  if (!deleted) {
    res.status(404).json({ success: false, message: 'Category not found' });
    return;
  }
  res.json({ success: true, message: 'Category deleted successfully' });
});

export default router;
