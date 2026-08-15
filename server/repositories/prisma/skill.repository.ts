import type { PrismaClient } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type {
  CreateSkillInput,
  SkillListQuery,
  SkillRepository,
  UpdateSkillInput,
} from '../contracts/skill.repository.js';
import type { Skill } from '../../types/index.js';
import { ValidationError } from '../../lib/errors.js';
import { mapSkill } from './mappers.js';
import {
  normalizeSkillLevel,
  requireInteger,
  requireNonEmptyString,
} from './validation.js';

function proficiency(value: unknown): number {
  const percentage = requireInteger(value, 'proficiencyPercent');
  if (percentage > 100) {
    throw new ValidationError('proficiencyPercent must be between 0 and 100', {
      field: 'proficiencyPercent',
    });
  }
  return percentage;
}

export class PrismaSkillRepository implements SkillRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  async findAll(query: SkillListQuery = {}): Promise<Skill[]> {
    const rows = await this.client.skill.findMany({
      where: { categoryId: query.categoryId ?? { not: null } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(mapSkill);
  }

  async findById(id: string): Promise<Skill | null> {
    const row = await this.client.skill.findUnique({ where: { id } });
    return row ? mapSkill(row) : null;
  }

  async create(input: CreateSkillInput): Promise<Skill> {
    const row = await this.client.$transaction(async (transaction) => {
      const category = await transaction.category.findUnique({ where: { id: input.categoryId } });
      if (!category) {
        throw new ValidationError('Skill category does not exist', {
          field: 'categoryId',
          categoryId: input.categoryId,
        });
      }

      return transaction.skill.create({
        data: {
          name: requireNonEmptyString(input.name, 'name'),
          level: normalizeSkillLevel(input.level),
          proficiencyPercent: proficiency(input.proficiencyPercent),
          yearsOfExperience: requireInteger(input.yearsOfExperience, 'yearsOfExperience'),
          categoryId: input.categoryId,
          iconName: input.iconName,
          terminalSnippet: input.terminalSnippet,
          sortOrder: requireInteger(input.sortOrder, 'sortOrder'),
        },
      });
    });

    return mapSkill(row);
  }

  async update(id: string, input: UpdateSkillInput): Promise<Skill | null> {
    const row = await this.client.$transaction(async (transaction) => {
      const existing = await transaction.skill.findUnique({ where: { id } });
      if (!existing) return null;

      if (input.categoryId !== undefined) {
        const category = await transaction.category.findUnique({ where: { id: input.categoryId } });
        if (!category) {
          throw new ValidationError('Skill category does not exist', {
            field: 'categoryId',
            categoryId: input.categoryId,
          });
        }
      }

      return transaction.skill.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: requireNonEmptyString(input.name, 'name') } : {}),
          ...(input.level !== undefined ? { level: normalizeSkillLevel(input.level) } : {}),
          ...(input.proficiencyPercent !== undefined
            ? { proficiencyPercent: proficiency(input.proficiencyPercent) }
            : {}),
          ...(input.yearsOfExperience !== undefined
            ? {
                yearsOfExperience: requireInteger(
                  input.yearsOfExperience,
                  'yearsOfExperience',
                ),
              }
            : {}),
          ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
          ...(input.iconName !== undefined ? { iconName: input.iconName } : {}),
          ...(input.terminalSnippet !== undefined
            ? { terminalSnippet: input.terminalSnippet }
            : {}),
          ...(input.sortOrder !== undefined
            ? { sortOrder: requireInteger(input.sortOrder, 'sortOrder') }
            : {}),
        },
      });
    });

    return row ? mapSkill(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.client.skill.deleteMany({ where: { id } });
    return result.count > 0;
  }
}
