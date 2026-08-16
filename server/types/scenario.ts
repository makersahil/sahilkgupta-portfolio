export type ScenarioRuntimeStatus = 'ACTIVE' | 'REMEDIATED' | 'VERIFIED';
export type ScenarioVerificationPhase = 'SCENARIO_STATE' | 'RECOVERY';

export interface ScenarioVerificationCheck {
  id: string;
  passed: boolean;
  summary: string;
  evidence: string[];
}

export interface ScenarioVerificationResult {
  phase: ScenarioVerificationPhase;
  passed: boolean;
  checks: ScenarioVerificationCheck[];
  verifiedAt: string;
}

export interface ScenarioCatalogItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string | null;
  order: number;
  isEnabled: boolean;
  expectedObservations: unknown;
  verificationCriteria: unknown;
}

export interface ScenarioRuntimeRecord {
  id: string;
  sessionKey: string;
  labId: string;
  scenarioId: string;
  status: ScenarioRuntimeStatus;
  appliedActions: unknown;
  verification: ScenarioVerificationResult | null;
  startedAt: Date;
  remediatedAt: Date | null;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  scenario: ScenarioCatalogItem;
}

export interface ScenarioRuntimeView {
  id: string;
  labId: string;
  scenarioId: string;
  scenarioSlug: string;
  scenarioTitle: string;
  status: ScenarioRuntimeStatus;
  verification: ScenarioVerificationResult | null;
  startedAt: string;
  remediatedAt: string | null;
  verifiedAt: string | null;
  updatedAt: string;
  executionMode: 'SESSION_SCOPED_SIMULATION';
  note: string;
}

export interface ScenarioOverview {
  schemaVersion: 'scenario.runtime.v1';
  lab: {
    id: string;
    slug: string;
    title: string;
    domain: 'NETWORKING' | 'LINUX' | 'DEVOPS';
  };
  scenarios: ScenarioCatalogItem[];
  runtime: ScenarioRuntimeView | null;
  mutationScope: 'SESSION_ONLY';
  canonicalStateMutable: false;
  note: string;
}
