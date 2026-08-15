import type {
  BlogPost,
  CiscoLabData,
  Certification,
  DevOpsPipelineData,
  Domain,
  Project,
  RhcsaMatrixData,
  Skill,
} from '../types/index.js';
import { ValidationError } from '../lib/errors.js';
import type {
  CreateBlogInput,
  CreateCategoryInput,
  CreateCertificationInput,
  CreateInquiryInput,
  CreateProjectInput,
  CreateSkillInput,
  UpdateBlogInput,
  UpdateCategoryInput,
  UpdateCertificationInput,
  UpdateProjectInput,
  UpdateSkillInput,
} from '../repositories/contracts/index.js';

type Body = Record<string, unknown>;

function asBody(value: unknown): Body {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError('Request body must be a JSON object');
  }
  return value as Body;
}

function has(body: Body, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function stringValue(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new ValidationError(`${field} must be a string`);
  return value.trim();
}

function requiredString(body: Body, field: string): string {
  if (!has(body, field)) throw new ValidationError(`${field} is required`);
  const value = stringValue(body[field], field);
  if (!value) throw new ValidationError(`${field} is required`);
  return value;
}

function optionalString(body: Body, field: string): string | undefined {
  if (!has(body, field) || body[field] === undefined) return undefined;
  return stringValue(body[field], field);
}

function booleanValue(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new ValidationError(`${field} must be a boolean`);
  return value;
}

function optionalBoolean(body: Body, field: string): boolean | undefined {
  if (!has(body, field) || body[field] === undefined) return undefined;
  return booleanValue(body[field], field);
}

function numberValue(value: unknown, field: string): number {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) throw new ValidationError(`${field} must be a finite number`);
  return parsed;
}

function requiredNumber(body: Body, field: string): number {
  if (!has(body, field)) throw new ValidationError(`${field} is required`);
  return numberValue(body[field], field);
}

function optionalNumber(body: Body, field: string): number | undefined {
  if (!has(body, field) || body[field] === undefined || body[field] === null || body[field] === '') return undefined;
  return numberValue(body[field], field);
}

function stringArrayValue(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new ValidationError(`${field} must be an array of strings`);
  }
  return value.map((item) => item.trim()).filter(Boolean);
}

function optionalStringArray(body: Body, field: string): string[] | undefined {
  if (!has(body, field) || body[field] === undefined || body[field] === null) return undefined;
  return stringArrayValue(body[field], field);
}

function optionalObject<T extends object>(body: Body, field: string): T | undefined {
  if (!has(body, field) || body[field] === undefined || body[field] === null) return undefined;
  const value = body[field];
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError(`${field} must be an object`);
  }
  return value as T;
}

function metricsValue(body: Body): Project['metrics'] | undefined {
  const metrics = optionalObject<Record<string, unknown>>(body, 'metrics');
  if (!metrics) return undefined;
  for (const value of Object.values(metrics)) {
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new ValidationError('metrics values must be strings or numbers');
    }
  }
  return metrics as Record<string, string | number>;
}

function syllabusValue(body: Body): Certification['syllabusBreakdown'] | undefined {
  if (!has(body, 'syllabusBreakdown') || body.syllabusBreakdown === undefined || body.syllabusBreakdown === null) {
    return undefined;
  }
  if (!Array.isArray(body.syllabusBreakdown)) {
    throw new ValidationError('syllabusBreakdown must be an array');
  }
  return body.syllabusBreakdown.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new ValidationError(`syllabusBreakdown[${index}] must be an object`);
    }
    const item = entry as Record<string, unknown>;
    if (typeof item.domain !== 'string' || !item.domain.trim()) {
      throw new ValidationError(`syllabusBreakdown[${index}].domain is required`);
    }
    if (typeof item.percentage !== 'number' || !Number.isFinite(item.percentage)) {
      throw new ValidationError(`syllabusBreakdown[${index}].percentage must be a finite number`);
    }
    if (item.score !== undefined && typeof item.score !== 'string') {
      throw new ValidationError(`syllabusBreakdown[${index}].score must be a string`);
    }
    return {
      domain: item.domain.trim(),
      percentage: item.percentage,
      ...(typeof item.score === 'string' && { score: item.score.trim() }),
    };
  });
}


const CATEGORY_DOMAINS = new Set<Domain>(['NETWORKING', 'LINUX', 'DEVOPS']);

function categoryDomain(body: Body, slug: string, name: string): Domain {
  const explicit = optionalString(body, 'domain');
  if (explicit) {
    const normalized = explicit.toUpperCase() as Domain;
    if (!CATEGORY_DOMAINS.has(normalized)) {
      throw new ValidationError('domain must be NETWORKING, LINUX, or DEVOPS');
    }
    return normalized;
  }

  // Backward compatibility for the three established domain categories.
  const probe = `${slug} ${name}`.toLowerCase();
  if (probe.includes('network')) return 'NETWORKING';
  if (probe.includes('linux') || probe.includes('rhel')) return 'LINUX';
  if (probe.includes('devops') || probe.includes('kubernetes') || probe.includes('cloud')) {
    return 'DEVOPS';
  }

  throw new ValidationError('domain is required for a portfolio category');
}

function optionalCategoryDomain(body: Body): Domain | undefined {
  if (!has(body, 'domain') || body.domain === undefined) return undefined;
  const normalized = requiredString(body, 'domain').toUpperCase() as Domain;
  if (!CATEGORY_DOMAINS.has(normalized)) {
    throw new ValidationError('domain must be NETWORKING, LINUX, or DEVOPS');
  }
  return normalized;
}

export function slugifyTitle(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
  if (!slug) throw new ValidationError('A slug could not be generated from title');
  return slug;
}

export function optionalQueryString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new ValidationError(`${field} query parameter must be a string`);
  const normalized = value.trim();
  return normalized || undefined;
}

export function parseCategoryCreate(value: unknown): CreateCategoryInput {
  const body = asBody(value);
  const name = requiredString(body, 'name');
  const slug = requiredString(body, 'slug');
  return {
    name,
    slug,
    domain: categoryDomain(body, slug, name),
    tagline: optionalString(body, 'tagline') ?? '',
    description: optionalString(body, 'description') ?? '',
    icon: optionalString(body, 'icon') ?? 'Terminal',
    accentColor: optionalString(body, 'accentColor') ?? '#10b981',
    terminalTheme: (optionalString(body, 'terminalTheme') ?? 'green') as CreateCategoryInput['terminalTheme'],
    sortOrder: optionalNumber(body, 'sortOrder') ?? 0,
    isPublished: optionalBoolean(body, 'isPublished') ?? true,
  };
}

export function parseCategoryUpdate(value: unknown): UpdateCategoryInput {
  const body = asBody(value);
  const input: UpdateCategoryInput = {};
  if (has(body, 'name')) input.name = requiredString(body, 'name');
  if (has(body, 'slug')) input.slug = requiredString(body, 'slug');
  if (has(body, 'tagline')) input.tagline = optionalString(body, 'tagline') ?? '';
  if (has(body, 'description')) input.description = optionalString(body, 'description') ?? '';
  if (has(body, 'icon')) input.icon = requiredString(body, 'icon');
  if (has(body, 'accentColor')) input.accentColor = requiredString(body, 'accentColor');
  if (has(body, 'terminalTheme')) input.terminalTheme = requiredString(body, 'terminalTheme') as UpdateCategoryInput['terminalTheme'];
  if (has(body, 'sortOrder')) input.sortOrder = requiredNumber(body, 'sortOrder');
  if (has(body, 'domain')) input.domain = optionalCategoryDomain(body);
  if (has(body, 'isPublished')) input.isPublished = booleanValue(body.isPublished, 'isPublished');
  return input;
}

export function parseProjectCreate(value: unknown): CreateProjectInput {
  const body = asBody(value);
  if (!has(body, 'status')) {
    throw new ValidationError('status is required and must not default to published');
  }
  return {
    title: requiredString(body, 'title'),
    slug: requiredString(body, 'slug'),
    summary: optionalString(body, 'summary') ?? '',
    descriptionMarkdown: optionalString(body, 'descriptionMarkdown') ?? '',
    mission: optionalString(body, 'mission'),
    architectureSummary: optionalString(body, 'architectureSummary'),
    whatIBuilt: optionalString(body, 'whatIBuilt'),
    categoryId: requiredString(body, 'categoryId'),
    status: requiredString(body, 'status') as CreateProjectInput['status'],
    formatType: (optionalString(body, 'formatType') ?? 'standard') as CreateProjectInput['formatType'],
    isFeatured: optionalBoolean(body, 'isFeatured') ?? false,
    sortOrder: optionalNumber(body, 'sortOrder') ?? 0,
    coverImageUrl: optionalString(body, 'coverImageUrl'),
    architectureSvg: optionalString(body, 'architectureSvg'),
    liveUrl: optionalString(body, 'liveUrl'),
    githubUrl: optionalString(body, 'githubUrl'),
    packetTracerFile: optionalString(body, 'packetTracerFile'),
    topologyConfigJson: optionalString(body, 'topologyConfigJson'),
    devopsStack: optionalStringArray(body, 'devopsStack') ?? [],
    tags: optionalStringArray(body, 'tags') ?? [],
    metrics: metricsValue(body),
    ciscoLabData: optionalObject<CiscoLabData>(body, 'ciscoLabData'),
    rhcsaMatrixData: optionalObject<RhcsaMatrixData>(body, 'rhcsaMatrixData'),
    devopsPipelineData: optionalObject<DevOpsPipelineData>(body, 'devopsPipelineData'),
  };
}

export function parseProjectUpdate(value: unknown): UpdateProjectInput {
  const body = asBody(value);
  const input: UpdateProjectInput = {};
  const stringFields = [
    'title',
    'slug',
    'summary',
    'descriptionMarkdown',
    'mission',
    'architectureSummary',
    'whatIBuilt',
    'categoryId',
    'coverImageUrl',
    'architectureSvg',
    'liveUrl',
    'githubUrl',
    'packetTracerFile',
    'topologyConfigJson',
  ] as const;
  for (const field of stringFields) {
    if (has(body, field)) input[field] = optionalString(body, field);
  }
  if (has(body, 'status')) input.status = requiredString(body, 'status') as UpdateProjectInput['status'];
  if (has(body, 'formatType')) input.formatType = requiredString(body, 'formatType') as UpdateProjectInput['formatType'];
  if (has(body, 'isFeatured')) input.isFeatured = booleanValue(body.isFeatured, 'isFeatured');
  if (has(body, 'sortOrder')) input.sortOrder = requiredNumber(body, 'sortOrder');
  if (has(body, 'devopsStack')) input.devopsStack = stringArrayValue(body.devopsStack, 'devopsStack');
  if (has(body, 'tags')) input.tags = stringArrayValue(body.tags, 'tags');
  if (has(body, 'metrics')) input.metrics = metricsValue(body);
  if (has(body, 'ciscoLabData')) input.ciscoLabData = optionalObject<CiscoLabData>(body, 'ciscoLabData');
  if (has(body, 'rhcsaMatrixData')) input.rhcsaMatrixData = optionalObject<RhcsaMatrixData>(body, 'rhcsaMatrixData');
  if (has(body, 'devopsPipelineData')) input.devopsPipelineData = optionalObject<DevOpsPipelineData>(body, 'devopsPipelineData');
  return input;
}

export function parseBlogCreate(value: unknown): CreateBlogInput {
  const body = asBody(value);
  const title = requiredString(body, 'title');
  const requestedSlug = optionalString(body, 'slug');
  return {
    title,
    slug: requestedSlug || slugifyTitle(title),
    excerpt: optionalString(body, 'excerpt') ?? '',
    contentMarkdown: requiredString(body, 'contentMarkdown'),
    categoryId: requiredString(body, 'categoryId'),
    coverImageUrl: optionalString(body, 'coverImageUrl'),
    readTimeMinutes: optionalNumber(body, 'readTimeMinutes') ?? 5,
    tags: optionalStringArray(body, 'tags') ?? [],
    isPublished: optionalBoolean(body, 'isPublished') ?? true,
    publishedAt: optionalString(body, 'publishedAt') ?? new Date().toISOString(),
  };
}

export function parseBlogUpdate(value: unknown): UpdateBlogInput {
  const body = asBody(value);
  const input: UpdateBlogInput = {};
  const stringFields = ['title', 'slug', 'excerpt', 'contentMarkdown', 'categoryId', 'coverImageUrl', 'publishedAt'] as const;
  for (const field of stringFields) {
    if (has(body, field)) input[field] = optionalString(body, field);
  }
  if (has(body, 'readTimeMinutes')) input.readTimeMinutes = requiredNumber(body, 'readTimeMinutes');
  if (has(body, 'tags')) input.tags = stringArrayValue(body.tags, 'tags');
  if (has(body, 'isPublished')) input.isPublished = booleanValue(body.isPublished, 'isPublished');
  if (input.title && has(body, 'slug') && !input.slug) input.slug = slugifyTitle(input.title);
  return input;
}

export function parseSkillCreate(value: unknown): CreateSkillInput {
  const body = asBody(value);
  return {
    name: requiredString(body, 'name'),
    level: (optionalString(body, 'level') ?? 'Advanced') as Skill['level'],
    proficiencyPercent: requiredNumber(body, 'proficiencyPercent'),
    yearsOfExperience: requiredNumber(body, 'yearsOfExperience'),
    categoryId: requiredString(body, 'categoryId'),
    iconName: optionalString(body, 'iconName') ?? 'Code',
    terminalSnippet: optionalString(body, 'terminalSnippet') ?? '',
    sortOrder: optionalNumber(body, 'sortOrder') ?? 0,
  };
}

export function parseSkillUpdate(value: unknown): UpdateSkillInput {
  const body = asBody(value);
  const input: UpdateSkillInput = {};
  if (has(body, 'name')) input.name = requiredString(body, 'name');
  if (has(body, 'level')) input.level = requiredString(body, 'level') as Skill['level'];
  if (has(body, 'proficiencyPercent')) input.proficiencyPercent = requiredNumber(body, 'proficiencyPercent');
  if (has(body, 'yearsOfExperience')) input.yearsOfExperience = requiredNumber(body, 'yearsOfExperience');
  if (has(body, 'categoryId')) input.categoryId = requiredString(body, 'categoryId');
  if (has(body, 'iconName')) input.iconName = optionalString(body, 'iconName');
  if (has(body, 'terminalSnippet')) input.terminalSnippet = optionalString(body, 'terminalSnippet');
  if (has(body, 'sortOrder')) input.sortOrder = requiredNumber(body, 'sortOrder');
  return input;
}

export function parseCertificationCreate(value: unknown): CreateCertificationInput {
  const body = asBody(value);
  return {
    title: requiredString(body, 'title'),
    code: optionalString(body, 'code') ?? '',
    issuer: requiredString(body, 'issuer'),
    credentialId: requiredString(body, 'credentialId'),
    verificationUrl: optionalString(body, 'verificationUrl'),
    badgeIcon: optionalString(body, 'badgeIcon') ?? 'Award',
    issueDate: requiredString(body, 'issueDate'),
    expiryDate: optionalString(body, 'expiryDate'),
    categoryId: requiredString(body, 'categoryId'),
    skillsValidated: optionalStringArray(body, 'skillsValidated') ?? [],
    syllabusBreakdown: syllabusValue(body),
    isFeatured: optionalBoolean(body, 'isFeatured') ?? true,
    sortOrder: optionalNumber(body, 'sortOrder') ?? 0,
  };
}

export function parseCertificationUpdate(value: unknown): UpdateCertificationInput {
  const body = asBody(value);
  const input: UpdateCertificationInput = {};
  const stringFields = [
    'title',
    'code',
    'issuer',
    'credentialId',
    'verificationUrl',
    'badgeIcon',
    'issueDate',
    'expiryDate',
    'categoryId',
  ] as const;
  for (const field of stringFields) {
    if (has(body, field)) input[field] = optionalString(body, field);
  }
  if (has(body, 'skillsValidated')) input.skillsValidated = stringArrayValue(body.skillsValidated, 'skillsValidated');
  if (has(body, 'syllabusBreakdown')) {
    input.syllabusBreakdown = syllabusValue(body);
  }
  if (has(body, 'isFeatured')) input.isFeatured = booleanValue(body.isFeatured, 'isFeatured');
  if (has(body, 'sortOrder')) input.sortOrder = requiredNumber(body, 'sortOrder');
  return input;
}

export function parseInquiryCreate(value: unknown, ipAddress?: string): CreateInquiryInput {
  const body = asBody(value);
  return {
    name: requiredString(body, 'name'),
    email: requiredString(body, 'email').toLowerCase(),
    subject: optionalString(body, 'subject') || 'General Inquiries',
    message: requiredString(body, 'message'),
    category: optionalString(body, 'category'),
    ipAddress,
  };
}

export function parseInquiryStatus(value: unknown): ContactStatus {
  const body = asBody(value);
  return requiredString(body, 'status') as ContactStatus;
}

type ContactStatus = import('../types/index.js').InquiryStatus;
