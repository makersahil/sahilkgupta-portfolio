import { Prisma, type PrismaClient } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';
import type {
  ScenarioRuntimeRepository,
  ScenarioRuntimeUpdate,
} from '../contracts/scenario-runtime.repository.js';
import type {
  ScenarioCatalogItem,
  ScenarioRuntimeRecord,
  ScenarioVerificationResult,
} from '../../types/scenario.js';

const scenarioSelect = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  description: true,
  order: true,
  isEnabled: true,
  expectedObservations: true,
  verificationCriteria: true,
} satisfies Prisma.LabScenarioSelect;

const runtimeInclude = {
  scenario: { select: scenarioSelect },
} satisfies Prisma.LabScenarioRuntimeInclude;

type RuntimeRow = Prisma.LabScenarioRuntimeGetPayload<{ include: typeof runtimeInclude }>;

function jsonWrite(value: unknown | undefined): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.DbNull;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function mapScenario(row: RuntimeRow['scenario']): ScenarioCatalogItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    description: row.description,
    order: row.order,
    isEnabled: row.isEnabled,
    expectedObservations: row.expectedObservations,
    verificationCriteria: row.verificationCriteria,
  };
}

function mapRuntime(row: RuntimeRow): ScenarioRuntimeRecord {
  return {
    id: row.id,
    sessionKey: row.sessionKey,
    labId: row.labId,
    scenarioId: row.scenarioId,
    status: row.status,
    appliedActions: row.appliedActions,
    verification: row.verification as unknown as ScenarioVerificationResult | null,
    startedAt: row.startedAt,
    remediatedAt: row.remediatedAt,
    verifiedAt: row.verifiedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    scenario: mapScenario(row.scenario),
  };
}

export class PrismaScenarioRuntimeRepository implements ScenarioRuntimeRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  async find(sessionKey: string, labId: string): Promise<ScenarioRuntimeRecord | null> {
    const row = await this.client.labScenarioRuntime.findUnique({
      where: { sessionKey_labId: { sessionKey, labId } },
      include: runtimeInclude,
    });
    return row ? mapRuntime(row) : null;
  }

  async createActive(
    sessionKey: string,
    labId: string,
    scenarioId: string,
    appliedActions: unknown,
  ): Promise<ScenarioRuntimeRecord | null> {
    try {
      const row = await this.client.labScenarioRuntime.create({
        data: {
          sessionKey,
          labId,
          scenarioId,
          status: 'ACTIVE',
          appliedActions: jsonWrite(appliedActions),
          verification: Prisma.DbNull,
          startedAt: new Date(),
          remediatedAt: null,
          verifiedAt: null,
        },
        include: runtimeInclude,
      });
      return mapRuntime(row);
    } catch (error: unknown) {
      const code = typeof error === 'object' && error !== null && 'code' in error
        ? (error as { code?: unknown }).code
        : undefined;
      if (code === 'P2002') return null;
      throw error;
    }
  }

  async updateState(
    sessionKey: string,
    labId: string,
    input: ScenarioRuntimeUpdate,
  ): Promise<ScenarioRuntimeRecord | null> {
    const existing = await this.find(sessionKey, labId);
    if (!existing) return null;
    const row = await this.client.labScenarioRuntime.update({
      where: { sessionKey_labId: { sessionKey, labId } },
      data: {
        status: input.status,
        ...(input.verification !== undefined ? { verification: jsonWrite(input.verification) } : {}),
        ...(input.remediatedAt !== undefined ? { remediatedAt: input.remediatedAt } : {}),
        ...(input.verifiedAt !== undefined ? { verifiedAt: input.verifiedAt } : {}),
      },
      include: runtimeInclude,
    });
    return mapRuntime(row);
  }

  async delete(sessionKey: string, labId: string): Promise<boolean> {
    const result = await this.client.labScenarioRuntime.deleteMany({ where: { sessionKey, labId } });
    return result.count > 0;
  }

  async deleteExpired(before: Date): Promise<number> {
    const result = await this.client.labScenarioRuntime.deleteMany({ where: { updatedAt: { lt: before } } });
    return result.count;
  }
}
