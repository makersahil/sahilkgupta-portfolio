import { ValidationError } from '../../lib/errors.js';
import type { CanonicalLabManifestV1 } from '../../types/lab-platform.js';
import type {
  DevOpsArchitectureLayer,
  DevOpsGitOpsApplication,
  DevOpsHelmRelease,
  DevOpsIaCFile,
  DevOpsKubernetesCluster,
  DevOpsKubernetesWorkload,
  DevOpsLabState,
  DevOpsLabSummary,
  DevOpsNetworkPolicyRecord,
  DevOpsObservationSource,
  DevOpsObservabilitySnapshot,
  DevOpsPipelineStageState,
  DevOpsPipelineState,
  DevOpsRepositoryState,
  DevOpsResourceStatus,
  DevOpsStageStatus,
  DevOpsStateProvenance,
  DevOpsTerraformState,
} from '../../types/devops.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const asRecord = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null;
const numberValue = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
const strings = (value: unknown): string[] => Array.isArray(value)
  ? value.map((entry) => text(entry)).filter((entry): entry is string => entry !== null)
  : typeof value === 'string'
    ? value.split(',').map((entry) => entry.trim()).filter(Boolean)
    : [];

function source(value: unknown): DevOpsObservationSource {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'RECORDED_PROJECT_FIXTURE') return 'RECORDED_PROJECT_FIXTURE';
  if (normalized === 'RECORDED_SNAPSHOT') return 'RECORDED_SNAPSHOT';
  return 'NORMALIZED_INPUT';
}

function stageStatus(value: unknown): DevOpsStageStatus {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (['SUCCESS', 'RUNNING', 'PENDING', 'FAILED'].includes(normalized)) return normalized as DevOpsStageStatus;
  return 'UNKNOWN';
}

function resourceStatus(value: unknown): DevOpsResourceStatus {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (['READY', 'HEALTHY', 'SUCCESS', 'RUNNING', 'SYNCED'].includes(normalized)) return 'READY';
  if (['DEGRADED', 'WARN', 'WARNING', 'PARTIAL'].includes(normalized)) return 'DEGRADED';
  if (['FAILED', 'ERROR', 'DOWN', 'UNHEALTHY'].includes(normalized)) return 'FAILED';
  return 'UNKNOWN';
}

function normalizeRepository(value: unknown): DevOpsRepositoryState | null {
  const record = asRecord(value);
  if (Object.keys(record).length === 0) return null;
  return {
    name: text(record.name),
    branch: text(record.branch),
    commitSha: text(record.commitSha ?? record.gitCommitSha ?? record.revision),
    source: source(record.source),
  };
}

function normalizeStages(value: unknown): DevOpsPipelineStageState[] {
  return asArray(value).map((entry, index) => {
    const record = asRecord(entry);
    return {
      id: text(record.id) ?? `stage-${index + 1}`,
      name: text(record.name ?? record.title) ?? `Stage ${index + 1}`,
      tool: text(record.tool),
      status: stageStatus(record.status),
      durationSeconds: numberValue(record.durationSeconds),
      recordedOutput: text(record.recordedOutput ?? record.stdoutSnippet ?? record.output),
      artifacts: strings(record.artifacts ?? record.artifactsProduced),
      source: source(record.source),
    };
  });
}

function pipelineStatus(stages: DevOpsPipelineStageState[], explicit: unknown): DevOpsStageStatus {
  const declared = stageStatus(explicit);
  if (declared !== 'UNKNOWN') return declared;
  if (stages.some((stage) => stage.status === 'FAILED')) return 'FAILED';
  if (stages.some((stage) => stage.status === 'RUNNING')) return 'RUNNING';
  if (stages.length > 0 && stages.every((stage) => stage.status === 'SUCCESS')) return 'SUCCESS';
  if (stages.some((stage) => stage.status === 'PENDING')) return 'PENDING';
  return 'UNKNOWN';
}

function normalizePipelines(root: Record<string, unknown>): DevOpsPipelineState[] {
  const explicit = asArray(root.pipelines);
  if (explicit.length > 0) {
    return explicit.map((entry, index) => {
      const record = asRecord(entry);
      const stages = normalizeStages(record.stages ?? record.pipelineStages);
      return {
        id: text(record.id) ?? `pipeline-${index + 1}`,
        name: text(record.name ?? record.title) ?? `Pipeline ${index + 1}`,
        framework: text(record.framework),
        status: pipelineStatus(stages, record.status),
        stages,
        source: source(record.source),
      };
    });
  }

  const legacyStages = normalizeStages(root.pipelineStages);
  if (legacyStages.length === 0) return [];
  return [{
    id: 'delivery',
    name: 'Recorded Delivery Pipeline',
    framework: text(root.framework),
    status: pipelineStatus(legacyStages, root.status),
    stages: legacyStages,
    source: 'RECORDED_PROJECT_FIXTURE',
  }];
}

function flattenIaCTree(value: unknown, result: DevOpsIaCFile[] = []): DevOpsIaCFile[] {
  for (const entry of asArray(value)) {
    const record = asRecord(entry);
    const path = text(record.path) ?? text(record.name);
    if (!path) continue;
    const type = String(record.type ?? '').toLowerCase() === 'directory' ? 'DIRECTORY' : 'FILE';
    result.push({
      name: text(record.name) ?? path.split('/').filter(Boolean).at(-1) ?? path,
      path,
      type,
      size: text(record.size),
      content: type === 'FILE' ? text(record.content) : null,
      source: source(record.source),
    });
    if (type === 'DIRECTORY') flattenIaCTree(record.children, result);
  }
  return result;
}

function normalizeTerraform(root: Record<string, unknown>): DevOpsTerraformState | null {
  const record = asRecord(root.terraform);
  const explicitFiles = asArray(record.files).length > 0 ? flattenIaCTree(record.files) : [];
  const legacyFiles = explicitFiles.length > 0 ? explicitFiles : flattenIaCTree(root.iacTree);
  const present = Boolean(record.present) || legacyFiles.some((file) => file.path.toLowerCase().endsWith('.tf'));
  if (!present && legacyFiles.length === 0) return null;
  const rawDrift = String(record.driftStatus ?? record.planStatus ?? '').trim().toUpperCase();
  const driftStatus: DevOpsTerraformState['driftStatus'] = rawDrift === 'CLEAN' || rawDrift === 'NO_CHANGES'
    ? 'CLEAN'
    : rawDrift === 'DRIFTED' || rawDrift === 'CHANGES' || rawDrift === 'CHANGES_PRESENT'
      ? 'DRIFTED'
      : rawDrift === 'ERROR' || rawDrift === 'FAILED'
        ? 'ERROR'
        : 'UNKNOWN';
  return {
    present,
    workspace: text(record.workspace),
    backend: text(record.backend),
    files: legacyFiles,
    driftStatus,
    driftSummary: text(record.driftSummary ?? record.planSummary),
    recordedPlanOutput: text(record.recordedPlanOutput ?? record.planOutput),
    source: source(record.source ?? (asArray(root.iacTree).length > 0 ? 'RECORDED_PROJECT_FIXTURE' : undefined)),
  };
}

function normalizeClusters(value: unknown): DevOpsKubernetesCluster[] {
  return asArray(value).map((entry, index) => {
    const record = asRecord(entry);
    return {
      name: text(record.name) ?? `cluster-${index + 1}`,
      version: text(record.version),
      status: resourceStatus(record.status),
      provider: text(record.provider),
      source: source(record.source),
    };
  });
}

function normalizeWorkloads(value: unknown): DevOpsKubernetesWorkload[] {
  return asArray(value).map((entry, index) => {
    const record = asRecord(entry);
    return {
      kind: text(record.kind) ?? 'Workload',
      namespace: text(record.namespace),
      name: text(record.name) ?? `workload-${index + 1}`,
      desiredReplicas: numberValue(record.desiredReplicas ?? record.replicas),
      readyReplicas: numberValue(record.readyReplicas ?? record.ready),
      status: resourceStatus(record.status),
      image: text(record.image),
      source: source(record.source),
    };
  });
}

function normalizeGitOps(value: unknown): DevOpsGitOpsApplication[] {
  return asArray(value).map((entry, index) => {
    const record = asRecord(entry);
    const sync = String(record.syncStatus ?? record.sync ?? '').toUpperCase();
    const health = String(record.healthStatus ?? record.health ?? '').toUpperCase();
    return {
      name: text(record.name) ?? `gitops-app-${index + 1}`,
      controller: text(record.controller) ?? 'GitOps controller',
      syncStatus: sync === 'SYNCED' ? 'SYNCED' : sync === 'OUT_OF_SYNC' || sync === 'OUTOFSYNC' ? 'OUT_OF_SYNC' : 'UNKNOWN',
      healthStatus: health === 'HEALTHY' ? 'HEALTHY' : health === 'DEGRADED' ? 'DEGRADED' : 'UNKNOWN',
      revision: text(record.revision),
      destination: text(record.destination),
      source: source(record.source),
    };
  });
}

function normalizeHelm(value: unknown): DevOpsHelmRelease[] {
  return asArray(value).map((entry, index) => {
    const record = asRecord(entry);
    return {
      name: text(record.name) ?? `release-${index + 1}`,
      namespace: text(record.namespace),
      chart: text(record.chart),
      version: text(record.version),
      status: resourceStatus(record.status),
      source: source(record.source),
    };
  });
}

function normalizePolicies(value: unknown): DevOpsNetworkPolicyRecord[] {
  return asArray(value).map((entry, index) => {
    const record = asRecord(entry);
    const status = String(record.status ?? '').toUpperCase();
    return {
      name: text(record.name) ?? `policy-${index + 1}`,
      namespace: text(record.namespace),
      provider: text(record.provider),
      status: status === 'ENFORCED' ? 'ENFORCED' : status === 'RECORDED' ? 'RECORDED' : 'UNKNOWN',
      summary: text(record.summary),
      source: source(record.source),
    };
  });
}

function normalizeObservability(value: unknown): DevOpsObservabilitySnapshot[] {
  return asArray(value).map((entry, index) => {
    const record = asRecord(entry);
    const status = String(record.status ?? '').toUpperCase();
    return {
      id: text(record.id) ?? `observation-${index + 1}`,
      name: text(record.name ?? record.title) ?? `Observation ${index + 1}`,
      provider: text(record.provider ?? record.tool),
      status: status === 'PASS' || status === 'SUCCESS' ? 'PASS' : status === 'WARN' || status === 'WARNING' ? 'WARN' : status === 'FAIL' || status === 'FAILED' ? 'FAIL' : 'UNKNOWN',
      summary: text(record.summary),
      recordedOutput: text(record.recordedOutput ?? record.output),
      source: source(record.source),
    };
  });
}

function normalizeArchitecture(value: unknown): DevOpsArchitectureLayer[] {
  return asArray(value).map((entry, index) => {
    const record = asRecord(entry);
    return {
      tier: text(record.tier ?? record.name) ?? `Layer ${index + 1}`,
      description: text(record.description),
      technologies: strings(record.technologies),
      recordedMetric: text(record.recordedMetric ?? record.slaMetrics),
    };
  });
}

function provenance(manifest: CanonicalLabManifestV1, root: Record<string, unknown>): DevOpsStateProvenance {
  const raw = asRecord(root.provenance);
  const type = String(raw.sourceType ?? '').toUpperCase();
  return {
    sourceType: type === 'NORMALIZED_PROJECT_FIXTURE'
      ? 'NORMALIZED_PROJECT_FIXTURE'
      : Object.keys(root).length > 0
        ? 'CANONICAL_MANIFEST'
        : 'UNKNOWN',
    inputTypes: manifest.inputs.map((input) => input.inputType),
    notes: strings(raw.notes),
  };
}

export class DevOpsLabAdapter {
  toState(manifest: CanonicalLabManifestV1): DevOpsLabState {
    if (manifest.lab.domain !== 'DEVOPS' || manifest.lab.kind !== 'DEVOPS_PIPELINE') {
      throw new ValidationError('Canonical manifest is not a DevOps pipeline lab');
    }
    if (!manifest.project) throw new ValidationError('DevOps Lab must belong to a project');

    const root = asRecord(manifest.normalizedState);
    const repository = normalizeRepository(root.repository ?? {
      branch: root.branch,
      commitSha: root.gitCommitSha,
      source: asArray(root.pipelineStages).length > 0 ? 'RECORDED_PROJECT_FIXTURE' : undefined,
    });
    const pipelines = normalizePipelines(root);
    const terraform = normalizeTerraform(root);
    const kubernetesRoot = asRecord(root.kubernetes);
    const clusters = normalizeClusters(kubernetesRoot.clusters ?? root.clusters);
    const workloads = normalizeWorkloads(kubernetesRoot.workloads ?? root.workloads);
    const gitops = normalizeGitOps(root.gitops ?? root.applications);
    const helm = normalizeHelm(root.helm ?? root.helmReleases);
    const networkPolicies = normalizePolicies(root.networkPolicies ?? root.ciliumPolicies);
    const observability = normalizeObservability(root.observability ?? root.observabilitySnapshots);
    const architecture = normalizeArchitecture(root.architecture ?? root.architectureLayers);

    const warnings: string[] = [];
    if (pipelines.length === 0) warnings.push('No normalized CI/CD pipeline is attached to this Lab.');
    if (!manifest.inputs.some((entry) => entry.inputType === 'CI_PIPELINE')) warnings.push('This DevOps Lab has no CI_PIPELINE input descriptor.');
    if (clusters.length === 0) warnings.push('No Kubernetes cluster snapshot is attached; the UI does not fabricate runtime cluster state.');
    if (observability.length === 0) warnings.push('No observability snapshot is attached; the UI does not fabricate live metrics.');

    return {
      schemaVersion: 'devops.v1',
      lab: {
        id: manifest.lab.id,
        slug: manifest.lab.slug,
        title: manifest.lab.title,
        summary: manifest.lab.summary,
        capabilities: [...manifest.lab.capabilities],
      },
      project: manifest.project,
      inputs: manifest.inputs,
      overview: text(root.overview),
      repository,
      pipelines,
      terraform,
      kubernetes: { clusters, workloads },
      gitops,
      helm,
      networkPolicies,
      observability,
      architecture,
      runbook: manifest.runbook,
      evidence: manifest.evidence,
      scenarios: manifest.scenarios,
      provenance: provenance(manifest, root),
      warnings,
    };
  }

  toSummary(manifest: CanonicalLabManifestV1): DevOpsLabSummary {
    const state = this.toState(manifest);
    return {
      id: state.lab.id,
      slug: state.lab.slug,
      title: state.lab.title,
      summary: state.lab.summary,
      project: state.project,
      capabilities: [...state.lab.capabilities],
      pipelineCount: state.pipelines.length,
      kubernetesClusterCount: state.kubernetes.clusters.length,
      inputTypes: state.inputs.map((input) => input.inputType),
    };
  }
}

export const devOpsLabAdapter = new DevOpsLabAdapter();
