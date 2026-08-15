import type { Prisma } from '@prisma/client';
import type {
  BlogPost,
  Category,
  Certification,
  CiscoLabData,
  ContactInquiry,
  DevOpsPipelineData,
  Project,
  RhcsaMatrixData,
  Skill,
} from '../../types/index.js';
import { ValidationError } from '../../lib/errors.js';

export type ProjectWithLabs = Prisma.ProjectGetPayload<{ include: { labs: true } }>;

type LabRecord = ProjectWithLabs['labs'][number];

const TERMINAL_THEMES = new Set<Category['terminalTheme']>([
  'green',
  'cyan',
  'amber',
  'violet',
  'emerald',
]);

const SKILL_LEVELS = new Set<Skill['level']>(['Expert', 'Advanced', 'Proficient']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function readTerminalTheme(value: unknown, slug: string): Category['terminalTheme'] {
  if (typeof value === 'string' && TERMINAL_THEMES.has(value as Category['terminalTheme'])) {
    return value as Category['terminalTheme'];
  }

  // Presentation metadata must never make the entire public portfolio unreadable.
  // A null/blank value can exist only in an older/drifted database; use the
  // established domain visual default while seed/migrations reconcile the row.
  if (value === null || value === undefined || value === '') {
    return slug === 'linux' ? 'green' : 'cyan';
  }

  throw new ValidationError(`Unsupported terminal theme stored for category: ${String(value)}`);
}

function readSkillLevel(value: string): Skill['level'] {
  if (!SKILL_LEVELS.has(value as Skill['level'])) {
    throw new ValidationError(`Unsupported skill level stored in persistence: ${value}`);
  }

  return value as Skill['level'];
}

function requiredCategoryId(value: string | null, entityType: string, entityId: string): string {
  if (!value) {
    throw new ValidationError(`${entityType} is missing its required category relationship`, {
      entityType,
      entityId,
      field: 'categoryId',
    });
  }

  return value;
}

function readMetrics(value: Prisma.JsonValue | null): Project['metrics'] {
  if (!isRecord(value)) return undefined;

  const metrics: Record<string, string | number> = {};
  for (const [key, metric] of Object.entries(value)) {
    if (typeof metric === 'string' || (typeof metric === 'number' && Number.isFinite(metric))) {
      metrics[key] = metric;
    }
  }

  return Object.keys(metrics).length > 0 ? metrics : undefined;
}

function isCiscoLabData(value: unknown): value is CiscoLabData {
  return (
    isRecord(value) &&
    typeof value.labTitle === 'string' &&
    typeof value.pktFileName === 'string' &&
    typeof value.xmlStructureVersion === 'string' &&
    typeof value.topologyXmlSnippet === 'string' &&
    typeof value.overviewSummary === 'string' &&
    Array.isArray(value.devices) &&
    Array.isArray(value.routingTable) &&
    Array.isArray(value.vlanDatabase) &&
    Array.isArray(value.aclRules) &&
    Array.isArray(value.verificationTasks)
  );
}

function isRhcsaMatrixData(value: unknown): value is RhcsaMatrixData {
  return (
    isRecord(value) &&
    typeof value.rhelVersion === 'string' &&
    typeof value.kernelVersion === 'string' &&
    ['Enforcing', 'Permissive', 'Disabled'].includes(String(value.selinuxMode)) &&
    typeof value.fipsMode === 'boolean' &&
    typeof value.totalCompetencies === 'number' &&
    typeof value.verifiedCount === 'number' &&
    Array.isArray(value.objectives)
  );
}

function isDevOpsPipelineData(value: unknown): value is DevOpsPipelineData {
  return (
    isRecord(value) &&
    typeof value.framework === 'string' &&
    typeof value.gitCommitSha === 'string' &&
    typeof value.branch === 'string' &&
    Array.isArray(value.pipelineStages) &&
    Array.isArray(value.iacTree) &&
    Array.isArray(value.architectureLayers)
  );
}

function labPriority(lab: LabRecord): number {
  if (lab.status === 'READY') return 0;
  if (lab.status === 'DRAFT') return 1;
  return 2;
}

function selectLab(labs: LabRecord[], kind: LabRecord['kind']): LabRecord | undefined {
  return labs
    .filter((lab) => lab.kind === kind && lab.metadata !== null)
    .sort((left, right) => {
      const statusOrder = labPriority(left) - labPriority(right);
      return statusOrder || left.createdAt.getTime() - right.createdAt.getTime();
    })[0];
}

function mapFormatType(formatType: ProjectWithLabs['formatType']): Project['formatType'] {
  switch (formatType) {
    case 'CISCO_PKT_LAB':
      return 'cisco_pkt_lab';
    case 'RHCSA_MATRIX':
      return 'rhcsa_matrix';
    case 'DEVOPS_PIPELINE':
      return 'devops_pipeline';
    case 'STANDARD':
      return 'standard';
  }
}

export function mapCategory(row: Prisma.CategoryGetPayload<object>): Category {
  return {
    id: row.id,
    domain: row.domain ?? undefined,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.description ?? '',
    icon: row.icon,
    accentColor: row.accentColor,
    terminalTheme: readTerminalTheme(row.terminalTheme, row.slug),
    sortOrder: row.sortOrder,
    isPublished: row.status === 'PUBLISHED',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapProject(row: ProjectWithLabs): Project {
  const ciscoLab = selectLab(row.labs, 'NETWORK_TOPOLOGY');
  const rhcsaLab = selectLab(row.labs, 'LINUX_SYSTEM');
  const devopsLab = selectLab(row.labs, 'DEVOPS_PIPELINE');

  const ciscoLabData = ciscoLab && isCiscoLabData(ciscoLab.metadata) ? ciscoLab.metadata : undefined;
  const rhcsaMatrixData = rhcsaLab && isRhcsaMatrixData(rhcsaLab.metadata) ? rhcsaLab.metadata : undefined;
  const devopsPipelineData =
    devopsLab && isDevOpsPipelineData(devopsLab.metadata) ? devopsLab.metadata : undefined;

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    descriptionMarkdown: row.descriptionMarkdown ?? row.whatIBuilt ?? row.mission ?? '',
    mission: row.mission ?? undefined,
    architectureSummary: row.architectureSummary ?? undefined,
    whatIBuilt: row.whatIBuilt ?? undefined,
    categoryId: requiredCategoryId(row.categoryId, 'Project', row.id),
    status: row.lifecycleStatus,
    formatType: mapFormatType(row.formatType),
    isFeatured: row.featured,
    sortOrder: row.sortOrder,
    coverImageUrl: row.coverImageUrl ?? undefined,
    architectureSvg: row.architectureSvg ?? undefined,
    liveUrl: row.liveUrl ?? undefined,
    githubUrl: row.githubUrl ?? undefined,
    packetTracerFile: row.packetTracerFile ?? undefined,
    topologyConfigJson: row.topologyConfigJson ?? undefined,
    devopsStack: [...row.technologies],
    tags: [...row.tags],
    metrics: readMetrics(row.metrics),
    ciscoLabData,
    rhcsaMatrixData,
    devopsPipelineData,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapBlog(row: Prisma.BlogPostGetPayload<object>): BlogPost {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    contentMarkdown: row.content,
    categoryId: requiredCategoryId(row.categoryId, 'BlogPost', row.id),
    coverImageUrl: row.coverImageUrl ?? undefined,
    readTimeMinutes: row.readTimeMinutes,
    tags: [...row.tags],
    isPublished: row.status === 'PUBLISHED',
    publishedAt: (row.publishedAt ?? row.createdAt).toISOString(),
    viewCount: row.viewCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function readSyllabusBreakdown(
  value: Prisma.JsonValue | null,
): Certification['syllabusBreakdown'] {
  if (!Array.isArray(value)) return undefined;

  const result: NonNullable<Certification['syllabusBreakdown']> = [];
  for (const entry of value) {
    if (
      !isRecord(entry) ||
      typeof entry.domain !== 'string' ||
      typeof entry.percentage !== 'number' ||
      (entry.score !== undefined && entry.score !== null && typeof entry.score !== 'string')
    ) {
      return undefined;
    }

    result.push({
      domain: entry.domain,
      percentage: entry.percentage,
      ...(typeof entry.score === 'string' ? { score: entry.score } : {}),
    });
  }

  return result;
}

export function mapCertification(
  row: Prisma.CertificationGetPayload<object>,
): Certification {
  return {
    id: row.id,
    title: row.title,
    code: row.code,
    issuer: row.issuer,
    credentialId: row.credentialId,
    verificationUrl: row.verificationUrl ?? undefined,
    badgeIcon: row.badgeIcon,
    issueDate: row.issueDate.toISOString(),
    expiryDate: row.expiryDate?.toISOString(),
    categoryId: requiredCategoryId(row.categoryId, 'Certification', row.id),
    skillsValidated: [...row.skillsValidated],
    syllabusBreakdown: readSyllabusBreakdown(row.syllabusBreakdown),
    isFeatured: row.isFeatured,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapSkill(row: Prisma.SkillGetPayload<object>): Skill {
  return {
    id: row.id,
    name: row.name,
    level: readSkillLevel(row.level),
    proficiencyPercent: row.proficiencyPercent,
    yearsOfExperience: row.yearsOfExperience,
    categoryId: requiredCategoryId(row.categoryId, 'Skill', row.id),
    iconName: row.iconName ?? undefined,
    terminalSnippet: row.terminalSnippet ?? undefined,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapInquiry(row: Prisma.InquiryGetPayload<object>): ContactInquiry {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    subject: row.subject ?? '',
    message: row.message,
    category: row.category ?? undefined,
    status: row.status,
    ipAddress: row.ipAddress ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function isSafeStringArray(value: unknown): value is string[] {
  return isStringArray(value);
}
