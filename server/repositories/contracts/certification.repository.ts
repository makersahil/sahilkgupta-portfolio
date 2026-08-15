import type { Certification } from '../../types/index.js';

export type CertificationWritableFields = Pick<
  Certification,
  | 'title'
  | 'code'
  | 'issuer'
  | 'credentialId'
  | 'verificationUrl'
  | 'badgeIcon'
  | 'issueDate'
  | 'expiryDate'
  | 'categoryId'
  | 'skillsValidated'
  | 'syllabusBreakdown'
  | 'isFeatured'
  | 'sortOrder'
>;

export type CreateCertificationInput = CertificationWritableFields;
export type UpdateCertificationInput = Partial<CertificationWritableFields>;

export interface CertificationListQuery {
  categoryId?: string;
}

export interface CertificationRepository {
  findAll(query?: CertificationListQuery): Promise<Certification[]>;
  findById(id: string): Promise<Certification | null>;
  create(input: CreateCertificationInput): Promise<Certification>;
  update(id: string, input: UpdateCertificationInput): Promise<Certification | null>;
  delete(id: string): Promise<boolean>;
}
