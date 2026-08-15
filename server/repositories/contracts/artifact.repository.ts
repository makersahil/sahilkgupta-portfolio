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

export interface ArtifactRepository {
  findMany(query?: ArtifactListQuery): Promise<ArtifactRecord[]>;
  findById(id: string): Promise<ArtifactRecord | null>;
  create(input: CreateArtifactInput): Promise<ArtifactRecord>;
  delete(id: string): Promise<boolean>;
}
