import { NotFoundError, ValidationError } from '../../lib/errors.js';
import type { CategoryRepository } from '../../repositories/contracts/category.repository.js';
import type {
  CreateSkillInput,
  SkillRepository,
  UpdateSkillInput,
} from '../../repositories/contracts/skill.repository.js';
import {
  requireNonBlank,
  validateEnum,
  validateFiniteNumber,
  validateInteger,
  validateOptionalEnum,
  validateOptionalFiniteNumber,
  validateOptionalInteger,
  validateOptionalNonBlank,
} from './content-validation.js';

const SKILL_LEVELS = new Set(['Expert', 'Advanced', 'Proficient']);

export class SkillService {
  constructor(
    private readonly skills: SkillRepository,
    private readonly categories: CategoryRepository,
  ) {}

  list(categoryId?: string) {
    return this.skills.findAll({ categoryId });
  }

  async getById(id: string) {
    const skill = await this.skills.findById(id);
    if (!skill) throw new NotFoundError('Skill not found');
    return skill;
  }

  async create(input: CreateSkillInput) {
    this.validateCreate(input);
    await this.assertCategoryExists(input.categoryId);
    return this.skills.create(input);
  }

  async update(id: string, input: UpdateSkillInput) {
    this.validateUpdate(input);
    if (input.categoryId !== undefined) await this.assertCategoryExists(input.categoryId);
    const skill = await this.skills.update(id, input);
    if (!skill) throw new NotFoundError('Skill not found');
    return skill;
  }

  async delete(id: string) {
    const deleted = await this.skills.delete(id);
    if (!deleted) throw new NotFoundError('Skill not found');
  }

  private async assertCategoryExists(categoryId: string): Promise<void> {
    const category = await this.categories.findById(categoryId);
    if (!category) throw new ValidationError('categoryId does not identify an existing category');
  }

  private validateCreate(input: CreateSkillInput): void {
    requireNonBlank(input.name, 'name');
    requireNonBlank(input.categoryId, 'categoryId');
    validateEnum(input.level, SKILL_LEVELS, 'level');
    validateInteger(input.proficiencyPercent, 'proficiencyPercent');
    this.validatePercentage(input.proficiencyPercent);
    validateFiniteNumber(input.yearsOfExperience, 'yearsOfExperience');
    if (input.yearsOfExperience < 0) throw new ValidationError('yearsOfExperience cannot be negative');
    validateInteger(input.sortOrder, 'sortOrder');
  }

  private validateUpdate(input: UpdateSkillInput): void {
    validateOptionalNonBlank(input.name, 'name');
    validateOptionalNonBlank(input.categoryId, 'categoryId');
    validateOptionalEnum(input.level, SKILL_LEVELS, 'level');
    validateOptionalInteger(input.proficiencyPercent, 'proficiencyPercent');
    if (input.proficiencyPercent !== undefined) this.validatePercentage(input.proficiencyPercent);
    validateOptionalFiniteNumber(input.yearsOfExperience, 'yearsOfExperience');
    if (input.yearsOfExperience !== undefined && input.yearsOfExperience < 0) {
      throw new ValidationError('yearsOfExperience cannot be negative');
    }
    validateOptionalInteger(input.sortOrder, 'sortOrder');
  }

  private validatePercentage(value: number): void {
    if (value < 0 || value > 100) {
      throw new ValidationError('proficiencyPercent must be between 0 and 100');
    }
  }
}
