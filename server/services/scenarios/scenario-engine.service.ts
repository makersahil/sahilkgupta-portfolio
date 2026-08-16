import { ConflictError, NotFoundError, ValidationError } from '../../lib/errors.js';
import type { LabRepository } from '../../repositories/contracts/lab.repository.js';
import type { ScenarioRuntimeRepository } from '../../repositories/contracts/scenario-runtime.repository.js';
import type { DevOpsService } from '../devops/devops.service.js';
import type { LinuxService } from '../linux/linux.service.js';
import type { NetworkingService } from '../networking/networking.service.js';
import type { LabAggregate, LabScenarioRecord } from '../../types/lab-platform.js';
import type {
  ScenarioCatalogItem,
  ScenarioOverview,
  ScenarioRuntimeRecord,
  ScenarioRuntimeView,
  ScenarioVerificationResult,
} from '../../types/scenario.js';
import { applyScenarioActions, verifyScenarioActions, type ScenarioDomainState } from './scenario-mutators.js';

const RUNTIME_RETENTION_MS = 24 * 60 * 60 * 1000;

const RUNTIME_NOTE = 'This runtime is a session-scoped portfolio simulation overlay. It does not modify canonical Lab state or execute commands against external infrastructure.';

function catalogItem(scenario: LabScenarioRecord): ScenarioCatalogItem {
  return {
    id: scenario.id,
    slug: scenario.slug,
    title: scenario.title,
    summary: scenario.summary,
    description: scenario.description,
    order: scenario.order,
    isEnabled: scenario.isEnabled,
    expectedObservations: scenario.expectedObservations,
    verificationCriteria: scenario.verificationCriteria,
  };
}

function runtimeView(runtime: ScenarioRuntimeRecord | null): ScenarioRuntimeView | null {
  if (!runtime) return null;
  return {
    id: runtime.id,
    labId: runtime.labId,
    scenarioId: runtime.scenarioId,
    scenarioSlug: runtime.scenario.slug,
    scenarioTitle: runtime.scenario.title,
    status: runtime.status,
    verification: runtime.verification,
    startedAt: runtime.startedAt.toISOString(),
    remediatedAt: runtime.remediatedAt?.toISOString() ?? null,
    verifiedAt: runtime.verifiedAt?.toISOString() ?? null,
    updatedAt: runtime.updatedAt.toISOString(),
    executionMode: 'SESSION_SCOPED_SIMULATION',
    note: RUNTIME_NOTE,
  };
}

function verificationResult(
  phase: ScenarioVerificationResult['phase'],
  checks: ScenarioVerificationResult['checks'],
): ScenarioVerificationResult {
  return {
    phase,
    passed: checks.length > 0 && checks.every((entry) => entry.passed),
    checks,
    verifiedAt: new Date().toISOString(),
  };
}

export class ScenarioEngineService {
  constructor(
    private readonly labs: LabRepository,
    private readonly runtimes: ScenarioRuntimeRepository,
    private readonly networking: NetworkingService,
    private readonly linux: LinuxService,
    private readonly devOps: DevOpsService,
  ) {}

  async getOverview(identifier: string, sessionKey?: string): Promise<ScenarioOverview> {
    const aggregate = await this.publicAggregate(identifier);
    const runtime = sessionKey ? await this.runtimes.find(sessionKey, aggregate.id) : null;
    return this.overview(aggregate, runtime);
  }

  async run(identifier: string, sessionKey: string, scenarioSlug: string): Promise<ScenarioOverview> {
    await this.runtimes.deleteExpired(new Date(Date.now() - RUNTIME_RETENTION_MS));
    const aggregate = await this.publicAggregate(identifier);
    const scenario = aggregate.scenarios.find((entry) => entry.slug === scenarioSlug && entry.isEnabled);
    if (!scenario) throw new NotFoundError('Enabled Lab scenario not found');
    if (!scenario.actions) throw new ValidationError('Scenario has no executable simulation actions');

    const existing = await this.runtimes.find(sessionKey, aggregate.id);
    if (existing) {
      throw new ConflictError(
        `Reset the existing ${existing.status.toLowerCase()} scenario runtime before starting another scenario`,
      );
    }

    const baseline = await this.baseline(aggregate);
    applyScenarioActions(baseline, scenario.actions); // validates the safe, whitelisted mutation contract before persistence.

    const runtime = await this.runtimes.createActive(sessionKey, aggregate.id, scenario.id, scenario.actions);
    if (!runtime) {
      const raced = await this.runtimes.find(sessionKey, aggregate.id);
      throw new ConflictError(
        raced
          ? `Reset the existing ${raced.status.toLowerCase()} scenario runtime before starting another scenario`
          : 'A scenario runtime was created concurrently; refresh the runtime before trying again',
      );
    }
    return this.overview(aggregate, runtime);
  }

  async verify(identifier: string, sessionKey: string): Promise<ScenarioOverview> {
    const aggregate = await this.publicAggregate(identifier);
    const runtime = await this.runtimes.find(sessionKey, aggregate.id);
    if (!runtime) throw new NotFoundError('No scenario runtime exists for this session and Lab');

    const baseline = await this.baseline(aggregate);
    let verification: ScenarioVerificationResult;
    let nextStatus = runtime.status;

    if (runtime.status === 'ACTIVE') {
      const simulated = applyScenarioActions(baseline, runtime.appliedActions);
      const checks = verifyScenarioActions(simulated, runtime.appliedActions);
      verification = verificationResult('SCENARIO_STATE', checks);
    } else {
      const canonicalFingerprint = JSON.stringify(baseline);
      const effectiveWithoutOverlay = JSON.stringify(await this.effective(aggregate, sessionKey));
      verification = verificationResult('RECOVERY', [
        {
          id: 'session-overlay-disabled',
          passed: runtime.status === 'REMEDIATED' || runtime.status === 'VERIFIED',
          summary: 'The scenario overlay is disabled for the session.',
          evidence: [`runtimeStatus=${runtime.status}`],
        },
        {
          id: 'canonical-baseline-restored',
          passed: canonicalFingerprint === effectiveWithoutOverlay,
          summary: 'Recovery resolves to the canonical recorded Lab baseline without rewriting it.',
          evidence: ['canonical-state-source=Lab normalized state', 'runtime-overlay=disabled'],
        },
      ]);
      if (verification.passed) nextStatus = 'VERIFIED';
    }

    const updated = await this.runtimes.updateState(sessionKey, aggregate.id, {
      status: nextStatus,
      verification,
      ...(nextStatus === 'VERIFIED' ? { verifiedAt: new Date(verification.verifiedAt) } : {}),
    });
    if (!updated) throw new NotFoundError('Scenario runtime disappeared during verification');
    return this.overview(aggregate, updated);
  }

  async remediate(identifier: string, sessionKey: string): Promise<ScenarioOverview> {
    const aggregate = await this.publicAggregate(identifier);
    const runtime = await this.runtimes.find(sessionKey, aggregate.id);
    if (!runtime) throw new NotFoundError('No scenario runtime exists for this session and Lab');
    if (runtime.status !== 'ACTIVE') {
      throw new ConflictError(`Scenario runtime is already ${runtime.status.toLowerCase()}`);
    }

    const updated = await this.runtimes.updateState(sessionKey, aggregate.id, {
      status: 'REMEDIATED',
      verification: null,
      remediatedAt: new Date(),
      verifiedAt: null,
    });
    if (!updated) throw new NotFoundError('Scenario runtime disappeared during remediation');
    return this.overview(aggregate, updated);
  }

  async reset(identifier: string, sessionKey: string): Promise<ScenarioOverview> {
    const aggregate = await this.publicAggregate(identifier);
    await this.runtimes.delete(sessionKey, aggregate.id);
    return this.overview(aggregate, null);
  }

  async hasActiveRuntime(identifier: string, sessionKey?: string): Promise<boolean> {
    if (!sessionKey) return false;
    const aggregate = await this.publicAggregate(identifier);
    return (await this.runtimes.find(sessionKey, aggregate.id))?.status === 'ACTIVE';
  }

  private overview(aggregate: LabAggregate, runtime: ScenarioRuntimeRecord | null): ScenarioOverview {
    return {
      schemaVersion: 'scenario.runtime.v1',
      lab: {
        id: aggregate.id,
        slug: aggregate.slug,
        title: aggregate.title,
        domain: aggregate.domain,
      },
      scenarios: aggregate.scenarios.filter((entry) => entry.isEnabled).map(catalogItem),
      runtime: runtimeView(runtime),
      mutationScope: 'SESSION_ONLY',
      canonicalStateMutable: false,
      note: RUNTIME_NOTE,
    };
  }

  private async publicAggregate(identifier: string): Promise<LabAggregate> {
    const aggregate = await this.labs.findAggregateById(identifier) ?? await this.labs.findAggregateBySlug(identifier);
    if (!aggregate || aggregate.status !== 'READY' || aggregate.project?.status !== 'PUBLISHED') {
      throw new NotFoundError('Public Lab not found');
    }
    if (!['NETWORKING', 'LINUX', 'DEVOPS'].includes(aggregate.domain)) {
      throw new ValidationError(`Unsupported scenario domain: ${aggregate.domain}`);
    }
    return aggregate;
  }

  private async baseline(aggregate: LabAggregate): Promise<ScenarioDomainState> {
    if (aggregate.domain === 'NETWORKING') return this.networking.getBaselinePublic(aggregate.id);
    if (aggregate.domain === 'LINUX') return this.linux.getBaselinePublic(aggregate.id);
    if (aggregate.domain === 'DEVOPS') return this.devOps.getBaselinePublic(aggregate.id);
    throw new ValidationError(`Unsupported scenario domain: ${aggregate.domain}`);
  }

  private async effective(aggregate: LabAggregate, sessionKey: string): Promise<ScenarioDomainState> {
    if (aggregate.domain === 'NETWORKING') return this.networking.getPublic(aggregate.id, sessionKey);
    if (aggregate.domain === 'LINUX') return this.linux.getPublic(aggregate.id, sessionKey);
    if (aggregate.domain === 'DEVOPS') return this.devOps.getPublic(aggregate.id, sessionKey);
    throw new ValidationError(`Unsupported scenario domain: ${aggregate.domain}`);
  }
}
