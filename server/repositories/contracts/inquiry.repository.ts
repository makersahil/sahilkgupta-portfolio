import type { ContactInquiry, InquiryStatus } from '../../types/index.js';

export type CreateInquiryInput = Pick<
  ContactInquiry,
  'name' | 'email' | 'subject' | 'message' | 'category' | 'ipAddress'
>;

export interface InquiryListQuery {
  status?: InquiryStatus;
}

export interface InquiryRepository {
  findAll(query?: InquiryListQuery): Promise<ContactInquiry[]>;
  findById(id: string): Promise<ContactInquiry | null>;
  create(input: CreateInquiryInput): Promise<ContactInquiry>;
  updateStatus(id: string, status: InquiryStatus): Promise<ContactInquiry | null>;
  delete(id: string): Promise<boolean>;
}
