import { Router } from 'express';
import { dbService } from '../services/db.service.js';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/media
router.get('/', async (req, res) => {
  const assets = dbService.getMediaAssets();
  res.json({ success: true, data: assets });
});

// POST /api/media/upload (Simulated media upload pipeline for S3/Cloudinary/Local)
router.post('/upload', authenticateToken, requireRole('SUPER_ADMIN', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
  const { originalName, mimeType, sizeBytes, url, s3Key } = req.body;

  if (!originalName || !url) {
    res.status(400).json({ success: false, message: 'File name and URL are required' });
    return;
  }

  const asset = dbService.addMediaAsset({
    filename: `upload_${Date.now()}_${originalName.replace(/\s+/g, '_')}`,
    originalName,
    mimeType: mimeType || 'image/png',
    sizeBytes: sizeBytes || 102400,
    url,
    s3Key: s3Key || `assets/${Date.now()}_${originalName}`,
    uploaderId: req.user?.id,
  });

  res.status(201).json({ success: true, data: asset, message: 'Media asset uploaded successfully' });
});

// DELETE /api/media/:id
router.delete('/:id', authenticateToken, requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  const deleted = dbService.deleteMediaAsset(req.params.id);
  if (!deleted) {
    res.status(404).json({ success: false, message: 'Media asset not found' });
    return;
  }
  res.json({ success: true, message: 'Media asset deleted successfully' });
});

export default router;
