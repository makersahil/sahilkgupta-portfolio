import type {
  ScenarioRuntimeRecord,
  ScenarioRuntimeStatus,
  ScenarioVerificationResult,
} from '../../types/scenario.js';

export interface ScenarioRuntimeUpdate {
  status: ScenarioRuntimeStatus;
  verification?: ScenarioVerificationResult | null;
  remediatedAt?: Date | null;
  verifiedAt?: Date | null;
}

export interface ScenarioRuntimeRepository {
  find(sessionKey: string, labId: string): Promise<ScenarioRuntimeRecord | null>;
  createActive(
    sessionKey: string,
    labId: string,
    scenarioId: string,
    appliedActions: unknown,
  ): Promise<ScenarioRuntimeRecord | null>;
  updateState(
    sessionKey: string,
    labId: string,
    input: ScenarioRuntimeUpdate,
  ): Promise<ScenarioRuntimeRecord | null>;
  delete(sessionKey: string, labId: string): Promise<boolean>;
  deleteExpired(before: Date): Promise<number>;
}
