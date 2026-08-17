export interface ArtifactRecord {
  id: string;
  fileName: string;
  originalName: string | null;
  mimeType: string;
  storageProvider: string;
  storageKey: string;
  sizeBytes: number;
  sha256: string | null;
  publicUrl: string | null;
  projectId: string | null;
  labId: string | null;
  uploadedById: string | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArtifactListQuery {
  isPublic?: boolean;
  projectId?: string;
  labId?: string;
  storageProvider?: string;
}

export interface CreateArtifactInput {
  fileName: string;
  originalName?: string | null;
  mimeType: string;
  storageProvider: string;
  storageKey: string;
  sizeBytes: number;
  sha256?: string | null;
  publicUrl?: string | null;
  projectId?: string | null;
  labId?: string | null;
  uploadedById?: string | null;
  isPublic: boolean;
}

export interface ArtifactAssociation {
  projectId: string | null;
  labId: string | null;
}

export interface ArtifactRepository {
  findMany(query?: ArtifactListQuery): Promise<ArtifactRecord[]>;
  findById(id: string): Promise<ArtifactRecord | null>;
  create(input: CreateArtifactInput): Promise<ArtifactRecord>;
  resolveAssociation(projectId?: string | null, labId?: string | null): Promise<ArtifactAssociation | null>;
  countByStorageKey(storageProvider: string, storageKey: string): Promise<number>;
  delete(id: string): Promise<boolean>;
}
