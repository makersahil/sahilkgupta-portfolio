import { Router } from 'express';

import { authenticateToken, requireRole, type AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../middlewares/async-handler.js';
import { mediaService } from '../services/media/media.service.js';
import { recordAdminAudit } from './admin-audit.js';

const router = Router();

// GET /api/media - public artifact references only.
router.get('/', asyncHandler(async (_request, response) => {
  response.json({ success: true, data: await mediaService.listPublic() });
}));

// POST /api/media/upload
// Compatibility endpoint: registers already-stored media/artifact metadata.
// It does not claim to upload bytes to S3/Cloudinary/local storage.
router.post(
  '/upload',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const { originalName, mimeType, sizeBytes, url, s3Key, projectId, labId, isPublic } = request.body ?? {};
    const asset = await mediaService.registerReference({
      originalName,
      mimeType,
      sizeBytes,
      url,
      s3Key,
      projectId,
      labId,
      isPublic,
      uploaderId: request.user?.id,
    });
    await recordAdminAudit(request, {
      action: 'ARTIFACT_REFERENCE_CREATE',
      entityType: 'Artifact',
      entityId: asset.id,
      metadata: { originalName: asset.originalName, mimeType: asset.mimeType },
    });
    response.status(201).json({ success: true, data: asset, message: 'Media artifact reference registered successfully' });
  }),
);

router.delete(
  '/:id',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(async (request, response) => {
    await mediaService.delete(request.params.id);
    await recordAdminAudit(request, { action: 'ARTIFACT_DELETE', entityType: 'Artifact', entityId: request.params.id });
    response.json({ success: true, message: 'Media artifact deleted successfully' });
  }),
);

export default router;
