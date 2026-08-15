import { NotFoundError, ValidationError } from '../../lib/errors.js';
import type {
  CreateInquiryInput,
  InquiryRepository,
} from '../../repositories/contracts/inquiry.repository.js';
import type { InquiryStatus } from '../../types/index.js';
import { requireNonBlank, validateEnum } from './content-validation.js';

const INQUIRY_STATUSES = new Set<InquiryStatus>(['NEW', 'READ', 'RESPONDED', 'ARCHIVED']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateMaxLength(value: string, maximum: number, field: string): void {
  if (value.length > maximum) {
    throw new ValidationError(`${field} must not exceed ${maximum} characters`);
  }
}

export class InquiryService {
  constructor(private readonly inquiries: InquiryRepository) {}

  list(status?: InquiryStatus) {
    if (status !== undefined) validateEnum(status, INQUIRY_STATUSES, 'status');
    return this.inquiries.findAll({ status });
  }

  async getById(id: string) {
    const inquiry = await this.inquiries.findById(id);
    if (!inquiry) throw new NotFoundError('Inquiry not found');
    return inquiry;
  }

  create(input: CreateInquiryInput) {
    requireNonBlank(input.name, 'name');
    requireNonBlank(input.email, 'email');
    requireNonBlank(input.message, 'message');
    requireNonBlank(input.subject, 'subject');
    if (!EMAIL_PATTERN.test(input.email)) throw new ValidationError('Invalid email address format');
    validateMaxLength(input.name, 120, 'name');
    validateMaxLength(input.email, 254, 'email');
    validateMaxLength(input.subject, 200, 'subject');
    validateMaxLength(input.message, 5_000, 'message');
    if (input.category !== undefined) validateMaxLength(input.category, 100, 'category');
    return this.inquiries.create(input);
  }

  async updateStatus(id: string, status: InquiryStatus) {
    validateEnum(status, INQUIRY_STATUSES, 'status');
    const inquiry = await this.inquiries.updateStatus(id, status);
    if (!inquiry) throw new NotFoundError('Inquiry not found');
    return inquiry;
  }

  async delete(id: string) {
    const deleted = await this.inquiries.delete(id);
    if (!deleted) throw new NotFoundError('Inquiry not found');
  }
}
