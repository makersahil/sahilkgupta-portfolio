import { NotFoundError, ValidationError } from '../../lib/errors.js';
import type { PortfolioOrchestratorRepository } from '../../repositories/contracts/portfolio-orchestrator.repository.js';
import { portfolioOrchestratorRepository } from '../../repositories/prisma/portfolio-orchestrator.repository.js';
import { PrismaCategoryRepository } from '../../repositories/prisma/category.repository.js';
import type {
  NetworkingCompanionManifestV1,
  OrchestratorImportDryRunRequest,
  OrchestratorImportDryRunResult,
  OrchestratorImportResult,
  PortfolioBundleConflictMode,
  PortfolioLabBundleV1,
  PortfolioProjectBundleV1,
} from '../../types/orchestrator.js';
import type { CanonicalLabManifestV1, LabDomain, LabKind } from '../../types/lab-platform.js';
import { devOpsLabAdapter } from '../devops/devops-lab-adapter.js';
import { getLabInputType } from '../labs/lab-input-registry.js';
import { linuxLabAdapter } from '../linux/linux-lab-adapter.js';
import { networkingLabAdapter } from '../networking/networking-lab-adapter.js';
import { applyScenarioActions, verifyScenarioActions, type ScenarioDomainState } from '../scenarios/scenario-mutators.js';

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_DEPTH = 30;
const MAX_NODES = 10_000;
const MAX_ARRAY = 2_000;
const MAX_STRING = 200_000;
const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const SLUG = /^[a-z0-9][a-z0-9-]{1,118}[a-z0-9]$/;
const EVIDENCE_KINDS = new Set(['CONFIGURATION', 'COMMAND_OUTPUT', 'TOPOLOGY', 'RUNBOOK', 'SCREENSHOT', 'ARTIFACT', 'LINK', 'OTHER']);
const categoryRepository = new PrismaCategoryRepository();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneBounded(value: unknown): unknown {
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_BYTES) throw new ValidationError('Import bundle exceeds the 2 MiB service limit');
  let count = 0;
  const inspect = (candidate: unknown, depth: number): void => {
    count += 1;
    if (count > MAX_NODES) throw new ValidationError('Import bundle contains too many values');
    if (depth > MAX_DEPTH) throw new ValidationError('Import bundle nesting is too deep');
    if (typeof candidate === 'string' && candidate.length > MAX_STRING) throw new ValidationError('Import bundle contains an oversized string');
    if (Array.isArray(candidate)) {
      if (candidate.length > MAX_ARRAY) throw new ValidationError('Import bundle contains an oversized array');
      for (const entry of candidate) inspect(entry, depth + 1);
      return;
    }
    if (isRecord(candidate)) {
      for (const [key, entry] of Object.entries(candidate)) {
        if (DANGEROUS_KEYS.has(key)) throw new ValidationError(`Import bundle contains a forbidden property: ${key}`);
        inspect(entry, depth + 1);
      }
    }
  };
  const parsed = JSON.parse(serialized) as unknown;
  inspect(parsed, 0);
  return parsed;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new ValidationError(`${field} is required`);
  return value.trim();
}

function stringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) throw new ValidationError(`${field} must be an array of strings`);
  return [...new Set(value.map((entry) => entry.trim()).filter(Boolean))];
}

function integer(value: unknown, field: string, fallback = 0): number {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) throw new ValidationError(`${field} must be a non-negative integer`);
  return value;
}

function optionalString(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new ValidationError(`${field} must be a string`);
  return value.trim() || null;
}


function optionalHttpUrl(value: unknown, field: string): string | null {
  const normalized = optionalString(value, field);
  if (!normalized) return null;
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('unsupported protocol');
  } catch {
    throw new ValidationError(`${field} must be an http(s) URL`);
  }
  return normalized;
}

function requiredHttpUrl(value: unknown, field: string): string {
  const normalized = optionalHttpUrl(value, field);
  if (!normalized) throw new ValidationError(`${field} is required`);
  return normalized;
}

function bool(value: unknown, field: string, fallback: boolean): boolean {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'boolean') throw new ValidationError(`${field} must be a boolean`);
  return value;
}

function domain(value: unknown): LabDomain {
  if (value === 'NETWORKING' || value === 'LINUX' || value === 'DEVOPS') return value;
  throw new ValidationError('domain must be NETWORKING, LINUX, or DEVOPS');
}

function kind(value: unknown): LabKind {
  if (value === 'NETWORK_TOPOLOGY' || value === 'LINUX_SYSTEM' || value === 'DEVOPS_PIPELINE') return value;
  throw new ValidationError('kind is unsupported');
}

function assertSlug(value: unknown, field: string): string {
  const parsed = requiredString(value, field);
  if (!SLUG.test(parsed)) throw new ValidationError(`${field} must be lowercase kebab-case`);
  return parsed;
}

function parseLabBundle(value: unknown): PortfolioLabBundleV1 {
  if (!isRecord(value) || value.schemaVersion !== 'portfolio.lab-bundle.v1') throw new ValidationError('Unsupported Lab bundle schemaVersion');
  if (!isRecord(value.lab)) throw new ValidationError('lab is required');
  const lab = value.lab;
  const parsedDomain = domain(lab.domain);
  const parsedKind = kind(lab.kind);
  const expectedKind: LabKind = parsedDomain === 'NETWORKING' ? 'NETWORK_TOPOLOGY' : parsedDomain === 'LINUX' ? 'LINUX_SYSTEM' : 'DEVOPS_PIPELINE';
  if (parsedKind !== expectedKind) throw new ValidationError('Lab kind must match Lab domain');
  if (lab.manifestVersion !== undefined && lab.manifestVersion !== '1.0') throw new ValidationError('Only Lab Manifest 1.0 is supported');
  const inputs = Array.isArray(value.inputs) ? value.inputs : [];
  const topology = isRecord(value.topology) ? value.topology : {};
  const nodes = Array.isArray(topology.nodes) ? topology.nodes : [];
  const links = Array.isArray(topology.links) ? topology.links : [];
  const scenarios = Array.isArray(value.scenarios) ? value.scenarios : [];
  const runbook = Array.isArray(value.runbook) ? value.runbook : [];
  const evidence = Array.isArray(value.evidence) ? value.evidence : [];
  const artifacts = Array.isArray(value.artifacts) ? value.artifacts : [];
  return {
    schemaVersion: 'portfolio.lab-bundle.v1',
    exportedAt: optionalString(value.exportedAt, 'exportedAt') ?? undefined,
    lab: {
      slug: assertSlug(lab.slug, 'lab.slug'),
      title: requiredString(lab.title, 'lab.title'),
      summary: optionalString(lab.summary, 'lab.summary'),
      domain: parsedDomain,
      kind: parsedKind,
      isInteractive: bool(lab.isInteractive, 'lab.isInteractive', true),
      manifestVersion: requiredString(lab.manifestVersion ?? '1.0', 'lab.manifestVersion'),
      capabilities: stringArray(lab.capabilities ?? [], 'lab.capabilities'),
      normalizedState: lab.normalizedState ?? null,
      metadata: lab.metadata ?? null,
      sortOrder: integer(lab.sortOrder, 'lab.sortOrder'),
    },
    inputs: inputs.map((entry, index) => {
      if (!isRecord(entry)) throw new ValidationError(`inputs[${index}] must be an object`);
      const sourceKind = requiredString(entry.sourceKind, `inputs[${index}].sourceKind`);
      if (!['INLINE', 'EXTERNAL', 'ARTIFACT_REFERENCE'].includes(sourceKind)) throw new ValidationError(`inputs[${index}].sourceKind is unsupported`);
      const inputType = requiredString(entry.inputType, `inputs[${index}].inputType`).toUpperCase();
      getLabInputType(parsedDomain, inputType);
      const artifactReference = entry.artifactReference === null || entry.artifactReference === undefined ? null : parseArtifactReference(entry.artifactReference, `inputs[${index}].artifactReference`);
      const payload = entry.payload ?? null;
      const externalUrl = sourceKind === 'EXTERNAL'
        ? requiredHttpUrl(entry.externalUrl, `inputs[${index}].externalUrl`)
        : optionalString(entry.externalUrl, `inputs[${index}].externalUrl`);
      if (sourceKind === 'INLINE' && payload === null) throw new ValidationError(`inputs[${index}].payload is required for INLINE inputs`);
      if (sourceKind === 'INLINE' && (externalUrl || artifactReference)) throw new ValidationError(`inputs[${index}] has conflicting INLINE source fields`);
      if (sourceKind === 'EXTERNAL' && (payload !== null || artifactReference)) throw new ValidationError(`inputs[${index}] has conflicting EXTERNAL source fields`);
      if (sourceKind === 'ARTIFACT_REFERENCE' && (!artifactReference || payload !== null || externalUrl)) throw new ValidationError(`inputs[${index}] requires only artifactReference for ARTIFACT_REFERENCE`);
      return {
        inputKey: requiredString(entry.inputKey, `inputs[${index}].inputKey`),
        inputType,
        label: requiredString(entry.label, `inputs[${index}].label`),
        description: optionalString(entry.description, `inputs[${index}].description`),
        sourceKind: sourceKind as PortfolioLabBundleV1['inputs'][number]['sourceKind'],
        schemaVersion: requiredString(entry.schemaVersion ?? '1.0', `inputs[${index}].schemaVersion`),
        payload,
        externalUrl,
        artifactReference,
        isPrimary: bool(entry.isPrimary, `inputs[${index}].isPrimary`, false),
        sortOrder: integer(entry.sortOrder, `inputs[${index}].sortOrder`),
      };
    }),
    topology: {
      nodes: nodes.map((entry, index) => {
        if (!isRecord(entry)) throw new ValidationError(`topology.nodes[${index}] must be an object`);
        return {
          nodeKey: requiredString(entry.nodeKey, `topology.nodes[${index}].nodeKey`),
          label: requiredString(entry.label, `topology.nodes[${index}].label`),
          kind: requiredString(entry.kind, `topology.nodes[${index}].kind`),
          description: optionalString(entry.description, `topology.nodes[${index}].description`),
          position: entry.position ?? null,
          configuration: entry.configuration ?? null,
          metadata: entry.metadata ?? null,
        };
      }),
      links: links.map((entry, index) => {
        if (!isRecord(entry)) throw new ValidationError(`topology.links[${index}] must be an object`);
        return {
          linkKey: requiredString(entry.linkKey, `topology.links[${index}].linkKey`),
          sourceNodeKey: requiredString(entry.sourceNodeKey, `topology.links[${index}].sourceNodeKey`),
          targetNodeKey: requiredString(entry.targetNodeKey, `topology.links[${index}].targetNodeKey`),
          label: optionalString(entry.label, `topology.links[${index}].label`),
          kind: optionalString(entry.kind, `topology.links[${index}].kind`),
          configuration: entry.configuration ?? null,
          metadata: entry.metadata ?? null,
        };
      }),
    },
    scenarios: scenarios.map((entry, index) => {
      if (!isRecord(entry)) throw new ValidationError(`scenarios[${index}] must be an object`);
      return {
        slug: assertSlug(entry.slug, `scenarios[${index}].slug`),
        title: requiredString(entry.title, `scenarios[${index}].title`),
        summary: requiredString(entry.summary, `scenarios[${index}].summary`),
        description: optionalString(entry.description, `scenarios[${index}].description`),
        order: integer(entry.order, `scenarios[${index}].order`),
        isEnabled: bool(entry.isEnabled, `scenarios[${index}].isEnabled`, true),
        baselineState: entry.baselineState ?? null,
        actions: entry.actions ?? null,
        expectedObservations: entry.expectedObservations ?? null,
        verificationCriteria: entry.verificationCriteria ?? null,
      };
    }),
    runbook: runbook.map((entry, index) => {
      if (!isRecord(entry)) throw new ValidationError(`runbook[${index}] must be an object`);
      return {
        order: integer(entry.order, `runbook[${index}].order`, index + 1),
        title: requiredString(entry.title, `runbook[${index}].title`),
        description: optionalString(entry.description, `runbook[${index}].description`),
        command: optionalString(entry.command, `runbook[${index}].command`),
        expectedObservation: optionalString(entry.expectedObservation, `runbook[${index}].expectedObservation`),
      };
    }),
    evidence: evidence.map((entry, index) => {
      if (!isRecord(entry)) throw new ValidationError(`evidence[${index}] must be an object`);
      return {
        kind: (() => {
          const parsed = requiredString(entry.kind, `evidence[${index}].kind`).toUpperCase();
          if (!EVIDENCE_KINDS.has(parsed)) throw new ValidationError(`evidence[${index}].kind is unsupported`);
          return parsed;
        })(),
        title: requiredString(entry.title, `evidence[${index}].title`),
        description: optionalString(entry.description, `evidence[${index}].description`),
        content: entry.content ?? null,
        externalUrl: optionalHttpUrl(entry.externalUrl, `evidence[${index}].externalUrl`),
        artifactReference: entry.artifactReference === null || entry.artifactReference === undefined ? null : parseArtifactReference(entry.artifactReference, `evidence[${index}].artifactReference`),
        isPublic: bool(entry.isPublic, `evidence[${index}].isPublic`, true),
        sortOrder: integer(entry.sortOrder, `evidence[${index}].sortOrder`),
      };
    }),
    artifacts: artifacts.map((entry, index) => parseArtifactReference(entry, `artifacts[${index}]`)),
  };
}

function parseArtifactReference(value: unknown, field: string): PortfolioLabBundleV1['artifacts'][number] {
  if (!isRecord(value)) throw new ValidationError(`${field} must be an object`);
  if (value.referenceOnly !== true) throw new ValidationError(`${field}.referenceOnly must be true`);
  return {
    fileName: requiredString(value.fileName, `${field}.fileName`),
    originalName: optionalString(value.originalName, `${field}.originalName`),
    mimeType: requiredString(value.mimeType, `${field}.mimeType`),
    sizeBytes: value.sizeBytes === undefined || value.sizeBytes === null ? null : integer(value.sizeBytes, `${field}.sizeBytes`),
    storageProvider: optionalString(value.storageProvider, `${field}.storageProvider`),
    publicUrl: optionalHttpUrl(value.publicUrl, `${field}.publicUrl`),
    isPublic: bool(value.isPublic, `${field}.isPublic`, false),
    referenceOnly: true,
  };
}

function parseProjectBundle(value: unknown): PortfolioProjectBundleV1 {
  if (!isRecord(value) || value.schemaVersion !== 'portfolio.project-bundle.v1') throw new ValidationError('Unsupported Project bundle schemaVersion');
  if (!isRecord(value.project)) throw new ValidationError('project is required');
  const project = value.project;
  const labs = Array.isArray(value.labs) ? value.labs.map(parseLabBundle) : [];
  const runbook = Array.isArray(value.runbook) ? value.runbook : [];
  const evidence = Array.isArray(value.evidence) ? value.evidence : [];
  const artifacts = Array.isArray(value.artifacts) ? value.artifacts : [];
  const parsedDomain = domain(project.domain);
  if (labs.some((lab) => lab.lab.domain !== parsedDomain)) throw new ValidationError('Every imported Lab must match the Project domain');
  return {
    schemaVersion: 'portfolio.project-bundle.v1',
    exportedAt: optionalString(value.exportedAt, 'exportedAt') ?? undefined,
    project: {
      slug: assertSlug(project.slug, 'project.slug'),
      title: requiredString(project.title, 'project.title'),
      domain: parsedDomain,
      summary: requiredString(project.summary, 'project.summary'),
      descriptionMarkdown: optionalString(project.descriptionMarkdown, 'project.descriptionMarkdown'),
      mission: optionalString(project.mission, 'project.mission'),
      architectureSummary: optionalString(project.architectureSummary, 'project.architectureSummary'),
      whatIBuilt: optionalString(project.whatIBuilt, 'project.whatIBuilt'),
      lifecycleStatus: ['COMPLETED', 'IN_PROGRESS', 'ARCHIVED', 'PLANNED'].includes(String(project.lifecycleStatus)) ? project.lifecycleStatus as PortfolioProjectBundleV1['project']['lifecycleStatus'] : 'PLANNED',
      formatType: ['CISCO_PKT_LAB', 'RHCSA_MATRIX', 'DEVOPS_PIPELINE', 'STANDARD'].includes(String(project.formatType)) ? project.formatType as PortfolioProjectBundleV1['project']['formatType'] : 'STANDARD',
      featured: bool(project.featured, 'project.featured', false),
      sortOrder: integer(project.sortOrder, 'project.sortOrder'),
      coverImageUrl: optionalHttpUrl(project.coverImageUrl, 'project.coverImageUrl'),
      architectureSvg: optionalString(project.architectureSvg, 'project.architectureSvg'),
      liveUrl: optionalHttpUrl(project.liveUrl, 'project.liveUrl'),
      githubUrl: optionalHttpUrl(project.githubUrl, 'project.githubUrl'),
      packetTracerFile: optionalString(project.packetTracerFile, 'project.packetTracerFile'),
      topologyConfigJson: optionalString(project.topologyConfigJson, 'project.topologyConfigJson'),
      metrics: project.metrics ?? null,
      technologies: stringArray(project.technologies ?? [], 'project.technologies'),
      tags: stringArray(project.tags ?? [], 'project.tags'),
      categorySlug: assertSlug(project.categorySlug, 'project.categorySlug'),
      categoryId: optionalString(project.categoryId, 'project.categoryId') ?? undefined,
    },
    labs,
    runbook: runbook.map((entry, index) => {
      if (!isRecord(entry)) throw new ValidationError(`runbook[${index}] must be an object`);
      const order = integer(entry.order, `runbook[${index}].order`, index + 1);
      if (order < 1) throw new ValidationError(`runbook[${index}].order must be positive`);
      return {
        order,
        title: requiredString(entry.title, `runbook[${index}].title`),
        description: optionalString(entry.description, `runbook[${index}].description`),
        command: optionalString(entry.command, `runbook[${index}].command`),
      };
    }),
    evidence: evidence.map((entry, index) => {
      if (!isRecord(entry)) throw new ValidationError(`evidence[${index}] must be an object`);
      const parsedKind = requiredString(entry.kind, `evidence[${index}].kind`).toUpperCase();
      if (!EVIDENCE_KINDS.has(parsedKind)) throw new ValidationError(`evidence[${index}].kind is unsupported`);
      return {
        kind: parsedKind,
        title: requiredString(entry.title, `evidence[${index}].title`),
        description: optionalString(entry.description, `evidence[${index}].description`),
        content: entry.content ?? null,
        externalUrl: optionalHttpUrl(entry.externalUrl, `evidence[${index}].externalUrl`),
        artifactReference: entry.artifactReference === null || entry.artifactReference === undefined ? null : parseArtifactReference(entry.artifactReference, `evidence[${index}].artifactReference`),
        isPublic: bool(entry.isPublic, `evidence[${index}].isPublic`, true),
        sortOrder: integer(entry.sortOrder, `evidence[${index}].sortOrder`),
      };
    }),
    artifacts: artifacts.map((entry, index) => parseArtifactReference(entry, `artifacts[${index}]`)),
  };
}

function parseNetworkingCompanion(value: unknown): NetworkingCompanionManifestV1 {
  if (!isRecord(value) || value.schemaVersion !== 'networking.companion-manifest.v1') throw new ValidationError('Unsupported Networking companion schemaVersion');
  if (!value.input) throw new ValidationError('Networking companion input is required');
  const labBundle = parseLabBundle({
    schemaVersion: 'portfolio.lab-bundle.v1',
    lab: value.lab,
    inputs: [value.input],
    topology: value.topology,
    scenarios: [],
    runbook: [],
    evidence: [],
    artifacts: [],
  });
  if (labBundle.lab.domain !== 'NETWORKING' || labBundle.lab.kind !== 'NETWORK_TOPOLOGY') throw new ValidationError('Networking companion manifest must describe a NETWORKING topology Lab');
  let packetTracerReference: NetworkingCompanionManifestV1['packetTracerReference'];
  if (value.packetTracerReference !== undefined) {
    if (!isRecord(value.packetTracerReference)) throw new ValidationError('packetTracerReference must be an object');
    if (value.packetTracerReference.referenceOnly !== true) throw new ValidationError('packetTracerReference.referenceOnly must be true');
    packetTracerReference = {
      fileName: requiredString(value.packetTracerReference.fileName, 'packetTracerReference.fileName'),
      sizeBytes: value.packetTracerReference.sizeBytes === undefined || value.packetTracerReference.sizeBytes === null ? null : integer(value.packetTracerReference.sizeBytes, 'packetTracerReference.sizeBytes'),
      sha256: optionalString(value.packetTracerReference.sha256, 'packetTracerReference.sha256'),
      referenceOnly: true,
    };
  }
  return {
    schemaVersion: 'networking.companion-manifest.v1',
    lab: labBundle.lab as NetworkingCompanionManifestV1['lab'],
    input: labBundle.inputs[0],
    topology: labBundle.topology,
    ...(packetTracerReference ? { packetTracerReference } : {}),
  };
}

function syntheticManifest(bundle: PortfolioLabBundleV1): CanonicalLabManifestV1 {
  const now = new Date(0);
  return {
    schemaVersion: '1.0',
    lab: {
      id: 'import-preview-lab',
      slug: bundle.lab.slug,
      title: bundle.lab.title,
      summary: bundle.lab.summary,
      domain: bundle.lab.domain,
      kind: bundle.lab.kind,
      status: 'DRAFT',
      isInteractive: bundle.lab.isInteractive,
      capabilities: bundle.lab.capabilities,
    },
    project: {
      id: 'import-preview-project',
      slug: 'import-preview-project',
      title: 'Import preview',
      domain: bundle.lab.domain,
      status: 'DRAFT',
    },
    inputs: bundle.inputs.map((entry, index) => ({
      id: `input-${index}`,
      inputKey: entry.inputKey,
      inputType: entry.inputType,
      label: entry.label,
      description: entry.description,
      sourceKind: entry.sourceKind,
      schemaVersion: entry.schemaVersion,
      isPrimary: entry.isPrimary,
      sortOrder: entry.sortOrder,
      hasPayload: entry.payload !== null && entry.payload !== undefined,
      externalReference: Boolean(entry.externalUrl),
      artifact: null,
    })),
    normalizedState: bundle.lab.normalizedState,
    topology: {
      nodes: bundle.topology.nodes.map((entry, index) => ({ id: `node-${index}`, labId: 'import-preview-lab', ...entry, createdAt: now, updatedAt: now })),
      links: bundle.topology.links.map((entry, index) => ({ id: `link-${index}`, labId: 'import-preview-lab', ...entry, createdAt: now, updatedAt: now })),
    },
    scenarios: bundle.scenarios.map((entry, index) => ({ id: `scenario-${index}`, labId: 'import-preview-lab', ...entry, createdAt: now, updatedAt: now })),
    runbook: bundle.runbook.map((entry, index) => ({ id: `runbook-${index}`, labId: 'import-preview-lab', ...entry, createdAt: now, updatedAt: now })),
    evidence: bundle.evidence.filter((entry) => entry.isPublic).map((entry, index) => ({ id: `evidence-${index}`, kind: entry.kind as CanonicalLabManifestV1['evidence'][number]['kind'], title: entry.title, description: entry.description, content: entry.content, externalUrl: entry.externalUrl, sortOrder: entry.sortOrder, artifact: null })),
    artifacts: [],
  };
}

function validateLabBehavior(bundle: PortfolioLabBundleV1): void {
  if (bundle.inputs.filter((entry) => entry.isPrimary).length !== 1) throw new ValidationError('Imported Lab must contain exactly one primary input');
  if (bundle.topology.nodes.length > 500 || bundle.topology.links.length > 2000) throw new ValidationError('Imported topology exceeds supported limits');

  const unique = (values: string[], label: string): void => {
    if (new Set(values).size !== values.length) throw new ValidationError(`${label} values must be unique`);
  };
  unique(bundle.inputs.map((entry) => entry.inputKey), 'Lab inputKey');
  unique(bundle.topology.nodes.map((entry) => entry.nodeKey), 'Topology nodeKey');
  unique(bundle.topology.links.map((entry) => entry.linkKey), 'Topology linkKey');
  unique(bundle.scenarios.map((entry) => entry.slug), 'Scenario slug');
  unique(bundle.runbook.map((entry) => String(entry.order)), 'Runbook order');

  const nodeKeys = new Set(bundle.topology.nodes.map((entry) => entry.nodeKey));
  for (const link of bundle.topology.links) {
    if (!nodeKeys.has(link.sourceNodeKey) || !nodeKeys.has(link.targetNodeKey)) throw new ValidationError(`Topology link ${link.linkKey} references a missing endpoint`);
    if (link.sourceNodeKey === link.targetNodeKey) throw new ValidationError(`Topology self-link is not supported: ${link.linkKey}`);
  }
  for (const step of bundle.runbook) {
    if (!Number.isInteger(step.order) || step.order < 1) throw new ValidationError('Runbook order must be a positive integer');
  }

  const manifest = syntheticManifest(bundle);
  let state: ScenarioDomainState;
  if (bundle.lab.domain === 'NETWORKING') state = networkingLabAdapter.toState(manifest);
  else if (bundle.lab.domain === 'LINUX') state = linuxLabAdapter.toState(manifest);
  else state = devOpsLabAdapter.toState(manifest);
  for (const scenario of bundle.scenarios.filter((entry) => entry.isEnabled)) {
    if (!scenario.actions) throw new ValidationError(`Scenario ${scenario.slug} has no actions`);
    const simulated = applyScenarioActions(state, scenario.actions);
    const checks = verifyScenarioActions(simulated, scenario.actions);
    if (checks.length === 0 || checks.some((entry) => !entry.passed)) throw new ValidationError(`Scenario ${scenario.slug} failed deterministic action verification`);
  }
}


function suffix(base: string, index: number): string {
  return index === 1 ? `${base}-imported` : `${base}-imported-${index}`;
}

export class PortfolioBundleService {
  constructor(private readonly repository: PortfolioOrchestratorRepository = portfolioOrchestratorRepository) {}

  async dryRun(request: OrchestratorImportDryRunRequest): Promise<OrchestratorImportDryRunResult> {
    const conflictMode: PortfolioBundleConflictMode = request.conflictMode ?? 'REJECT';
    if (!['REJECT', 'RENAME'].includes(conflictMode)) throw new ValidationError('conflictMode must be REJECT or RENAME');
    const safe = cloneBounded(request.bundle);
    if (!isRecord(safe) || typeof safe.schemaVersion !== 'string') throw new ValidationError('bundle.schemaVersion is required');
    const errors: string[] = [];
    const warnings: string[] = [];
    let proposedProjectSlug: string | null = null;
    let proposedLabSlugs: string[] = [];
    const counts: Record<string, number> = {};
    try {
      if (safe.schemaVersion === 'portfolio.project-bundle.v1') {
        const bundle = parseProjectBundle(safe);
        for (const lab of bundle.labs) validateLabBehavior(lab);
        const category = await categoryRepository.findBySlug(bundle.project.categorySlug);
        if (!category || category.domain !== bundle.project.domain) throw new ValidationError('Imported Project categorySlug must identify a Category with the same domain');
        proposedProjectSlug = await this.resolveProjectSlug(bundle.project.slug, conflictMode);
        proposedLabSlugs = [];
        for (const lab of bundle.labs) proposedLabSlugs.push(await this.resolveLabSlug(lab.lab.slug, conflictMode, proposedLabSlugs));
        counts.projects = 1;
        counts.labs = bundle.labs.length;
        counts.inputs = bundle.labs.reduce((sum, lab) => sum + lab.inputs.length, 0);
        counts.nodes = bundle.labs.reduce((sum, lab) => sum + lab.topology.nodes.length, 0);
        counts.links = bundle.labs.reduce((sum, lab) => sum + lab.topology.links.length, 0);
        counts.scenarios = bundle.labs.reduce((sum, lab) => sum + lab.scenarios.length, 0);
        counts.runbook = bundle.runbook.length + bundle.labs.reduce((sum, lab) => sum + lab.runbook.length, 0);
        counts.evidence = bundle.evidence.length + bundle.labs.reduce((sum, lab) => sum + lab.evidence.length, 0);
        counts.artifacts = bundle.artifacts.length + bundle.labs.reduce((sum, lab) => sum + lab.artifacts.length, 0);
      } else if (safe.schemaVersion === 'portfolio.lab-bundle.v1') {
        if (!request.targetProjectId) throw new ValidationError('targetProjectId is required for a Lab import');
        const bundle = parseLabBundle(safe);
        validateLabBehavior(bundle);
        const project = await this.repository.getProjectAggregate(request.targetProjectId);
        if (!project) throw new NotFoundError('Target Project not found');
        if (project.project.domain !== bundle.lab.domain) throw new ValidationError('Imported Lab domain must match the target Project domain');
        proposedLabSlugs = [await this.resolveLabSlug(bundle.lab.slug, conflictMode)];
        counts.projects = 0;
        counts.labs = 1;
        counts.inputs = bundle.inputs.length;
        counts.nodes = bundle.topology.nodes.length;
        counts.links = bundle.topology.links.length;
        counts.scenarios = bundle.scenarios.length;
      } else if (safe.schemaVersion === 'networking.companion-manifest.v1') {
        if (!request.targetProjectId) throw new ValidationError('targetProjectId is required for a Networking companion import');
        const companion = parseNetworkingCompanion(safe);
        const labBundle: PortfolioLabBundleV1 = { schemaVersion: 'portfolio.lab-bundle.v1', lab: companion.lab, inputs: [companion.input], topology: companion.topology, scenarios: [], runbook: [], evidence: [], artifacts: [] };
        validateLabBehavior(labBundle);
        const project = await this.repository.getProjectAggregate(request.targetProjectId);
        if (!project) throw new NotFoundError('Target Project not found');
        if (project.project.domain !== 'NETWORKING') throw new ValidationError('Networking companion manifest requires a NETWORKING Project');
        proposedLabSlugs = [await this.resolveLabSlug(companion.lab.slug, conflictMode)];
        counts.projects = 0;
        counts.labs = 1;
        counts.inputs = companion.packetTracerReference ? 2 : 1;
        counts.nodes = companion.topology.nodes.length;
        counts.links = companion.topology.links.length;
        counts.scenarios = 0;
        warnings.push('Packet Tracer metadata is reference-only; no .pkt binary is parsed or included.');
      } else {
        throw new ValidationError(`Unsupported bundle schemaVersion: ${safe.schemaVersion}`);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Bundle validation failed');
    }
    return {
      valid: errors.length === 0,
      schemaVersion: safe.schemaVersion === 'portfolio.project-bundle.v1' || safe.schemaVersion === 'portfolio.lab-bundle.v1' || safe.schemaVersion === 'networking.companion-manifest.v1' ? safe.schemaVersion : null,
      conflictMode,
      proposedProjectSlug,
      proposedLabSlugs,
      errors,
      warnings,
      counts,
    };
  }

  async import(request: OrchestratorImportDryRunRequest): Promise<OrchestratorImportResult> {
    const dryRun = await this.dryRun(request);
    if (!dryRun.valid || !dryRun.schemaVersion) throw new ValidationError('Bundle import dry-run failed', { errors: dryRun.errors });
    const safe = cloneBounded(request.bundle);
    if (dryRun.schemaVersion === 'portfolio.project-bundle.v1') {
      const bundle = parseProjectBundle(safe);
      bundle.project.slug = dryRun.proposedProjectSlug!;
      bundle.labs.forEach((lab, index) => { lab.lab.slug = dryRun.proposedLabSlugs[index]; });
      const result = await this.repository.importProjectBundle(bundle);
      return { projectId: result.project.id, labIds: result.labs.map((lab) => lab.id), dryRun };
    }
    if (!request.targetProjectId) throw new ValidationError('targetProjectId is required');
    if (dryRun.schemaVersion === 'portfolio.lab-bundle.v1') {
      const bundle = parseLabBundle(safe);
      bundle.lab.slug = dryRun.proposedLabSlugs[0];
      const result = await this.repository.importLabBundle(request.targetProjectId, bundle);
      return { projectId: request.targetProjectId, labIds: [result.id], dryRun };
    }
    const companion = parseNetworkingCompanion(safe);
    companion.lab.slug = dryRun.proposedLabSlugs[0];
    const result = await this.repository.importNetworkingCompanion(request.targetProjectId, companion);
    return { projectId: request.targetProjectId, labIds: [result.id], dryRun };
  }

  parseProjectBundle(value: unknown): PortfolioProjectBundleV1 {
    return parseProjectBundle(cloneBounded(value));
  }

  parseLabBundle(value: unknown): PortfolioLabBundleV1 {
    return parseLabBundle(cloneBounded(value));
  }

  parseNetworkingCompanion(value: unknown): NetworkingCompanionManifestV1 {
    return parseNetworkingCompanion(cloneBounded(value));
  }

  private async resolveProjectSlug(base: string, mode: PortfolioBundleConflictMode): Promise<string> {
    if (!(await this.repository.findProjectBySlug(base))) return base;
    if (mode === 'REJECT') throw new ValidationError(`Project slug already exists: ${base}`);
    for (let index = 1; index < 10_000; index += 1) {
      const candidate = suffix(base, index);
      if (!(await this.repository.findProjectBySlug(candidate))) return candidate;
    }
    throw new ValidationError('Unable to allocate an imported Project slug');
  }

  private async resolveLabSlug(base: string, mode: PortfolioBundleConflictMode, reserved: string[] = []): Promise<string> {
    if (!reserved.includes(base) && !(await this.repository.findLabBySlug(base))) return base;
    if (mode === 'REJECT') throw new ValidationError(`Lab slug already exists: ${base}`);
    for (let index = 1; index < 10_000; index += 1) {
      const candidate = suffix(base, index);
      if (!reserved.includes(candidate) && !(await this.repository.findLabBySlug(candidate))) return candidate;
    }
    throw new ValidationError('Unable to allocate an imported Lab slug');
  }
}

export const portfolioBundleService = new PortfolioBundleService();
