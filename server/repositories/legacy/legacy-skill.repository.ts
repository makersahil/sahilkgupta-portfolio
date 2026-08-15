import { dbService } from '../../services/db.service.js';
import type {
  CreateSkillInput,
  SkillListQuery,
  SkillRepository,
  SkillWritableFields,
  UpdateSkillInput,
} from '../contracts/skill.repository.js';
import { pickFields, pickPresentFields } from './legacy-write.utils.js';

const writableKeys = [
  'name',
  'level',
  'proficiencyPercent',
  'yearsOfExperience',
  'categoryId',
  'iconName',
  'terminalSnippet',
  'sortOrder',
] as const satisfies readonly (keyof SkillWritableFields)[];

type LegacySkillDataSource = Pick<
  typeof dbService,
  'getSkills' | 'createSkill' | 'updateSkill' | 'deleteSkill'
>;

export class LegacySkillRepository implements SkillRepository {
  constructor(private readonly db: LegacySkillDataSource = dbService) {}

  async findAll(query: SkillListQuery = {}) {
    return this.db.getSkills(query.categoryId);
  }

  async findById(id: string) {
    return this.db.getSkills().find((skill) => skill.id === id) ?? null;
  }

  async create(input: CreateSkillInput) {
    return this.db.createSkill(pickFields(input, writableKeys));
  }

  async update(id: string, input: UpdateSkillInput) {
    return this.db.updateSkill(id, pickPresentFields(input, writableKeys));
  }

  async delete(id: string) {
    return this.db.deleteSkill(id);
  }
}
