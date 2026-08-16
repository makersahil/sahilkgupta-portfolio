import { NotFoundError } from '../../lib/errors.js';
import type { PortfolioOrchestratorRepository } from '../../repositories/contracts/portfolio-orchestrator.repository.js';
import { portfolioOrchestratorRepository } from '../../repositories/prisma/portfolio-orchestrator.repository.js';
import type {
  OrchestratorProjectAggregate,
  OrchestratorValidationFinding,
  OrchestratorValidationReport,
} from '../../types/orchestrator.js';
import type { CanonicalLabManifestV1, LabAggregate, LabDomain, LabKind } from '../../types/lab-platform.js';
import { devOpsLabAdapter } from '../devops/devops-lab-adapter.js';
import { getLabInputType } from '../labs/lab-input-registry.js';
import { labManifestService } from '../labs/index.js';
import { linuxLabAdapter } from '../linux/linux-lab-adapter.js';
import { networkingLabAdapter } from '../networking/networking-lab-adapter.js';
import {
  applyScenarioActions,
  verifyScenarioActions,
  type ScenarioDomainState,
} from '../scenarios/scenario-mutators.js';

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,118}[a-z0-9]$/;
const KIND_BY_DOMAIN: Record<LabDomain, LabKind> = {
  NETWORKING: 'NETWORK_TOPOLOGY',
  LINUX: 'LINUX_SYSTEM',
  DEVOPS: 'DEVOPS_PIPELINE',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function httpUrl(value: string | null | undefined): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function jsonSafe(value: unknown): boolean {
  try {
    JSON.stringify(value);
    return true;
  } catch {
    return false;
  }
}

function domainState(manifest: CanonicalLabManifestV1): ScenarioDomainState {
  if (manifest.lab.domain === 'NETWORKING') return networkingLabAdapter.toState(manifest);
  if (manifest.lab.domain === 'LINUX') return linuxLabAdapter.toState(manifest);
  return devOpsLabAdapter.toState(manifest);
}

interface FindingContext {
  projectId: string;
  labId?: string;
}

export class PortfolioValidationService {
  constructor(private readonly repository: PortfolioOrchestratorRepository = portfolioOrchestratorRepository) {}

  async validateProject(
    projectId: string,
    forPublication = false,
    includedLabIds?: readonly string[],
  ): Promise<OrchestratorValidationReport> {
    const aggregate = await this.repository.getProjectAggregate(projectId);
    if (!aggregate) throw new NotFoundError('Project not found');
    return this.validateAggregate(
      aggregate,
      forPublication,
      includedLabIds ? new Set(includedLabIds) : undefined,
    );
  }

  async validateLab(labId: string, forReady = false): Promise<OrchestratorValidationReport> {
    const lab = await this.repository.getLabAggregate(labId);
    if (!lab?.projectId) throw new NotFoundError('Lab not found');
    const aggregate = await this.repository.getProjectAggregate(lab.projectId);
    if (!aggregate) throw new NotFoundError('Project not found');
    const report = await this.validateAggregate(aggregate, false);
    const findings = report.findings.filter((entry) => !entry.labId || entry.labId === labId);
    if (forReady && lab.status === 'ARCHIVED') {
      findings.push(this.finding('LAB_ARCHIVED_READY_BLOCKED', 'ERROR', 'LAB', 'status', 'An archived Lab must be restored to DRAFT before it can become READY.', { projectId: aggregate.project.id, labId }));
    }
    return this.report(aggregate, findings);
  }

  async validateAggregate(
    aggregate: OrchestratorProjectAggregate,
    forPublication = false,
    includedLabIds?: ReadonlySet<string>,
  ): Promise<OrchestratorValidationReport> {
    const findings: OrchestratorValidationFinding[] = [];
    this.validateProjectFields(aggregate, findings, forPublication, includedLabIds);
    this.validateProjectEvidence(aggregate, findings);
    for (const labEntry of aggregate.labs) {
      if (includedLabIds && !includedLabIds.has(labEntry.id)) continue;
      await this.validateLabAggregate(aggregate, labEntry.aggregate, findings);
    }
    return this.report(aggregate, findings);
  }

  private report(aggregate: OrchestratorProjectAggregate, findings: OrchestratorValidationFinding[]): OrchestratorValidationReport {
    const errors = findings.filter((entry) => entry.severity === 'ERROR').length;
    const warnings = findings.filter((entry) => entry.severity === 'WARNING').length;
    return {
      valid: errors === 0,
      generatedAt: new Date().toISOString(),
      projectId: aggregate.project.id,
      projectRevision: aggregate.project.revision,
      labRevisions: Object.fromEntries(aggregate.labs.map((entry) => [entry.id, entry.revision])),
      errors,
      warnings,
      findings,
    };
  }

  private validateProjectFields(
    aggregate: OrchestratorProjectAggregate,
    findings: OrchestratorValidationFinding[],
    forPublication: boolean,
    includedLabIds?: ReadonlySet<string>,
  ): void {
    const project = aggregate.project;
    const ctx = { projectId: project.id };
    if (!project.title.trim()) findings.push(this.finding('PROJECT_TITLE_REQUIRED', 'ERROR', 'PROJECT', 'title', 'Project title is required.', ctx));
    if (!project.slug.trim() || !SLUG_PATTERN.test(project.slug)) findings.push(this.finding('PROJECT_SLUG_INVALID', 'ERROR', 'PROJECT', 'slug', 'Project slug must be lowercase kebab-case.', ctx));
    if (!project.summary.trim()) findings.push(this.finding('PROJECT_SUMMARY_REQUIRED', 'ERROR', 'PROJECT', 'summary', 'Project summary is required.', ctx));
    if (!project.category) findings.push(this.finding('PROJECT_CATEGORY_REQUIRED', 'ERROR', 'PROJECT', 'categoryId', 'Project must reference an existing Category.', ctx));
    else if (project.category.domain !== project.domain) findings.push(this.finding('PROJECT_CATEGORY_DOMAIN_MISMATCH', 'ERROR', 'PROJECT', 'categoryId', 'Category domain must match Project domain.', ctx));
    if (!httpUrl(project.coverImageUrl)) findings.push(this.finding('PROJECT_COVER_URL_INVALID', 'ERROR', 'PROJECT', 'coverImageUrl', 'Cover image URL must use http(s).', ctx));
    if (!httpUrl(project.liveUrl)) findings.push(this.finding('PROJECT_LIVE_URL_INVALID', 'ERROR', 'PROJECT', 'liveUrl', 'Live URL must use http(s).', ctx));
    if (!httpUrl(project.githubUrl)) findings.push(this.finding('PROJECT_GITHUB_URL_INVALID', 'ERROR', 'PROJECT', 'githubUrl', 'GitHub URL must use http(s).', ctx));
    if (!jsonSafe(project.metrics)) findings.push(this.finding('PROJECT_METRICS_NOT_JSON_SAFE', 'ERROR', 'PROJECT', 'metrics', 'Project metrics are not JSON-safe.', ctx));
    if (forPublication && project.lifecycleStatus !== 'COMPLETED') findings.push(this.finding('PROJECT_LIFECYCLE_NOT_COMPLETED', 'ERROR', 'PROJECT', 'lifecycleStatus', 'Project lifecycle must be COMPLETED before publication.', ctx));
    if (forPublication && project.publicationStatus === 'ARCHIVED') findings.push(this.finding('PROJECT_ARCHIVED_PUBLISH_BLOCKED', 'ERROR', 'PROJECT', 'publicationStatus', 'Archived Project must be restored to DRAFT before publication.', ctx));
    if (!project.coverImageUrl) findings.push(this.finding('PROJECT_COVER_MISSING', 'WARNING', 'PROJECT', 'coverImageUrl', 'No cover image is configured.', ctx));
    if (!project.mission && !project.architectureSummary && !project.whatIBuilt) findings.push(this.finding('PROJECT_STORY_FIELDS_MISSING', 'WARNING', 'PROJECT', 'mission', 'Project story fields are empty.', ctx));
    const consideredLabs = aggregate.labs.filter((entry) =>
      entry.status !== 'ARCHIVED' && (!includedLabIds || includedLabIds.has(entry.id)),
    );
    if (consideredLabs.length === 0) {
      findings.push(this.finding(
        'PROJECT_HAS_NO_ACTIVE_LABS',
        project.formatType === 'STANDARD' && !forPublication ? 'WARNING' : 'ERROR',
        'PROJECT',
        'labs',
        forPublication ? 'At least one selected non-archived Lab is required for publication.' : 'Project has no non-archived Labs.',
        ctx,
      ));
    }
    if (!aggregate.evidence.some((entry) => entry.isPublic) && !consideredLabs.some((entry) => entry.aggregate.evidence.some((evidence) => evidence.isPublic))) {
      findings.push(this.finding('PROJECT_PUBLIC_EVIDENCE_MISSING', 'WARNING', 'EVIDENCE', 'evidence', 'No public evidence is attached to this Project or its selected Labs.', ctx));
    }
  }


  private validateProjectEvidence(
    aggregate: OrchestratorProjectAggregate,
    findings: OrchestratorValidationFinding[],
  ): void {
    const ctx = { projectId: aggregate.project.id };
    for (const evidence of aggregate.evidence.filter((entry) => entry.labId === null)) {
      if (!evidence.title.trim()) findings.push(this.finding('PROJECT_EVIDENCE_TITLE_REQUIRED', 'ERROR', 'EVIDENCE', `evidence.${evidence.id}.title`, 'Project evidence title is required.', { ...ctx, entityId: evidence.id }));
      if (!httpUrl(evidence.externalUrl)) findings.push(this.finding('PROJECT_EVIDENCE_URL_INVALID', 'ERROR', 'EVIDENCE', `evidence.${evidence.id}.externalUrl`, 'Project evidence external URL must use http(s).', { ...ctx, entityId: evidence.id }));
      if (evidence.artifactId && !evidence.artifact) findings.push(this.finding('PROJECT_EVIDENCE_ARTIFACT_MISSING', 'ERROR', 'EVIDENCE', `evidence.${evidence.id}.artifactId`, 'Project evidence references a missing Artifact.', { ...ctx, entityId: evidence.id }));
      if (evidence.isPublic && evidence.artifact && !evidence.artifact.isPublic) findings.push(this.finding('PROJECT_PUBLIC_EVIDENCE_PRIVATE_ARTIFACT', 'ERROR', 'EVIDENCE', `evidence.${evidence.id}.artifactId`, 'Public Project evidence cannot expose a private Artifact.', { ...ctx, entityId: evidence.id }));
      if (!jsonSafe(evidence.content)) findings.push(this.finding('PROJECT_EVIDENCE_CONTENT_NOT_JSON_SAFE', 'ERROR', 'EVIDENCE', `evidence.${evidence.id}.content`, 'Project evidence content is not JSON-safe.', { ...ctx, entityId: evidence.id }));
    }
  }

  private async validateLabAggregate(
    projectAggregate: OrchestratorProjectAggregate,
    lab: LabAggregate,
    findings: OrchestratorValidationFinding[],
  ): Promise<void> {
    const project = projectAggregate.project;
    const ctx = { projectId: project.id, labId: lab.id };
    if (lab.status === 'ARCHIVED') return;
    if (lab.projectId !== project.id) findings.push(this.finding('LAB_PROJECT_MISMATCH', 'ERROR', 'LAB', 'projectId', 'Lab does not belong to the loaded Project.', ctx));
    if (lab.domain !== project.domain) findings.push(this.finding('LAB_DOMAIN_MISMATCH', 'ERROR', 'LAB', 'domain', 'Lab domain must match Project domain.', ctx));
    if (lab.kind !== KIND_BY_DOMAIN[project.domain]) findings.push(this.finding('LAB_KIND_MISMATCH', 'ERROR', 'LAB', 'kind', `Lab kind must be ${KIND_BY_DOMAIN[project.domain]} for ${project.domain}.`, ctx));
    if (!lab.slug.trim() || !SLUG_PATTERN.test(lab.slug)) findings.push(this.finding('LAB_SLUG_INVALID', 'ERROR', 'LAB', 'slug', 'Lab slug must be lowercase kebab-case.', ctx));
    if (!lab.title.trim()) findings.push(this.finding('LAB_TITLE_REQUIRED', 'ERROR', 'LAB', 'title', 'Lab title is required.', ctx));
    if (lab.manifestVersion !== '1.0') findings.push(this.finding('LAB_MANIFEST_VERSION_UNSUPPORTED', 'ERROR', 'LAB', 'manifestVersion', 'Only Lab Manifest 1.0 is supported.', ctx));
    if (!Array.isArray(lab.capabilities) || new Set(lab.capabilities).size !== lab.capabilities.length || lab.capabilities.some((entry) => !entry.trim())) findings.push(this.finding('LAB_CAPABILITIES_INVALID', 'ERROR', 'LAB', 'capabilities', 'Lab capabilities must be unique nonblank strings.', ctx));
    if (lab.normalizedState !== null && lab.normalizedState !== undefined && !isRecord(lab.normalizedState)) findings.push(this.finding('LAB_NORMALIZED_STATE_INVALID', 'ERROR', 'LAB', 'normalizedState', 'Normalized state must be a JSON object when supplied.', ctx));
    if (!jsonSafe(lab.normalizedState) || !jsonSafe(lab.metadata)) findings.push(this.finding('LAB_JSON_NOT_SAFE', 'ERROR', 'LAB', 'normalizedState', 'Lab normalized state or metadata is not JSON-safe.', ctx));
    if (lab.inputs.length > 250) findings.push(this.finding('LAB_INPUT_LIMIT_EXCEEDED', 'ERROR', 'INPUT', 'inputs', 'A Lab may contain at most 250 inputs.', ctx));
    const primaryInputs = lab.inputs.filter((entry) => entry.isPrimary);
    if (primaryInputs.length !== 1) findings.push(this.finding('LAB_PRIMARY_INPUT_REQUIRED', 'ERROR', 'INPUT', 'inputs', 'Exactly one primary input is required before a Lab can become READY.', ctx));
    for (const input of lab.inputs) this.validateInput(lab, input, findings, ctx);
    this.validateTopology(lab, findings, ctx);
    this.validateRunbook(lab, findings, ctx);
    this.validateEvidence(lab, findings, ctx);

    let manifest: CanonicalLabManifestV1 | null = null;
    let state: ScenarioDomainState | null = null;
    try {
      manifest = await labManifestService.preview(lab.id);
      state = domainState(manifest);
    } catch (error) {
      findings.push(this.finding('LAB_DOMAIN_ADAPTER_REJECTED', 'ERROR', 'PUBLIC_PREVIEW', 'manifest', error instanceof Error ? error.message : 'Domain adapter rejected the Lab manifest.', ctx));
    }

    if (manifest && state) {
      const publicInput = manifest.inputs.find((entry) => 'payload' in entry || 'externalUrl' in entry);
      if (publicInput) findings.push(this.finding('PUBLIC_MANIFEST_INPUT_LEAK', 'ERROR', 'PUBLIC_PREVIEW', 'inputs', 'Public-shaped manifest exposes raw input data.', ctx));
      for (const scenario of lab.scenarios.filter((entry) => entry.isEnabled)) {
        try {
          if (!scenario.actions) throw new Error('Scenario actions are required.');
          const simulated = applyScenarioActions(state, scenario.actions);
          const checks = verifyScenarioActions(simulated, scenario.actions);
          if (checks.length === 0) throw new Error('Scenario actions produced no verification checks.');
          if (checks.some((entry) => !entry.passed)) throw new Error('Scenario action verification failed against the mutated clone.');
        } catch (error) {
          findings.push(this.finding('SCENARIO_ACTIONS_INVALID', 'ERROR', 'SCENARIO', `scenarios.${scenario.slug}.actions`, error instanceof Error ? error.message : 'Scenario actions are invalid.', { ...ctx, entityId: scenario.id }));
        }
        if (!jsonSafe(scenario.baselineState) || !jsonSafe(scenario.actions) || !jsonSafe(scenario.expectedObservations) || !jsonSafe(scenario.verificationCriteria)) findings.push(this.finding('SCENARIO_JSON_NOT_SAFE', 'ERROR', 'SCENARIO', `scenarios.${scenario.slug}`, 'Scenario contract contains non-JSON-safe data.', { ...ctx, entityId: scenario.id }));
      }
    }
  }

  private validateInput(
    lab: LabAggregate,
    input: LabAggregate['inputs'][number],
    findings: OrchestratorValidationFinding[],
    ctx: FindingContext,
  ): void {
    try {
      getLabInputType(lab.domain, input.inputType);
    } catch (error) {
      findings.push(this.finding('LAB_INPUT_TYPE_UNSUPPORTED', 'ERROR', 'INPUT', `inputs.${input.inputKey}.inputType`, error instanceof Error ? error.message : 'Unsupported input type.', { ...ctx, entityId: input.id }));
    }
    if (input.sourceKind === 'INLINE') {
      if (input.payload === null || input.payload === undefined) findings.push(this.finding('INLINE_INPUT_PAYLOAD_REQUIRED', 'ERROR', 'INPUT', `inputs.${input.inputKey}.payload`, 'INLINE input requires a payload.', { ...ctx, entityId: input.id }));
      if (!jsonSafe(input.payload)) findings.push(this.finding('INLINE_INPUT_PAYLOAD_NOT_JSON_SAFE', 'ERROR', 'INPUT', `inputs.${input.inputKey}.payload`, 'INLINE input payload must be JSON-safe.', { ...ctx, entityId: input.id }));
      if (input.externalUrl || input.artifactId) findings.push(this.finding('INLINE_INPUT_SOURCE_CONFLICT', 'ERROR', 'INPUT', `inputs.${input.inputKey}`, 'INLINE input cannot also reference an external URL or Artifact.', { ...ctx, entityId: input.id }));
    } else if (input.sourceKind === 'EXTERNAL') {
      if (!input.externalUrl || !httpUrl(input.externalUrl)) findings.push(this.finding('EXTERNAL_INPUT_URL_INVALID', 'ERROR', 'INPUT', `inputs.${input.inputKey}.externalUrl`, 'EXTERNAL input requires an http(s) metadata reference.', { ...ctx, entityId: input.id }));
      if (input.payload !== null && input.payload !== undefined || input.artifactId) findings.push(this.finding('EXTERNAL_INPUT_SOURCE_CONFLICT', 'ERROR', 'INPUT', `inputs.${input.inputKey}`, 'EXTERNAL input cannot also contain payload or Artifact reference.', { ...ctx, entityId: input.id }));
    } else {
      if (!input.artifactId || !input.artifact) findings.push(this.finding('ARTIFACT_INPUT_REFERENCE_REQUIRED', 'ERROR', 'INPUT', `inputs.${input.inputKey}.artifactId`, 'ARTIFACT_REFERENCE input must point to an existing Artifact.', { ...ctx, entityId: input.id }));
      if (input.payload !== null && input.payload !== undefined || input.externalUrl) findings.push(this.finding('ARTIFACT_INPUT_SOURCE_CONFLICT', 'ERROR', 'INPUT', `inputs.${input.inputKey}`, 'ARTIFACT_REFERENCE input cannot also contain payload or an external URL.', { ...ctx, entityId: input.id }));
    }
  }

  private validateTopology(lab: LabAggregate, findings: OrchestratorValidationFinding[], ctx: FindingContext): void {
    if (lab.nodes.length > 500) findings.push(this.finding('TOPOLOGY_NODE_LIMIT_EXCEEDED', 'ERROR', 'TOPOLOGY', 'nodes', 'Topology contains more than 500 nodes.', ctx));
    if (lab.links.length > 2000) findings.push(this.finding('TOPOLOGY_LINK_LIMIT_EXCEEDED', 'ERROR', 'TOPOLOGY', 'links', 'Topology contains more than 2,000 links.', ctx));
    const nodeKeys = new Set<string>();
    for (const node of lab.nodes) {
      if (nodeKeys.has(node.nodeKey)) findings.push(this.finding('TOPOLOGY_NODE_KEY_DUPLICATE', 'ERROR', 'TOPOLOGY', `nodes.${node.nodeKey}`, 'Topology node keys must be unique.', { ...ctx, entityId: node.id }));
      nodeKeys.add(node.nodeKey);
      if (!jsonSafe(node.position) || !jsonSafe(node.configuration) || !jsonSafe(node.metadata)) findings.push(this.finding('TOPOLOGY_NODE_JSON_NOT_SAFE', 'ERROR', 'TOPOLOGY', `nodes.${node.nodeKey}`, 'Topology node data is not JSON-safe.', { ...ctx, entityId: node.id }));
    }
    const linkKeys = new Set<string>();
    for (const link of lab.links) {
      if (linkKeys.has(link.linkKey)) findings.push(this.finding('TOPOLOGY_LINK_KEY_DUPLICATE', 'ERROR', 'TOPOLOGY', `links.${link.linkKey}`, 'Topology link keys must be unique.', { ...ctx, entityId: link.id }));
      linkKeys.add(link.linkKey);
      if (!nodeKeys.has(link.sourceNodeKey) || !nodeKeys.has(link.targetNodeKey)) findings.push(this.finding('TOPOLOGY_LINK_ENDPOINT_MISSING', 'ERROR', 'TOPOLOGY', `links.${link.linkKey}`, 'Topology link references a missing node.', { ...ctx, entityId: link.id }));
      if (link.sourceNodeKey === link.targetNodeKey) findings.push(this.finding('TOPOLOGY_SELF_LINK_UNSUPPORTED', 'ERROR', 'TOPOLOGY', `links.${link.linkKey}`, 'Self-links are not supported.', { ...ctx, entityId: link.id }));
      if (!jsonSafe(link.configuration) || !jsonSafe(link.metadata)) findings.push(this.finding('TOPOLOGY_LINK_JSON_NOT_SAFE', 'ERROR', 'TOPOLOGY', `links.${link.linkKey}`, 'Topology link data is not JSON-safe.', { ...ctx, entityId: link.id }));
    }
  }

  private validateRunbook(lab: LabAggregate, findings: OrchestratorValidationFinding[], ctx: FindingContext): void {
    const orders = new Set<number>();
    for (const step of lab.runbookSteps) {
      if (step.order < 1 || !Number.isInteger(step.order)) findings.push(this.finding('RUNBOOK_ORDER_INVALID', 'ERROR', 'RUNBOOK', `runbook.${step.id}.order`, 'Runbook order must be a positive integer.', { ...ctx, entityId: step.id }));
      if (orders.has(step.order)) findings.push(this.finding('RUNBOOK_ORDER_DUPLICATE', 'ERROR', 'RUNBOOK', `runbook.${step.id}.order`, 'Runbook order values must be unique.', { ...ctx, entityId: step.id }));
      orders.add(step.order);
      if (!step.title.trim()) findings.push(this.finding('RUNBOOK_TITLE_REQUIRED', 'ERROR', 'RUNBOOK', `runbook.${step.id}.title`, 'Runbook title is required.', { ...ctx, entityId: step.id }));
    }
    if (orders.size > 0) {
      const sorted = [...orders].sort((a, b) => a - b);
      if (sorted.some((value, index) => value !== index + 1)) findings.push(this.finding('RUNBOOK_ORDER_GAP', 'WARNING', 'RUNBOOK', 'runbook', 'Runbook ordering contains gaps.', ctx));
    }
  }

  private validateEvidence(lab: LabAggregate, findings: OrchestratorValidationFinding[], ctx: FindingContext): void {
    for (const evidence of lab.evidence) {
      if (!evidence.title.trim()) findings.push(this.finding('EVIDENCE_TITLE_REQUIRED', 'ERROR', 'EVIDENCE', `evidence.${evidence.id}.title`, 'Evidence title is required.', { ...ctx, entityId: evidence.id }));
      if (!httpUrl(evidence.externalUrl)) findings.push(this.finding('EVIDENCE_URL_INVALID', 'ERROR', 'EVIDENCE', `evidence.${evidence.id}.externalUrl`, 'Evidence external URL must use http(s).', { ...ctx, entityId: evidence.id }));
      if (evidence.artifactId && !evidence.artifact) findings.push(this.finding('EVIDENCE_ARTIFACT_MISSING', 'ERROR', 'EVIDENCE', `evidence.${evidence.id}.artifactId`, 'Evidence references a missing Artifact.', { ...ctx, entityId: evidence.id }));
      if (evidence.isPublic && evidence.artifact && !evidence.artifact.isPublic) findings.push(this.finding('PUBLIC_EVIDENCE_PRIVATE_ARTIFACT', 'ERROR', 'EVIDENCE', `evidence.${evidence.id}.artifactId`, 'Public evidence cannot expose a private Artifact.', { ...ctx, entityId: evidence.id }));
      if (!jsonSafe(evidence.content)) findings.push(this.finding('EVIDENCE_CONTENT_NOT_JSON_SAFE', 'ERROR', 'EVIDENCE', `evidence.${evidence.id}.content`, 'Evidence content is not JSON-safe.', { ...ctx, entityId: evidence.id }));
    }
  }

  private finding(
    code: string,
    severity: OrchestratorValidationFinding['severity'],
    scope: OrchestratorValidationFinding['scope'],
    path: string,
    message: string,
    context: FindingContext & { entityId?: string },
  ): OrchestratorValidationFinding {
    return { code, severity, scope, path, message, ...context };
  }
}

export const portfolioValidationService = new PortfolioValidationService();
