import { randomUUID } from 'node:crypto';

import { IntegrityError, NotFoundError, ValidationError } from '../../lib/errors.js';
import { log } from '../../lib/logger.js';
import type { ArtifactRecord, ArtifactRepository } from '../../repositories/contracts/artifact.repository.js';
import { artifactRepository } from '../../repositories/prisma/artifact.repository.js';
import type { MediaAsset } from '../../types/index.js';
import { managedArtifactStorage, type ManagedArtifactStorage } from './managed-artifact-storage.js';

export interface RegisterMediaReferenceInput {
  originalName: string;
  mimeType?: string;
  sizeBytes?: number;
  url: string;
  s3Key?: string;
  projectId?: string;
  labId?: string;
  isPublic?: boolean;
  uploaderId?: string;
}

export interface RegisterManagedArtifactInput {
  originalName: string;
  mimeType: string;
  bytes: Buffer;
  projectId?: string;
  labId?: string;
  isPublic?: boolean;
  uploaderId?: string;
}

export interface ArtifactDownload {
  artifact: ArtifactRecord;
  bytes: Buffer;
  fileName: string;
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new ValidationError(`${field} is required`);
  return value.trim();
}

function optionalText(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new ValidationError(`${field} must be a string`);
  const normalized = value.trim();
  return normalized || undefined;
}

function httpUrl(value: unknown): string {
  const normalized = requiredText(value, 'url');
  try {
    const url = new URL(normalized);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('unsupported protocol');
  } catch {
    throw new ValidationError('url must be an http(s) URL');
  }
  return normalized;
}

function sizeBytes(value: unknown): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new ValidationError('sizeBytes must be a non-negative integer');
  }
  return value;
}

function safeName(value: string): string {
  const basename = value.replace(/\\/g, '/').split('/').pop() ?? '';
  return basename.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 180) || 'artifact';
}

function publicFlag(value: unknown, fallback = true): boolean {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'boolean') throw new ValidationError('isPublic must be a boolean');
  return value;
}

const MANAGED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
  'application/json',
  'application/zip',
  'application/octet-stream',
  'text/plain',
  'text/markdown',
  'text/csv',
]);

function looksLikeUtf8Text(bytes: Buffer): boolean {
  if (bytes.includes(0)) return false;
  const decoded = bytes.toString('utf8');
  return !decoded.includes('\uFFFD');
}

function validateSignature(mimeType: string, bytes: Buffer): void {
  if (!MANAGED_MIME_TYPES.has(mimeType)) {
    throw new ValidationError(`Managed artifact MIME type is not supported: ${mimeType}`);
  }
  const starts = (...values: number[]) => values.every((value, index) => bytes[index] === value);
  if (mimeType === 'image/png' && !starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) {
    throw new ValidationError('PNG artifact signature does not match its MIME type');
  }
  if (mimeType === 'image/jpeg' && !starts(0xff, 0xd8, 0xff)) {
    throw new ValidationError('JPEG artifact signature does not match its MIME type');
  }
  if (mimeType === 'image/webp' && !(bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP')) {
    throw new ValidationError('WebP artifact signature does not match its MIME type');
  }
  if (mimeType === 'application/pdf' && bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new ValidationError('PDF artifact signature does not match its MIME type');
  }
  if (mimeType === 'application/zip' && !starts(0x50, 0x4b)) {
    throw new ValidationError('ZIP artifact signature does not match its MIME type');
  }
  if (mimeType === 'application/json') {
    if (!looksLikeUtf8Text(bytes)) throw new ValidationError('JSON artifact is not valid UTF-8 text');
    try { JSON.parse(bytes.toString('utf8')); } catch { throw new ValidationError('JSON artifact contains invalid JSON'); }
  }
  if (mimeType.startsWith('text/') && !looksLikeUtf8Text(bytes)) {
    throw new ValidationError('Text artifact is not valid UTF-8 text');
  }
}

function mapMedia(row: ArtifactRecord): MediaAsset {
  const managed = row.storageProvider === 'LOCAL_MANAGED';
  return {
    id: row.id,
    filename: row.fileName,
    originalName: row.originalName ?? row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    url: managed ? `/api/media/${row.id}/content` : row.publicUrl ?? '',
    storageProvider: row.storageProvider,
    sha256: row.sha256 ?? undefined,
    managed,
    isPublic: row.isPublic,
    ...(row.uploadedById ? { uploaderId: row.uploadedById } : {}),
    createdAt: row.createdAt.toISOString(),
  };
}

export class MediaService {
  constructor(
    private readonly artifacts: ArtifactRepository = artifactRepository,
    private readonly storage: ManagedArtifactStorage = managedArtifactStorage,
  ) {}

  async listPublic(): Promise<MediaAsset[]> {
    return (await this.artifacts.findMany({ isPublic: true }))
      .filter((artifact) => artifact.storageProvider === 'LOCAL_MANAGED' || Boolean(artifact.publicUrl))
      .map(mapMedia);
  }

  async registerReference(input: RegisterMediaReferenceInput): Promise<MediaAsset> {
    const originalName = requiredText(input.originalName, 'originalName');
    const url = httpUrl(input.url);
    const mimeType = optionalText(input.mimeType, 'mimeType') ?? 'application/octet-stream';
    const s3Key = optionalText(input.s3Key, 's3Key');
    const requestedProjectId = optionalText(input.projectId, 'projectId');
    const requestedLabId = optionalText(input.labId, 'labId');
    const association = await this.artifacts.resolveAssociation(requestedProjectId, requestedLabId);
    if (!association) throw new ValidationError('Artifact Project/Lab association is invalid');
    const uploaderId = optionalText(input.uploaderId, 'uploaderId');
    const fileName = `artifact_${randomUUID()}_${safeName(originalName)}`;

    const row = await this.artifacts.create({
      fileName,
      originalName,
      mimeType,
      storageProvider: s3Key ? 'S3_REFERENCE' : 'EXTERNAL',
      storageKey: s3Key ?? url,
      sizeBytes: sizeBytes(input.sizeBytes),
      publicUrl: url,
      projectId: association.projectId,
      labId: association.labId,
      uploadedById: uploaderId ?? null,
      isPublic: publicFlag(input.isPublic),
    });
    return mapMedia(row);
  }

  async registerManaged(input: RegisterManagedArtifactInput): Promise<MediaAsset> {
    const originalName = requiredText(input.originalName, 'originalName');
    const mimeType = requiredText(input.mimeType, 'mimeType').toLowerCase();
    validateSignature(mimeType, input.bytes);
    const requestedProjectId = optionalText(input.projectId, 'projectId');
    const requestedLabId = optionalText(input.labId, 'labId');
    const association = await this.artifacts.resolveAssociation(requestedProjectId, requestedLabId);
    if (!association) throw new ValidationError('Artifact Project/Lab association is invalid');
    const stored = await this.storage.store(input.bytes);
    const uploaderId = optionalText(input.uploaderId, 'uploaderId');
    try {
      const row = await this.artifacts.create({
        fileName: `managed_${stored.sha256.slice(0, 16)}_${safeName(originalName)}`,
        originalName,
        mimeType,
        storageProvider: 'LOCAL_MANAGED',
        storageKey: stored.storageKey,
        sizeBytes: stored.sizeBytes,
        sha256: stored.sha256,
        publicUrl: null,
        projectId: association.projectId,
        labId: association.labId,
        uploadedById: uploaderId ?? null,
        isPublic: publicFlag(input.isPublic, false),
      });
      return mapMedia(row);
    } catch (error) {
      // Do not delete the content-addressed object here: another concurrent upload may
      // already reference the same bytes. Scheduled maintenance safely removes old,
      // unreferenced objects after consulting PostgreSQL.
      log('warn', 'managed_artifact_metadata_create_failed', { sha256: stored.sha256, error });
      throw error;
    }
  }

  async getDownload(id: string, allowPrivate: boolean): Promise<ArtifactDownload> {
    const artifact = await this.artifacts.findById(requiredText(id, 'id'));
    if (!artifact || artifact.storageProvider !== 'LOCAL_MANAGED' || !artifact.sha256) {
      throw new NotFoundError('Managed artifact not found');
    }
    if (!artifact.isPublic && !allowPrivate) throw new NotFoundError('Managed artifact not found');
    const bytes = await this.storage.read(artifact.storageKey, artifact.sha256);
    return { artifact, bytes, fileName: safeName(artifact.originalName ?? artifact.fileName) };
  }

  async verifyManaged(id: string): Promise<{ valid: boolean; actualSha256: string; expectedSha256: string; sizeBytes: number }> {
    const artifact = await this.artifacts.findById(requiredText(id, 'id'));
    if (!artifact || artifact.storageProvider !== 'LOCAL_MANAGED' || !artifact.sha256) {
      throw new NotFoundError('Managed artifact not found');
    }
    const result = await this.storage.verify(artifact.storageKey, artifact.sha256, artifact.sizeBytes);
    if (!result.valid) throw new IntegrityError('Managed artifact integrity verification failed', result);
    return { ...result, expectedSha256: artifact.sha256 };
  }

  async delete(id: string): Promise<void> {
    const artifact = await this.artifacts.findById(requiredText(id, 'id'));
    if (!artifact) throw new NotFoundError('Media artifact not found');
    if (!(await this.artifacts.delete(artifact.id))) throw new NotFoundError('Media artifact not found');
    if (artifact.storageProvider === 'LOCAL_MANAGED') {
      const remaining = await this.artifacts.countByStorageKey(artifact.storageProvider, artifact.storageKey);
      if (remaining === 0) {
        await this.storage.delete(artifact.storageKey).catch((error) => {
          log('error', 'managed_artifact_orphan_cleanup_failed', { artifactId: artifact.id, error });
        });
      }
    }
  }
}

export const mediaService = new MediaService();
