import { NotFoundError } from '../../lib/errors.js';
import type {
  DevOpsFindingSeverity,
  DevOpsHealthCheck,
  DevOpsHealthStatus,
  DevOpsInvestigationFinding,
  DevOpsLabState,
  DevOpsOperationsSnapshot,
  DevOpsOperatorContext,
  DevOpsPipelineState,
  DevOpsScenarioReadiness,
} from '../../types/devops.js';
import type { DevOpsService } from './devops.service.js';

function contextSegment(value: string): string {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || 'LAB';
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim()))];
}

function scenarioSignals(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.observableSignals)) return [];
  return record.observableSignals.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
}

function healthRank(status: DevOpsHealthStatus): number {
  switch (status) {
    case 'FAIL': return 3;
    case 'WARN': return 2;
    case 'UNKNOWN': return 1;
    default: return 0;
  }
}

function findingRank(severity: DevOpsFindingSeverity): number {
  switch (severity) {
    case 'CRITICAL': return 3;
    case 'WARN': return 2;
    default: return 1;
  }
}

function pipelineEvidence(pipeline: DevOpsPipelineState): string[] {
  return unique([
    `pipeline:${pipeline.id}=${pipeline.status}`,
    ...pipeline.stages.map((stage) => `stage:${pipeline.id}/${stage.id}=${stage.status}`),
    ...pipeline.stages.filter((stage) => stage.recordedOutput).map((stage) => `${stage.name}: ${stage.recordedOutput}`),
  ]);
}

function moduleRepresented(
  state: DevOpsLabState,
  capabilityNames: string[],
  inputTypes: string[],
  hasRecordedState: boolean,
): boolean {
  if (hasRecordedState) return true;
  const capabilities = new Set(state.lab.capabilities.map((entry) => entry.toLowerCase()));
  if (capabilityNames.some((entry) => capabilities.has(entry.toLowerCase()))) return true;
  const recordedInputs = new Set(state.provenance.inputTypes.map((entry) => entry.toUpperCase()));
  return inputTypes.some((entry) => recordedInputs.has(entry.toUpperCase()));
}

function buildHealthChecks(state: DevOpsLabState): DevOpsHealthCheck[] {
  const checks: DevOpsHealthCheck[] = [];

  const pipelineRepresented = moduleRepresented(
    state,
    ['pipeline'],
    ['CI_PIPELINE'],
    state.pipelines.length > 0,
  );
  if (pipelineRepresented) {
    if (state.pipelines.length === 0) {
      checks.push({
        id: 'pipeline-state', category: 'PIPELINE', status: 'UNKNOWN', title: 'Pipeline state',
        summary: 'This Lab declares a pipeline capability/input, but no normalized CI/CD pipeline snapshot is available.', evidence: [], relatedResources: [],
      });
    } else {
      const failed = state.pipelines.filter((pipeline) => pipeline.status === 'FAILED' || pipeline.stages.some((stage) => stage.status === 'FAILED'));
      const pending = state.pipelines.filter((pipeline) => ['RUNNING', 'PENDING'].includes(pipeline.status) || pipeline.stages.some((stage) => ['RUNNING', 'PENDING'].includes(stage.status)));
      const unknown = state.pipelines.filter((pipeline) => pipeline.status === 'UNKNOWN' || pipeline.stages.some((stage) => stage.status === 'UNKNOWN'));
      const status: DevOpsHealthStatus = failed.length > 0 ? 'FAIL' : pending.length > 0 ? 'WARN' : unknown.length > 0 ? 'UNKNOWN' : 'PASS';
      checks.push({
        id: 'pipeline-state', category: 'PIPELINE', status, title: 'Recorded pipeline state',
        summary: failed.length > 0
          ? `${failed.length} pipeline snapshot${failed.length === 1 ? '' : 's'} contains a recorded failure.`
          : pending.length > 0
            ? 'At least one pipeline snapshot is still recorded as running or pending.'
            : unknown.length > 0
              ? 'At least one pipeline or stage does not have a conclusive recorded status.'
              : 'All recorded pipeline and stage statuses are successful.',
        evidence: state.pipelines.flatMap(pipelineEvidence).slice(0, 12),
        relatedResources: state.pipelines.map((pipeline) => `pipeline/${pipeline.id}`),
      });
    }
  }

  const terraformRepresented = moduleRepresented(
    state,
    ['terraform', 'iac'],
    ['TERRAFORM'],
    Boolean(state.terraform),
  );
  if (terraformRepresented) {
    if (!state.terraform) {
      checks.push({
        id: 'terraform-state', category: 'TERRAFORM', status: 'UNKNOWN', title: 'Terraform state',
        summary: 'This Lab declares Terraform/IaC input, but no normalized Terraform snapshot is available.', evidence: [], relatedResources: [],
      });
    } else {
      const status: DevOpsHealthStatus = state.terraform.driftStatus === 'ERROR'
        ? 'FAIL'
        : state.terraform.driftStatus === 'DRIFTED'
          ? 'WARN'
          : state.terraform.driftStatus === 'CLEAN'
            ? 'PASS'
            : 'UNKNOWN';
      checks.push({
        id: 'terraform-state', category: 'TERRAFORM', status, title: 'Terraform drift/state snapshot',
        summary: state.terraform.driftStatus === 'DRIFTED'
          ? state.terraform.driftSummary ?? 'The recorded Terraform snapshot reports drift or pending changes.'
          : state.terraform.driftStatus === 'ERROR'
            ? state.terraform.driftSummary ?? 'The recorded Terraform plan/state inspection reports an error.'
            : state.terraform.driftStatus === 'CLEAN'
              ? state.terraform.driftSummary ?? 'The recorded Terraform plan/state snapshot reports no changes.'
              : 'Terraform files are present, but no conclusive drift/plan result is recorded.',
        evidence: unique([
          `terraform:drift=${state.terraform.driftStatus}`,
          state.terraform.workspace ? `workspace:${state.terraform.workspace}` : null,
          state.terraform.backend ? `backend:${state.terraform.backend}` : null,
          state.terraform.recordedPlanOutput,
        ]),
        relatedResources: state.terraform.files.filter((file) => file.type === 'FILE').map((file) => file.path).slice(0, 10),
      });
    }
  }

  const workloads = state.kubernetes.workloads;
  const clusters = state.kubernetes.clusters;
  const kubernetesRepresented = moduleRepresented(
    state,
    ['kubernetes'],
    ['KUBERNETES_MANIFEST'],
    clusters.length > 0 || workloads.length > 0,
  );
  if (kubernetesRepresented) {
    if (clusters.length === 0 && workloads.length === 0) {
      checks.push({
        id: 'kubernetes-state', category: 'KUBERNETES', status: 'UNKNOWN', title: 'Kubernetes state',
        summary: 'This Lab declares Kubernetes input, but no normalized cluster or workload snapshot is available.', evidence: [], relatedResources: [],
      });
    } else {
      const failedClusters = clusters.filter((cluster) => cluster.status === 'FAILED');
      const degradedClusters = clusters.filter((cluster) => cluster.status === 'DEGRADED');
      const failedWorkloads = workloads.filter((workload) => workload.status === 'FAILED');
      const underReady = workloads.filter((workload) => workload.desiredReplicas !== null && workload.readyReplicas !== null && workload.readyReplicas < workload.desiredReplicas);
      const unknown = clusters.some((cluster) => cluster.status === 'UNKNOWN') || workloads.some((workload) => workload.status === 'UNKNOWN' || (workload.desiredReplicas !== null && workload.readyReplicas === null));
      const status: DevOpsHealthStatus = failedClusters.length > 0 || failedWorkloads.length > 0
        ? 'FAIL'
        : degradedClusters.length > 0 || underReady.length > 0
          ? 'WARN'
          : unknown
            ? 'UNKNOWN'
            : 'PASS';
      checks.push({
        id: 'kubernetes-state', category: 'KUBERNETES', status, title: 'Kubernetes workload snapshot',
        summary: failedClusters.length + failedWorkloads.length > 0
          ? 'Recorded Kubernetes state contains a failed cluster or workload.'
          : degradedClusters.length + underReady.length > 0
            ? 'Recorded Kubernetes state contains degraded or under-ready resources.'
            : unknown
              ? 'Recorded Kubernetes state is incomplete for at least one resource.'
              : 'Recorded Kubernetes resources are ready and replica counts are aligned.',
        evidence: unique([
          ...clusters.map((cluster) => `cluster:${cluster.name}=${cluster.status}`),
          ...workloads.map((workload) => `workload:${workload.namespace ?? 'default'}/${workload.name}=${workload.status};ready=${workload.readyReplicas ?? '?'}/${workload.desiredReplicas ?? '?'}`),
        ]).slice(0, 16),
        relatedResources: [...clusters.map((cluster) => `cluster/${cluster.name}`), ...workloads.map((workload) => `${workload.namespace ?? 'default'}/${workload.kind}/${workload.name}`)],
      });
    }
  }

  const gitOpsRepresented = moduleRepresented(
    state,
    ['gitops'],
    ['ARGOCD'],
    state.gitops.length > 0,
  );
  if (gitOpsRepresented) {
    if (state.gitops.length === 0) {
      checks.push({
        id: 'gitops-state', category: 'GITOPS', status: 'UNKNOWN', title: 'GitOps reconciliation',
        summary: 'This Lab declares a GitOps input/capability, but no normalized reconciliation snapshot is available.', evidence: [], relatedResources: [],
      });
    } else {
      const degraded = state.gitops.filter((app) => app.healthStatus === 'DEGRADED');
      const outOfSync = state.gitops.filter((app) => app.syncStatus === 'OUT_OF_SYNC');
      const unknown = state.gitops.some((app) => app.syncStatus === 'UNKNOWN' || app.healthStatus === 'UNKNOWN');
      const status: DevOpsHealthStatus = degraded.length > 0 ? 'FAIL' : outOfSync.length > 0 ? 'WARN' : unknown ? 'UNKNOWN' : 'PASS';
      checks.push({
        id: 'gitops-state', category: 'GITOPS', status, title: 'GitOps reconciliation snapshot',
        summary: degraded.length > 0
          ? `${degraded.length} application${degraded.length === 1 ? '' : 's'} is recorded as degraded.`
          : outOfSync.length > 0
            ? `${outOfSync.length} application${outOfSync.length === 1 ? '' : 's'} is recorded out of sync.`
            : unknown
              ? 'At least one application has incomplete sync or health state.'
              : 'Recorded GitOps applications are synced and healthy.',
        evidence: state.gitops.map((app) => `app:${app.name};sync=${app.syncStatus};health=${app.healthStatus};revision=${app.revision ?? 'unknown'}`),
        relatedResources: state.gitops.map((app) => `gitops/${app.name}`),
      });
    }
  }

  const helmRepresented = moduleRepresented(state, ['helm'], ['HELM'], state.helm.length > 0);
  if (helmRepresented) {
    if (state.helm.length === 0) {
      checks.push({
        id: 'helm-state', category: 'HELM', status: 'UNKNOWN', title: 'Helm release snapshot',
        summary: 'This Lab declares Helm input/capability, but no normalized release snapshot is available.', evidence: [], relatedResources: [],
      });
    } else {
      const failed = state.helm.filter((release) => release.status === 'FAILED');
      const degraded = state.helm.filter((release) => release.status === 'DEGRADED');
      const unknown = state.helm.some((release) => release.status === 'UNKNOWN');
      const status: DevOpsHealthStatus = failed.length > 0 ? 'FAIL' : degraded.length > 0 ? 'WARN' : unknown ? 'UNKNOWN' : 'PASS';
      checks.push({
        id: 'helm-state', category: 'HELM', status, title: 'Helm release snapshot',
        summary: failed.length > 0 ? 'A recorded Helm release is failed.' : degraded.length > 0 ? 'A recorded Helm release is degraded.' : unknown ? 'At least one Helm release has unknown status.' : 'Recorded Helm releases are ready.',
        evidence: state.helm.map((release) => `helm:${release.namespace ?? 'default'}/${release.name}=${release.status}`),
        relatedResources: state.helm.map((release) => `helm/${release.namespace ?? 'default'}/${release.name}`),
      });
    }
  }

  const policyRepresented = moduleRepresented(
    state,
    ['network-policy'],
    ['CILIUM_POLICY'],
    state.networkPolicies.length > 0,
  );
  if (policyRepresented) {
    if (state.networkPolicies.length === 0) {
      checks.push({
        id: 'network-policy-state', category: 'NETWORK_POLICY', status: 'UNKNOWN', title: 'Network-policy snapshot',
        summary: 'This Lab declares network-policy input/capability, but no normalized policy snapshot is available.', evidence: [], relatedResources: [],
      });
    } else {
      const unverified = state.networkPolicies.filter((policy) => policy.status !== 'ENFORCED');
      checks.push({
        id: 'network-policy-state', category: 'NETWORK_POLICY', status: unverified.length > 0 ? 'UNKNOWN' : 'PASS', title: 'Network-policy snapshot',
        summary: unverified.length > 0 ? 'Some policy records do not prove enforcement; they remain observational only.' : 'All recorded policy records explicitly report enforced state.',
        evidence: state.networkPolicies.map((policy) => `policy:${policy.namespace ?? 'default'}/${policy.name}=${policy.status}`),
        relatedResources: state.networkPolicies.map((policy) => `policy/${policy.namespace ?? 'default'}/${policy.name}`),
      });
    }
  }

  const observabilityRepresented = moduleRepresented(
    state,
    ['observability'],
    ['OBSERVABILITY_SNAPSHOT'],
    state.observability.length > 0,
  );
  if (observabilityRepresented) {
    if (state.observability.length === 0) {
      checks.push({
        id: 'observability-state', category: 'OBSERVABILITY', status: 'UNKNOWN', title: 'Observability evidence',
        summary: 'This Lab declares observability input/capability, but no normalized observability snapshot is available.', evidence: [], relatedResources: [],
      });
    } else {
      const failed = state.observability.filter((entry) => entry.status === 'FAIL');
      const warned = state.observability.filter((entry) => entry.status === 'WARN');
      const unknown = state.observability.filter((entry) => entry.status === 'UNKNOWN');
      const status: DevOpsHealthStatus = failed.length > 0 ? 'FAIL' : warned.length > 0 ? 'WARN' : unknown.length > 0 ? 'UNKNOWN' : 'PASS';
      checks.push({
        id: 'observability-state', category: 'OBSERVABILITY', status, title: 'Recorded observability signals',
        summary: failed.length > 0 ? 'At least one recorded observability signal is failing.' : warned.length > 0 ? 'At least one recorded observability signal is warning.' : unknown.length > 0 ? 'At least one observability signal is inconclusive.' : 'All recorded observability signals pass.',
        evidence: state.observability.map((entry) => `${entry.name}=${entry.status}${entry.summary ? `; ${entry.summary}` : ''}`),
        relatedResources: state.observability.map((entry) => `observation/${entry.id}`),
      });
    }
  }

  if (checks.length === 0) {
    checks.push({
      id: 'devops-data', category: 'DATA', status: 'UNKNOWN', title: 'Operational evidence',
      summary: 'This Lab has no supported operational snapshot to evaluate. Missing modules are not treated as healthy.',
      evidence: [], relatedResources: [],
    });
  }

  return checks.sort((left, right) => healthRank(right.status) - healthRank(left.status) || left.id.localeCompare(right.id));
}

function buildFindings(state: DevOpsLabState): DevOpsInvestigationFinding[] {
  const findings: DevOpsInvestigationFinding[] = [];

  for (const pipeline of state.pipelines) {
    const failedStages = pipeline.stages.filter((stage) => stage.status === 'FAILED');
    if (pipeline.status === 'FAILED' || failedStages.length > 0) {
      findings.push({
        id: `pipeline-${pipeline.id}-failed`, category: 'PIPELINE', severity: 'CRITICAL',
        title: `Pipeline failure: ${pipeline.name}`,
        summary: failedStages.length > 0
          ? `${failedStages.length} recorded stage${failedStages.length === 1 ? '' : 's'} failed. Start with the recorded stage output and produced artifacts.`
          : 'The pipeline snapshot is recorded as failed even though a specific failed stage is not available.',
        evidence: pipelineEvidence(pipeline),
        suggestedCommands: [`Inspect pipeline ${pipeline.id} and its recorded stage output`, ...failedStages.map((stage) => `Inspect stage ${stage.id} (${stage.name})`)],
        remediationGuidance: ['Identify the first failing recorded stage before changing downstream deployment state.', 'Verify the source revision and artifact from the failing stage before retrying any future execution.'],
        relatedResource: `pipeline/${pipeline.id}`, interpretation: 'RECORDED_STATE_DIAGNOSTIC',
      });
    }
  }

  if (state.terraform?.driftStatus === 'DRIFTED' || state.terraform?.driftStatus === 'ERROR') {
    const severity: DevOpsFindingSeverity = state.terraform.driftStatus === 'ERROR' ? 'CRITICAL' : 'WARN';
    findings.push({
      id: 'terraform-drift', category: 'TERRAFORM', severity,
      title: state.terraform.driftStatus === 'ERROR' ? 'Terraform plan/state error' : 'Terraform drift recorded',
      summary: state.terraform.driftSummary ?? (state.terraform.driftStatus === 'ERROR' ? 'Recorded Terraform state inspection failed.' : 'Recorded Terraform state indicates changes or drift.'),
      evidence: unique([`drift=${state.terraform.driftStatus}`, state.terraform.recordedPlanOutput]),
      suggestedCommands: ['terraform plan -detailed-exitcode', 'terraform state list'],
      remediationGuidance: ['Review the recorded plan before applying infrastructure changes.', 'Reconcile configuration and state intentionally; do not auto-apply from the portfolio.'],
      relatedResource: 'terraform', interpretation: 'RECORDED_STATE_DIAGNOSTIC',
    });
  }

  for (const workload of state.kubernetes.workloads) {
    const replicaMismatch = workload.desiredReplicas !== null && workload.readyReplicas !== null && workload.readyReplicas < workload.desiredReplicas;
    if (workload.status === 'FAILED' || workload.status === 'DEGRADED' || replicaMismatch) {
      const ns = workload.namespace ?? 'default';
      findings.push({
        id: `kubernetes-${ns}-${workload.kind}-${workload.name}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
        category: 'KUBERNETES', severity: workload.status === 'FAILED' ? 'CRITICAL' : 'WARN',
        title: `Kubernetes workload issue: ${workload.kind}/${workload.name}`,
        summary: replicaMismatch
          ? `Recorded readiness is ${workload.readyReplicas}/${workload.desiredReplicas}; the workload has not reached its desired replica count.`
          : `The workload is recorded as ${workload.status}.`,
        evidence: [`namespace=${ns}`, `status=${workload.status}`, `ready=${workload.readyReplicas ?? '?'}/${workload.desiredReplicas ?? '?'}`, workload.image ? `image=${workload.image}` : ''],
        suggestedCommands: [
          `kubectl -n ${shellQuote(ns)} get ${workload.kind.toLowerCase()} ${shellQuote(workload.name)} -o wide`,
          `kubectl -n ${shellQuote(ns)} describe ${workload.kind.toLowerCase()} ${shellQuote(workload.name)}`,
          `kubectl -n ${shellQuote(ns)} rollout status ${workload.kind.toLowerCase()}/${shellQuote(workload.name)}`,
        ],
        remediationGuidance: ['Inspect rollout events and failing pods before restarting or scaling.', 'Confirm the recorded image/revision and dependency health before a future rollout retry.'],
        relatedResource: `${ns}/${workload.kind}/${workload.name}`, interpretation: 'RECORDED_STATE_DIAGNOSTIC',
      });
    }
  }

  for (const app of state.gitops) {
    if (app.syncStatus === 'OUT_OF_SYNC' || app.healthStatus === 'DEGRADED') {
      findings.push({
        id: `gitops-${app.name}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-'), category: 'GITOPS',
        severity: app.healthStatus === 'DEGRADED' ? 'CRITICAL' : 'WARN',
        title: `GitOps reconciliation issue: ${app.name}`,
        summary: `Recorded sync=${app.syncStatus} and health=${app.healthStatus}.`,
        evidence: unique([`revision=${app.revision ?? 'unknown'}`, `destination=${app.destination ?? 'unknown'}`, `controller=${app.controller}`]),
        suggestedCommands: [`argocd app get ${shellQuote(app.name)}`, `argocd app diff ${shellQuote(app.name)}`],
        remediationGuidance: ['Compare desired Git revision with recorded live state before synchronizing.', 'Investigate degraded resources before forcing a GitOps sync.'],
        relatedResource: `gitops/${app.name}`, interpretation: 'RECORDED_STATE_DIAGNOSTIC',
      });
    }
  }

  for (const release of state.helm) {
    if (release.status === 'FAILED' || release.status === 'DEGRADED') {
      const ns = release.namespace ?? 'default';
      findings.push({
        id: `helm-${ns}-${release.name}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-'), category: 'HELM',
        severity: release.status === 'FAILED' ? 'CRITICAL' : 'WARN',
        title: `Helm release issue: ${release.name}`,
        summary: `The recorded Helm release is ${release.status}.`,
        evidence: unique([`namespace=${ns}`, release.chart ? `chart=${release.chart}` : null, release.version ? `version=${release.version}` : null]),
        suggestedCommands: [`helm -n ${shellQuote(ns)} status ${shellQuote(release.name)}`, `helm -n ${shellQuote(ns)} history ${shellQuote(release.name)}`],
        remediationGuidance: ['Inspect the recorded chart/revision and Kubernetes events before any future rollback or upgrade.', 'Do not infer Helm recovery from status alone; verify workload health after remediation.'],
        relatedResource: `helm/${ns}/${release.name}`, interpretation: 'RECORDED_STATE_DIAGNOSTIC',
      });
    }
  }

  for (const policy of state.networkPolicies) {
    if (policy.status !== 'ENFORCED') {
      const ns = policy.namespace ?? 'default';
      findings.push({
        id: `policy-${ns}-${policy.name}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-'), category: 'NETWORK_POLICY', severity: 'INFO',
        title: `Policy enforcement is not verified: ${policy.name}`,
        summary: 'The policy record exists, but the snapshot does not prove active enforcement.',
        evidence: unique([policy.provider, policy.summary, `status=${policy.status}`]),
        suggestedCommands: [`kubectl -n ${shellQuote(ns)} get ciliumnetworkpolicies ${shellQuote(policy.name)} -o yaml`],
        remediationGuidance: ['Verify the policy exists in the intended namespace and inspect enforcement status in the real cluster before claiming protection.'],
        relatedResource: `policy/${ns}/${policy.name}`, interpretation: 'RECORDED_STATE_DIAGNOSTIC',
      });
    }
  }

  for (const observation of state.observability) {
    if (observation.status === 'FAIL' || observation.status === 'WARN') {
      findings.push({
        id: `observation-${observation.id}`, category: 'OBSERVABILITY', severity: observation.status === 'FAIL' ? 'CRITICAL' : 'WARN',
        title: `Recorded observation ${observation.status.toLowerCase()}: ${observation.name}`,
        summary: observation.summary ?? 'A recorded observability signal requires investigation.',
        evidence: unique([observation.provider, observation.recordedOutput]),
        suggestedCommands: ['Inspect the recorded observation output and corresponding provider dashboard/query source.'],
        remediationGuidance: ['Correlate the observation with pipeline, workload, and GitOps state before taking action.', 'Verify recovery using the same signal source after remediation.'],
        relatedResource: `observation/${observation.id}`, interpretation: 'RECORDED_STATE_DIAGNOSTIC',
      });
    }
  }

  return findings.sort((left, right) => findingRank(right.severity) - findingRank(left.severity) || left.id.localeCompare(right.id));
}

function overallStatus(checks: DevOpsHealthCheck[]): DevOpsOperationsSnapshot['overallStatus'] {
  if (checks.some((check) => check.status === 'FAIL')) return 'CRITICAL';
  if (checks.some((check) => check.status === 'WARN')) return 'DEGRADED';
  if (checks.length === 0 || checks.some((check) => check.status === 'UNKNOWN')) return 'UNKNOWN';
  return 'HEALTHY';
}

function scenarioReadiness(state: DevOpsLabState): DevOpsScenarioReadiness[] {
  return state.scenarios
    .filter((scenario) => scenario.isEnabled)
    .map((scenario) => ({
      id: scenario.id,
      slug: scenario.slug,
      title: scenario.title,
      summary: scenario.summary,
      enabled: scenario.isEnabled,
      observableSignals: scenarioSignals(scenario.expectedObservations),
      executionAvailable: scenario.isEnabled,
    }));
}

export class DevOpsOperationsService {
  constructor(private readonly devOps: DevOpsService) {}

  async getOperations(identifier: string, sessionKey?: string): Promise<DevOpsOperationsSnapshot> {
    const state = await this.devOps.getPublic(identifier, sessionKey);
    const healthChecks = buildHealthChecks(state);
    const findings = buildFindings(state);
    const failedPipelines = state.pipelines.filter((pipeline) => pipeline.status === 'FAILED' || pipeline.stages.some((stage) => stage.status === 'FAILED')).length;
    const problemWorkloads = state.kubernetes.workloads.filter((workload) => workload.status === 'FAILED' || workload.status === 'DEGRADED' || (workload.desiredReplicas !== null && workload.readyReplicas !== null && workload.readyReplicas < workload.desiredReplicas)).length;
    const outOfSyncApplications = state.gitops.filter((app) => app.syncStatus === 'OUT_OF_SYNC' || app.healthStatus === 'DEGRADED').length;
    const failingObservations = state.observability.filter((entry) => entry.status === 'FAIL' || entry.status === 'WARN').length;

    return {
      schemaVersion: 'devops.operations.v1',
      labId: state.lab.id,
      labSlug: state.lab.slug,
      overallStatus: overallStatus(healthChecks),
      healthChecks,
      findings,
      scenarioReadiness: scenarioReadiness(state),
      counts: {
        pipelines: state.pipelines.length,
        failedPipelines,
        workloads: state.kubernetes.workloads.length,
        problemWorkloads,
        gitopsApplications: state.gitops.length,
        outOfSyncApplications,
        observations: state.observability.length,
        failingObservations,
        findings: findings.length,
      },
      executionAvailable: false,
      note: 'This snapshot reasons only over persisted recorded DevOps state. It does not execute CI/CD, Terraform, kubectl, Helm, ArgoCD, Cilium, cloud, or observability commands.',
    };
  }

  async getContext(identifier: string, pipelineId?: string, sessionKey?: string): Promise<DevOpsOperatorContext> {
    const state = await this.devOps.getPublic(identifier, sessionKey);
    const pipeline = pipelineId ? state.pipelines.find((entry) => entry.id === pipelineId) : null;
    if (pipelineId && !pipeline) throw new NotFoundError('DevOps pipeline not found');

    const labSegment = contextSegment(state.lab.slug);
    const pipelineSegment = pipeline ? contextSegment(pipeline.id) : null;
    const contextId = pipelineSegment ? `GITOPS/${labSegment}/${pipelineSegment}` : `GITOPS/${labSegment}`;

    return {
      contextId,
      prompt: `${contextId}>`,
      scope: pipeline ? 'PIPELINE' : 'LAB',
      lab: { id: state.lab.id, slug: state.lab.slug, title: state.lab.title },
      pipeline: pipeline ? { id: pipeline.id, name: pipeline.name, status: pipeline.status } : null,
      availableInspectors: ['repository', 'pipelines', 'terraform', 'kubernetes', 'gitops', 'helm', 'network-policy', 'observability', 'health', 'scenarios', 'evidence'],
      executionAvailable: false,
      note: 'Phase 5B publishes a stable GITOPS context contract only. Unified contextual command execution is implemented in Phase 6.',
    };
  }
}
