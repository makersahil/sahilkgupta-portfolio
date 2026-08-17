import type { Artifact, PrismaClient } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';
import type {
  ArtifactAssociation,
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
  constructor(private readonly client: PrismaClient = prisma) {}

  async findMany(query: ArtifactListQuery = {}): Promise<ArtifactRecord[]> {
    const rows = await this.client.artifact.findMany({
      where: {
        ...(query.isPublic === undefined ? {} : { isPublic: query.isPublic }),
        ...(query.projectId ? { projectId: query.projectId } : {}),
        ...(query.labId ? { labId: query.labId } : {}),
        ...(query.storageProvider ? { storageProvider: query.storageProvider } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapArtifact);
  }

  async findById(id: string): Promise<ArtifactRecord | null> {
    const row = await this.client.artifact.findUnique({ where: { id } });
    return row ? mapArtifact(row) : null;
  }

  async create(input: CreateArtifactInput): Promise<ArtifactRecord> {
    const row = await this.client.artifact.create({
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

  async resolveAssociation(projectId?: string | null, labId?: string | null): Promise<ArtifactAssociation | null> {
    if (labId) {
      const lab = await this.client.lab.findUnique({ where: { id: labId }, select: { projectId: true } });
      if (!lab || (projectId && projectId !== lab.projectId)) return null;
      return { projectId: lab.projectId, labId };
    }
    if (projectId) {
      const project = await this.client.project.findUnique({ where: { id: projectId }, select: { id: true } });
      return project ? { projectId: project.id, labId: null } : null;
    }
    return { projectId: null, labId: null };
  }

  countByStorageKey(storageProvider: string, storageKey: string): Promise<number> {
    return this.client.artifact.count({ where: { storageProvider, storageKey } });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.client.artifact.deleteMany({ where: { id } });
    return result.count > 0;
  }
}

export const artifactRepository = new PrismaArtifactRepository();
