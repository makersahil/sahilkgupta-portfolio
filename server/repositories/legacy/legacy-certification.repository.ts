import { dbService } from '../../services/db.service.js';
import type {
  CertificationListQuery,
  CertificationRepository,
  CertificationWritableFields,
  CreateCertificationInput,
  UpdateCertificationInput,
} from '../contracts/certification.repository.js';
import { pickFields, pickPresentFields } from './legacy-write.utils.js';

const writableKeys = [
  'title',
  'code',
  'issuer',
  'credentialId',
  'verificationUrl',
  'badgeIcon',
  'issueDate',
  'expiryDate',
  'categoryId',
  'skillsValidated',
  'syllabusBreakdown',
  'isFeatured',
  'sortOrder',
] as const satisfies readonly (keyof CertificationWritableFields)[];

type LegacyCertificationDataSource = Pick<
  typeof dbService,
  'getCertifications' | 'createCertification' | 'updateCertification' | 'deleteCertification'
>;

export class LegacyCertificationRepository implements CertificationRepository {
  constructor(private readonly db: LegacyCertificationDataSource = dbService) {}

  async findAll(query: CertificationListQuery = {}) {
    return this.db.getCertifications(query.categoryId);
  }

  async findById(id: string) {
    return this.db.getCertifications().find((certification) => certification.id === id) ?? null;
  }

  async create(input: CreateCertificationInput) {
    return this.db.createCertification(pickFields(input, writableKeys));
  }

  async update(id: string, input: UpdateCertificationInput) {
    return this.db.updateCertification(id, pickPresentFields(input, writableKeys));
  }

  async delete(id: string) {
    return this.db.deleteCertification(id);
  }
}
