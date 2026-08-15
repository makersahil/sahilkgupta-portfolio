import type {
  ContentStatus,
  Domain,
  InquiryStatus,
  Prisma,
  ProjectFormatType,
  ProjectLifecycleStatus,
} from '@prisma/client';
import type { Project, Skill } from '../../types/index.js';
import { ValidationError } from '../../lib/errors.js';

const PROJECT_STATUSES = new Set<ProjectLifecycleStatus>([
  'COMPLETED',
  'IN_PROGRESS',
  'ARCHIVED',
  'PLANNED',
]);

const PROJECT_FORMATS = new Map<NonNullable<Project['formatType']>, ProjectFormatType>([
  ['cisco_pkt_lab', 'CISCO_PKT_LAB'],
  ['rhcsa_matrix', 'RHCSA_MATRIX'],
  ['devops_pipeline', 'DEVOPS_PIPELINE'],
  ['standard', 'STANDARD'],
]);

const INQUIRY_STATUSES = new Set<InquiryStatus>(['NEW', 'READ', 'RESPONDED', 'ARCHIVED']);
const SKILL_LEVELS = new Set<Skill['level']>(['Expert', 'Advanced', 'Proficient']);

export function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${field} is required`, { field });
  }

  return value.trim();
}

export function normalizeProjectStatus(value: unknown): ProjectLifecycleStatus {
  if (typeof value !== 'string' || !PROJECT_STATUSES.has(value as ProjectLifecycleStatus)) {
    throw new ValidationError('Unsupported project status', {
      field: 'status',
      value: typeof value === 'string' ? value : typeof value,
      allowed: [...PROJECT_STATUSES],
    });
  }

  return value as ProjectLifecycleStatus;
}

export function normalizeProjectStatuses(
  values: readonly unknown[] | undefined,
): ProjectLifecycleStatus[] | undefined {
  if (values === undefined) return undefined;
  return values.map(normalizeProjectStatus);
}

export function publicationStatusForProject(status: ProjectLifecycleStatus): ContentStatus {
  switch (status) {
    case 'COMPLETED':
      return 'PUBLISHED';
    case 'IN_PROGRESS':
    case 'PLANNED':
      return 'DRAFT';
    case 'ARCHIVED':
      return 'ARCHIVED';
  }
}

export function normalizeProjectFormat(value: unknown): ProjectFormatType {
  const normalized = PROJECT_FORMATS.get(value as NonNullable<Project['formatType']>);
  if (!normalized) {
    throw new ValidationError('Unsupported project format type', {
      field: 'formatType',
      value: typeof value === 'string' ? value : typeof value,
      allowed: [...PROJECT_FORMATS.keys()],
    });
  }

  return normalized;
}

export function normalizeInquiryStatus(value: unknown): InquiryStatus {
  if (typeof value !== 'string' || !INQUIRY_STATUSES.has(value as InquiryStatus)) {
    throw new ValidationError('Unsupported inquiry status', {
      field: 'status',
      value: typeof value === 'string' ? value : typeof value,
      allowed: [...INQUIRY_STATUSES],
    });
  }

  return value as InquiryStatus;
}

export function normalizeSkillLevel(value: unknown): Skill['level'] {
  if (typeof value !== 'string' || !SKILL_LEVELS.has(value as Skill['level'])) {
    throw new ValidationError('Unsupported skill level', {
      field: 'level',
      value: typeof value === 'string' ? value : typeof value,
      allowed: [...SKILL_LEVELS],
    });
  }

  return value as Skill['level'];
}

export function parseDate(value: unknown, field: string): Date {
  if (typeof value !== 'string' && !(value instanceof Date)) {
    throw new ValidationError(`${field} must be a valid date`, { field });
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`${field} must be a valid date`, { field });
  }

  return date;
}

export function optionalDate(value: unknown, field: string): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return parseDate(value, field);
}

export function requireInteger(value: unknown, field: string, minimum = 0): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum) {
    throw new ValidationError(`${field} must be an integer greater than or equal to ${minimum}`, {
      field,
    });
  }

  return value;
}

export function requireStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new ValidationError(`${field} must be an array of strings`, { field });
  }

  return [...value];
}

export function toInputJson(value: unknown, field: string): Prisma.InputJsonValue {
  if (value === null || value === undefined) {
    throw new ValidationError(`${field} must be a JSON object`, { field });
  }

  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  } catch {
    throw new ValidationError(`${field} must be JSON serializable`, { field });
  }
}

export function assertCategoryDomain(
  category: { id: string; domain: Domain | null } | null,
  categoryId: string,
): Domain {
  if (!category) {
    throw new ValidationError('Project category does not exist', {
      field: 'categoryId',
      categoryId,
    });
  }

  if (!category.domain) {
    throw new ValidationError('Project category has no domain assignment', {
      field: 'categoryId',
      categoryId,
    });
  }

  return category.domain;
}
