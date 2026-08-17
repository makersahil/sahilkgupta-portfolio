import { raw, Router } from 'express';

import { env } from '../config/env.js';
import { ValidationError } from '../lib/errors.js';
import {
  authenticateToken,
  optionalAuthenticateToken,
  requireRole,
  type AuthenticatedRequest,
} from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../middlewares/async-handler.js';
import { createRateLimitMiddleware } from '../middlewares/rate-limit.middleware.js';
import { mediaService } from '../services/media/media.service.js';
import { recordAdminAudit } from './admin-audit.js';

const router = Router();
const INLINE_MANAGED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
]);

const uploadLimit = createRateLimitMiddleware({
  policy: { scope: 'media.managed-upload', limit: 30, windowMs: 60 * 60 * 1_000 },
  key: (request) => `${(request as AuthenticatedRequest).user?.id ?? 'anonymous'}|${request.ip ?? 'unknown'}`,
  message: 'Too many managed artifact uploads',
});

function canReadPrivateArtifact(request: AuthenticatedRequest): boolean {
  return request.user?.role === 'ADMIN' || request.user?.role === 'SUPER_ADMIN';
}

function applyDownloadHeaders(response: import('express').Response, download: Awaited<ReturnType<typeof mediaService.getDownload>>): string {
  const etag = `"${download.artifact.sha256}"`;
  response.setHeader('Content-Type', download.artifact.mimeType);
  response.setHeader('Content-Length', String(download.bytes.length));
  response.setHeader('Content-Disposition', `${INLINE_MANAGED_MIME_TYPES.has(download.artifact.mimeType) ? 'inline' : 'attachment'}; filename="${download.fileName.replace(/"/g, '')}"`);
  response.setHeader('ETag', etag);
  response.setHeader('Cache-Control', download.artifact.isPublic ? 'public, max-age=31536000, immutable' : 'private, no-store');
  return etag;
}

function headerText(value: unknown, field: string, required = false): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate === undefined || candidate === null || candidate === '') {
    if (required) throw new ValidationError(`${field} header is required`);
    return undefined;
  }
  if (typeof candidate !== 'string') throw new ValidationError(`${field} header is invalid`);
  return candidate.trim() || undefined;
}

function headerBoolean(value: unknown): boolean | undefined {
  const candidate = headerText(value, 'X-Artifact-Public');
  if (candidate === undefined) return undefined;
  if (candidate === 'true') return true;
  if (candidate === 'false') return false;
  throw new ValidationError('X-Artifact-Public must be true or false');
}

router.get('/', asyncHandler(async (_request, response) => {
  response.json({ success: true, data: await mediaService.listPublic() });
}));

router.head('/:id/content', optionalAuthenticateToken, asyncHandler(async (request: AuthenticatedRequest, response) => {
  const download = await mediaService.getDownload(request.params.id, canReadPrivateArtifact(request));
  const etag = applyDownloadHeaders(response, download);
  if (request.headers['if-none-match'] === etag) { response.status(304).end(); return; }
  response.status(200).end();
}));

router.get('/:id/content', optionalAuthenticateToken, asyncHandler(async (request: AuthenticatedRequest, response) => {
  const download = await mediaService.getDownload(request.params.id, canReadPrivateArtifact(request));
  const etag = applyDownloadHeaders(response, download);
  if (request.headers['if-none-match'] === etag) { response.status(304).end(); return; }
  response.send(download.bytes);
}));

router.post(
  '/managed',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  uploadLimit,
  raw({ type: 'application/octet-stream', limit: env.ARTIFACT_MAX_BYTES }),
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    if (!Buffer.isBuffer(request.body)) throw new ValidationError('Managed upload requires application/octet-stream bytes');
    const asset = await mediaService.registerManaged({
      originalName: headerText(request.headers['x-file-name'], 'X-File-Name', true)!,
      mimeType: headerText(request.headers['x-artifact-mime-type'], 'X-Artifact-Mime-Type', true)!,
      bytes: request.body,
      projectId: headerText(request.headers['x-project-id'], 'X-Project-Id'),
      labId: headerText(request.headers['x-lab-id'], 'X-Lab-Id'),
      isPublic: headerBoolean(request.headers['x-artifact-public']),
      uploaderId: request.user?.id,
    });
    await recordAdminAudit(request, {
      action: 'ARTIFACT_MANAGED_UPLOAD',
      entityType: 'Artifact',
      entityId: asset.id,
      metadata: { originalName: asset.originalName, mimeType: asset.mimeType, sizeBytes: asset.sizeBytes, sha256: asset.sha256 },
    });
    response.status(201).json({ success: true, data: asset, message: 'Managed artifact bytes stored successfully' });
  }),
);

router.post(
  '/:id/verify-integrity',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const result = await mediaService.verifyManaged(request.params.id);
    await recordAdminAudit(request, {
      action: 'ARTIFACT_INTEGRITY_VERIFY',
      entityType: 'Artifact',
      entityId: request.params.id,
      metadata: { valid: result.valid, sha256: result.expectedSha256, sizeBytes: result.sizeBytes },
    });
    response.json({ success: true, data: result });
  }),
);

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
