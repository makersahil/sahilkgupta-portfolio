import { Router } from 'express';
import { dbService } from '../services/db.service.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/blogs
router.get('/', async (req, res) => {
  const { categoryId, tag } = req.query;
  const blogs = dbService.getBlogs(categoryId as string, tag as string);
  res.json({ success: true, data: blogs });
});

// GET /api/blogs/:slug
router.get('/:slug', async (req, res) => {
  const blog = dbService.getBlogBySlug(req.params.slug);
  if (!blog) {
    res.status(404).json({ success: false, message: 'Blog post not found' });
    return;
  }
  res.json({ success: true, data: blog });
});

// POST /api/blogs (Admin only)
router.post('/', authenticateToken, requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  const { title, slug, excerpt, contentMarkdown, categoryId, coverImageUrl, readTimeMinutes, tags, isPublished, publishedAt } =
    req.body;

  if (!title || !slug || !categoryId || !contentMarkdown) {
    res.status(400).json({ success: false, message: 'Title, slug, categoryId, and content are required' });
    return;
  }

  const blog = dbService.createBlog({
    title,
    slug,
    excerpt: excerpt || '',
    contentMarkdown,
    categoryId,
    coverImageUrl,
    readTimeMinutes: readTimeMinutes || 5,
    tags: Array.isArray(tags) ? tags : [],
    isPublished: isPublished !== undefined ? isPublished : true,
    publishedAt: publishedAt || new Date().toISOString(),
  });

  res.status(201).json({ success: true, data: blog, message: 'Blog post published successfully' });
});

// PUT /api/blogs/:id (Admin only)
router.put('/:id', authenticateToken, requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  const updated = dbService.updateBlog(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ success: false, message: 'Blog post not found' });
    return;
  }
  res.json({ success: true, data: updated, message: 'Blog post updated successfully' });
});

// DELETE /api/blogs/:id (Admin only)
router.delete('/:id', authenticateToken, requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  const deleted = dbService.deleteBlog(req.params.id);
  if (!deleted) {
    res.status(404).json({ success: false, message: 'Blog post not found' });
    return;
  }
  res.json({ success: true, message: 'Blog post deleted successfully' });
});

export default router;
