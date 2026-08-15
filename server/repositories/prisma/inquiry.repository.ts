import type { PrismaClient } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type {
  CreateInquiryInput,
  InquiryListQuery,
  InquiryRepository,
} from '../contracts/inquiry.repository.js';
import type { ContactInquiry, InquiryStatus } from '../../types/index.js';
import { mapInquiry } from './mappers.js';
import {
  normalizeInquiryStatus,
  requireNonEmptyString,
} from './validation.js';

export class PrismaInquiryRepository implements InquiryRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  async findAll(query: InquiryListQuery = {}): Promise<ContactInquiry[]> {
    const rows = await this.client.inquiry.findMany({
      where:
        query.status === undefined
          ? undefined
          : { status: normalizeInquiryStatus(query.status) },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapInquiry);
  }

  async findById(id: string): Promise<ContactInquiry | null> {
    const row = await this.client.inquiry.findUnique({ where: { id } });
    return row ? mapInquiry(row) : null;
  }

  async create(input: CreateInquiryInput): Promise<ContactInquiry> {
    const row = await this.client.inquiry.create({
      data: {
        name: requireNonEmptyString(input.name, 'name'),
        email: requireNonEmptyString(input.email, 'email'),
        subject: input.subject ?? '',
        message: requireNonEmptyString(input.message, 'message'),
        category: input.category,
        ipAddress: input.ipAddress,
        status: 'NEW',
      },
    });
    return mapInquiry(row);
  }

  async updateStatus(id: string, status: InquiryStatus): Promise<ContactInquiry | null> {
    const result = await this.client.inquiry.updateMany({
      where: { id },
      data: { status: normalizeInquiryStatus(status) },
    });
    if (result.count === 0) return null;
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.client.inquiry.deleteMany({ where: { id } });
    return result.count > 0;
  }
}
