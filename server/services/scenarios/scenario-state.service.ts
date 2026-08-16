import type { ScenarioRuntimeRepository } from '../../repositories/contracts/scenario-runtime.repository.js';
import { applyScenarioActions, type ScenarioDomainState } from './scenario-mutators.js';

export class ScenarioStateService {
  constructor(private readonly runtimes: ScenarioRuntimeRepository) {}

  async apply<T extends ScenarioDomainState>(sessionKey: string | undefined, baseline: T): Promise<T> {
    if (!sessionKey) return baseline;
    const runtime = await this.runtimes.find(sessionKey, baseline.lab.id);
    if (!runtime || runtime.status !== 'ACTIVE') return baseline;

    try {
      return applyScenarioActions(baseline, runtime.appliedActions);
    } catch {
      return {
        ...baseline,
        warnings: [
          ...baseline.warnings,
          'The session scenario overlay could not be applied to the current canonical Lab state. Reset and run the scenario again.',
        ],
      } as T;
    }
  }
}
