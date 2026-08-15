import type { Skill } from '../../types/index.js';

export type SkillWritableFields = Pick<
  Skill,
  | 'name'
  | 'level'
  | 'proficiencyPercent'
  | 'yearsOfExperience'
  | 'categoryId'
  | 'iconName'
  | 'terminalSnippet'
  | 'sortOrder'
>;

export type CreateSkillInput = SkillWritableFields;
export type UpdateSkillInput = Partial<SkillWritableFields>;

export interface SkillListQuery {
  categoryId?: string;
}

export interface SkillRepository {
  findAll(query?: SkillListQuery): Promise<Skill[]>;
  findById(id: string): Promise<Skill | null>;
  create(input: CreateSkillInput): Promise<Skill>;
  update(id: string, input: UpdateSkillInput): Promise<Skill | null>;
  delete(id: string): Promise<boolean>;
}
