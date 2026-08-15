import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type {
  CertificationListQuery,
  CertificationRepository,
  CreateCertificationInput,
  UpdateCertificationInput,
} from '../contracts/certification.repository.js';
import type { Certification } from '../../types/index.js';
import { ValidationError } from '../../lib/errors.js';
import { mapCertification } from './mappers.js';
import {
  optionalDate,
  parseDate,
  requireInteger,
  requireNonEmptyString,
  requireStringArray,
  toInputJson,
} from './validation.js';

export class PrismaCertificationRepository implements CertificationRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  async findAll(query: CertificationListQuery = {}): Promise<Certification[]> {
    const rows = await this.client.certification.findMany({
      where: { categoryId: query.categoryId ?? { not: null } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(mapCertification);
  }

  async findById(id: string): Promise<Certification | null> {
    const row = await this.client.certification.findUnique({ where: { id } });
    return row ? mapCertification(row) : null;
  }

  async create(input: CreateCertificationInput): Promise<Certification> {
    const row = await this.client.$transaction(async (transaction) => {
      const category = await transaction.category.findUnique({ where: { id: input.categoryId } });
      if (!category) {
        throw new ValidationError('Certification category does not exist', {
          field: 'categoryId',
          categoryId: input.categoryId,
        });
      }

      return transaction.certification.create({
        data: {
          title: requireNonEmptyString(input.title, 'title'),
          code: input.code ?? '',
          issuer: requireNonEmptyString(input.issuer, 'issuer'),
          credentialId: requireNonEmptyString(input.credentialId, 'credentialId'),
          verificationUrl: input.verificationUrl,
          badgeIcon: requireNonEmptyString(input.badgeIcon, 'badgeIcon'),
          issueDate: parseDate(input.issueDate, 'issueDate'),
          expiryDate: optionalDate(input.expiryDate, 'expiryDate'),
          categoryId: input.categoryId,
          skillsValidated: requireStringArray(input.skillsValidated, 'skillsValidated'),
          syllabusBreakdown:
            input.syllabusBreakdown === undefined
              ? undefined
              : toInputJson(input.syllabusBreakdown, 'syllabusBreakdown'),
          isFeatured: Boolean(input.isFeatured),
          sortOrder: requireInteger(input.sortOrder, 'sortOrder'),
        },
      });
    });

    return mapCertification(row);
  }

  async update(
    id: string,
    input: UpdateCertificationInput,
  ): Promise<Certification | null> {
    const row = await this.client.$transaction(async (transaction) => {
      const existing = await transaction.certification.findUnique({ where: { id } });
      if (!existing) return null;

      if (input.categoryId !== undefined) {
        const category = await transaction.category.findUnique({ where: { id: input.categoryId } });
        if (!category) {
          throw new ValidationError('Certification category does not exist', {
            field: 'categoryId',
            categoryId: input.categoryId,
          });
        }
      }

      return transaction.certification.update({
        where: { id },
        data: {
          ...(input.title !== undefined
            ? { title: requireNonEmptyString(input.title, 'title') }
            : {}),
          ...(input.code !== undefined ? { code: input.code } : {}),
          ...(input.issuer !== undefined
            ? { issuer: requireNonEmptyString(input.issuer, 'issuer') }
            : {}),
          ...(input.credentialId !== undefined
            ? { credentialId: requireNonEmptyString(input.credentialId, 'credentialId') }
            : {}),
          ...(input.verificationUrl !== undefined
            ? { verificationUrl: input.verificationUrl }
            : {}),
          ...(input.badgeIcon !== undefined
            ? { badgeIcon: requireNonEmptyString(input.badgeIcon, 'badgeIcon') }
            : {}),
          ...(input.issueDate !== undefined
            ? { issueDate: parseDate(input.issueDate, 'issueDate') }
            : {}),
          ...(input.expiryDate !== undefined
            ? { expiryDate: optionalDate(input.expiryDate, 'expiryDate') }
            : {}),
          ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
          ...(input.skillsValidated !== undefined
            ? {
                skillsValidated: requireStringArray(
                  input.skillsValidated,
                  'skillsValidated',
                ),
              }
            : {}),
          ...(input.syllabusBreakdown !== undefined
            ? {
                syllabusBreakdown:
                  input.syllabusBreakdown === null
                    ? Prisma.DbNull
                    : toInputJson(input.syllabusBreakdown, 'syllabusBreakdown'),
              }
            : {}),
          ...(input.isFeatured !== undefined
            ? { isFeatured: Boolean(input.isFeatured) }
            : {}),
          ...(input.sortOrder !== undefined
            ? { sortOrder: requireInteger(input.sortOrder, 'sortOrder') }
            : {}),
        },
      });
    });

    return row ? mapCertification(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.client.certification.deleteMany({ where: { id } });
    return result.count > 0;
  }
}
