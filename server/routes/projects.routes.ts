import { Router } from 'express';
import { dbService } from '../services/db.service.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/projects
router.get('/', async (req, res) => {
  const { categoryId, tag } = req.query;
  const projects = dbService.getProjects(categoryId as string, tag as string);
  res.json({ success: true, data: projects });
});

// GET /api/projects/:slug
router.get('/:slug', async (req, res) => {
  const project = dbService.getProjectBySlug(req.params.slug);
  if (!project) {
    res.status(404).json({ success: false, message: 'Project not found' });
    return;
  }
  res.json({ success: true, data: project });
});

// POST /api/projects (Admin only)
router.post('/', authenticateToken, requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  const {
    title,
    slug,
    summary,
    descriptionMarkdown,
    categoryId,
    status,
    formatType,
    isFeatured,
    sortOrder,
    coverImageUrl,
    architectureSvg,
    liveUrl,
    githubUrl,
    packetTracerFile,
    topologyConfigJson,
    devopsStack,
    tags,
    metrics,
    ciscoLabData,
    rhcsaMatrixData,
    devopsPipelineData,
  } = req.body;

  if (!title || !slug || !categoryId) {
    res.status(400).json({ success: false, message: 'Title, slug, and categoryId are required' });
    return;
  }

  const project = dbService.createProject({
    title,
    slug,
    summary: summary || '',
    descriptionMarkdown: descriptionMarkdown || '',
    categoryId,
    status: status || 'COMPLETED',
    formatType: formatType || 'standard',
    isFeatured: Boolean(isFeatured),
    sortOrder: sortOrder || 0,
    coverImageUrl,
    architectureSvg,
    liveUrl,
    githubUrl,
    packetTracerFile,
    topologyConfigJson,
    devopsStack: Array.isArray(devopsStack) ? devopsStack : [],
    tags: Array.isArray(tags) ? tags : [],
    metrics,
    ciscoLabData,
    rhcsaMatrixData,
    devopsPipelineData,
  });

  res.status(201).json({ success: true, data: project, message: 'Project created successfully' });
});

// PUT /api/projects/:id (Admin only)
router.put('/:id', authenticateToken, requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  const updated = dbService.updateProject(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ success: false, message: 'Project not found' });
    return;
  }
  res.json({ success: true, data: updated, message: 'Project updated successfully' });
});

// DELETE /api/projects/:id (Admin only)
router.delete('/:id', authenticateToken, requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  const deleted = dbService.deleteProject(req.params.id);
  if (!deleted) {
    res.status(404).json({ success: false, message: 'Project not found' });
    return;
  }
  res.json({ success: true, message: 'Project deleted successfully' });
});

export default router;
