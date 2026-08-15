import { NotFoundError, ValidationError } from '../../lib/errors.js';
import type { CategoryRepository } from '../../repositories/contracts/category.repository.js';
import type {
  CertificationRepository,
  CreateCertificationInput,
  UpdateCertificationInput,
} from '../../repositories/contracts/certification.repository.js';
import {
  requireNonBlank,
  validateBoolean,
  validateInteger,
  validateIsoDate,
  validateOptionalInteger,
  validateOptionalBoolean,
  validateOptionalIsoDate,
  validateOptionalNonBlank,
  validateOptionalStringArray,
  validateStringArray,
} from './content-validation.js';

export class CertificationService {
  constructor(
    private readonly certifications: CertificationRepository,
    private readonly categories: CategoryRepository,
  ) {}

  list(categoryId?: string) {
    return this.certifications.findAll({ categoryId });
  }

  async getById(id: string) {
    const certification = await this.certifications.findById(id);
    if (!certification) throw new NotFoundError('Certification not found');
    return certification;
  }

  async create(input: CreateCertificationInput) {
    this.validateCreate(input);
    await this.assertCategoryExists(input.categoryId);
    return this.certifications.create(input);
  }

  async update(id: string, input: UpdateCertificationInput) {
    this.validateUpdate(input);
    if (input.categoryId !== undefined) await this.assertCategoryExists(input.categoryId);
    const certification = await this.certifications.update(id, input);
    if (!certification) throw new NotFoundError('Certification not found');
    return certification;
  }

  async delete(id: string) {
    const deleted = await this.certifications.delete(id);
    if (!deleted) throw new NotFoundError('Certification not found');
  }

  private async assertCategoryExists(categoryId: string): Promise<void> {
    const category = await this.categories.findById(categoryId);
    if (!category) throw new ValidationError('categoryId does not identify an existing category');
  }

  private validateCreate(input: CreateCertificationInput): void {
    requireNonBlank(input.title, 'title');
    requireNonBlank(input.issuer, 'issuer');
    requireNonBlank(input.credentialId, 'credentialId');
    requireNonBlank(input.categoryId, 'categoryId');
    requireNonBlank(input.badgeIcon, 'badgeIcon');
    validateIsoDate(input.issueDate, 'issueDate');
    validateOptionalIsoDate(input.expiryDate, 'expiryDate');
    validateStringArray(input.skillsValidated, 'skillsValidated');
    validateInteger(input.sortOrder, 'sortOrder');
    validateBoolean(input.isFeatured, 'isFeatured');
  }

  private validateUpdate(input: UpdateCertificationInput): void {
    validateOptionalNonBlank(input.title, 'title');
    validateOptionalNonBlank(input.issuer, 'issuer');
    validateOptionalNonBlank(input.credentialId, 'credentialId');
    validateOptionalNonBlank(input.categoryId, 'categoryId');
    validateOptionalNonBlank(input.badgeIcon, 'badgeIcon');
    validateOptionalIsoDate(input.issueDate, 'issueDate');
    validateOptionalIsoDate(input.expiryDate, 'expiryDate');
    validateOptionalStringArray(input.skillsValidated, 'skillsValidated');
    validateOptionalInteger(input.sortOrder, 'sortOrder');
    validateOptionalBoolean(input.isFeatured, 'isFeatured');
  }
}
