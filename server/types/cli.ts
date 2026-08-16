export type UnifiedCliDomain = 'PORTFOLIO' | 'NETWORKING' | 'LINUX' | 'DEVOPS';
export type UnifiedCliScope = 'ROOT' | 'LAB' | 'DEVICE' | 'HOST' | 'PIPELINE';
export type UnifiedCliOutputType = 'stdout' | 'stderr' | 'table' | 'banner' | 'system';

export interface UnifiedCliTarget {
  kind: 'DEVICE' | 'HOST' | 'PIPELINE';
  key: string;
  label: string;
  status: string | null;
}

export interface UnifiedCliContext {
  contextId: string;
  prompt: string;
  domain: UnifiedCliDomain;
  scope: UnifiedCliScope;
  lab: { id: string; slug: string; title: string } | null;
  target: UnifiedCliTarget | null;
  availableInspectors: string[];
  executionMode: 'RECORDED_STATE' | 'SCENARIO_RUNTIME';
  mutable: boolean;
  note: string;
}

export interface UnifiedCliContextSummary {
  contextId: string;
  prompt: string;
  domain: Exclude<UnifiedCliDomain, 'PORTFOLIO'>;
  labTitle: string;
  projectTitle: string;
}

export interface UnifiedCliBootstrap {
  schemaVersion: 'cli.v1';
  context: UnifiedCliContext;
  contexts: UnifiedCliContextSummary[];
  commandHints: string[];
  note: string;
}

export interface UnifiedCliExecutionResult {
  schemaVersion: 'cli.v1';
  command: string;
  output: string;
  exitCode: number;
  type: UnifiedCliOutputType;
  context: UnifiedCliContext;
  contextChanged: boolean;
  clear: boolean;
  note: string;
}
