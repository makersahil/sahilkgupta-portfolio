import { randomUUID } from 'node:crypto';

import { NotFoundError, ValidationError } from '../../lib/errors.js';
import type { ArtifactRecord, ArtifactRepository } from '../../repositories/contracts/artifact.repository.js';
import { artifactRepository } from '../../repositories/prisma/artifact.repository.js';
import type { MediaAsset } from '../../types/index.js';

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
  return value.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'artifact';
}

function publicFlag(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value !== 'boolean') throw new ValidationError('isPublic must be a boolean');
  return value;
}

function mapMedia(row: ArtifactRecord): MediaAsset {
  return {
    id: row.id,
    filename: row.fileName,
    originalName: row.originalName ?? row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    url: row.publicUrl ?? '',
    ...(row.uploadedById ? { uploaderId: row.uploadedById } : {}),
    createdAt: row.createdAt.toISOString(),
  };
}

export class MediaService {
  constructor(private readonly artifacts: ArtifactRepository = artifactRepository) {}

  async listPublic(): Promise<MediaAsset[]> {
    return (await this.artifacts.findMany({ isPublic: true })).filter((artifact) => Boolean(artifact.publicUrl)).map(mapMedia);
  }

  async registerReference(input: RegisterMediaReferenceInput): Promise<MediaAsset> {
    const originalName = requiredText(input.originalName, 'originalName');
    const url = httpUrl(input.url);
    const mimeType = optionalText(input.mimeType, 'mimeType') ?? 'application/octet-stream';
    const s3Key = optionalText(input.s3Key, 's3Key');
    const projectId = optionalText(input.projectId, 'projectId');
    const labId = optionalText(input.labId, 'labId');
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
      projectId: projectId ?? null,
      labId: labId ?? null,
      uploadedById: uploaderId ?? null,
      isPublic: publicFlag(input.isPublic),
    });

    return mapMedia(row);
  }

  async delete(id: string): Promise<void> {
    if (!(await this.artifacts.delete(requiredText(id, 'id')))) throw new NotFoundError('Media artifact not found');
  }
}

export const mediaService = new MediaService();
