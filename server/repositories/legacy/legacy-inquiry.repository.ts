import { dbService } from '../../services/db.service.js';
import type { ContactInquiry } from '../../types/index.js';
import type {
  CreateInquiryInput,
  InquiryListQuery,
  InquiryRepository,
} from '../contracts/inquiry.repository.js';
import { pickFields } from './legacy-write.utils.js';

const writableKeys = [
  'name',
  'email',
  'subject',
  'message',
  'category',
  'ipAddress',
] as const satisfies readonly (keyof CreateInquiryInput)[];

type LegacyInquiryDataSource = Pick<
  typeof dbService,
  'getInquiries' | 'addInquiry' | 'updateInquiryStatus' | 'deleteInquiry'
>;

export class LegacyInquiryRepository implements InquiryRepository {
  constructor(private readonly db: LegacyInquiryDataSource = dbService) {}

  async findAll(query: InquiryListQuery = {}) {
    const inquiries = this.db.getInquiries();
    if (query.status === undefined) return inquiries;
    return inquiries.filter((inquiry) => inquiry.status === query.status);
  }

  async findById(id: string) {
    return this.db.getInquiries().find((inquiry) => inquiry.id === id) ?? null;
  }

  async create(input: CreateInquiryInput) {
    return this.db.addInquiry(pickFields(input, writableKeys));
  }

  async updateStatus(id: string, status: ContactInquiry['status']) {
    const updated = this.db.updateInquiryStatus(id, status);
    if (!updated) return null;
    return this.db.getInquiries().find((inquiry) => inquiry.id === id) ?? null;
  }

  async delete(id: string) {
    return this.db.deleteInquiry(id);
  }
}
