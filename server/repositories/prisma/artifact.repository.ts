import type { Artifact } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';
import type {
  ArtifactListQuery,
  ArtifactRecord,
  ArtifactRepository,
  CreateArtifactInput,
} from '../contracts/artifact.repository.js';

function mapArtifact(row: Artifact): ArtifactRecord {
  return {
    id: row.id,
    fileName: row.fileName,
    originalName: row.originalName,
    mimeType: row.mimeType,
    storageProvider: row.storageProvider,
    storageKey: row.storageKey,
    sizeBytes: row.sizeBytes,
    sha256: row.sha256,
    publicUrl: row.publicUrl,
    projectId: row.projectId,
    labId: row.labId,
    uploadedById: row.uploadedById,
    isPublic: row.isPublic,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaArtifactRepository implements ArtifactRepository {
  async findMany(query: ArtifactListQuery = {}): Promise<ArtifactRecord[]> {
    const rows = await prisma.artifact.findMany({
      where: {
        ...(query.isPublic === undefined ? {} : { isPublic: query.isPublic }),
        ...(query.projectId ? { projectId: query.projectId } : {}),
        ...(query.labId ? { labId: query.labId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapArtifact);
  }

  async findById(id: string): Promise<ArtifactRecord | null> {
    const row = await prisma.artifact.findUnique({ where: { id } });
    return row ? mapArtifact(row) : null;
  }

  async create(input: CreateArtifactInput): Promise<ArtifactRecord> {
    const row = await prisma.artifact.create({
      data: {
        fileName: input.fileName,
        originalName: input.originalName ?? null,
        mimeType: input.mimeType,
        storageProvider: input.storageProvider,
        storageKey: input.storageKey,
        sizeBytes: input.sizeBytes,
        sha256: input.sha256 ?? null,
        publicUrl: input.publicUrl ?? null,
        projectId: input.projectId ?? null,
        labId: input.labId ?? null,
        uploadedById: input.uploadedById ?? null,
        isPublic: input.isPublic,
      },
    });
    return mapArtifact(row);
  }

  async delete(id: string): Promise<boolean> {
    const result = await prisma.artifact.deleteMany({ where: { id } });
    return result.count > 0;
  }
}

export const artifactRepository = new PrismaArtifactRepository();
