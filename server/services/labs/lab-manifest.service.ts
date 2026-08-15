import { NotFoundError } from '../../lib/errors.js';
import type { LabRepository } from '../../repositories/contracts/lab.repository.js';
import type {
  CanonicalLabManifestV1,
  LabAggregate,
  LabArtifactReference,
  LabManifestEvidence,
  LabManifestInputDescriptor,
} from '../../types/lab-platform.js';

function publicArtifact(artifact: LabArtifactReference | null | undefined): LabArtifactReference | null {
  if (!artifact || !artifact.isPublic) return null;
  return { ...artifact };
}

function toManifest(aggregate: LabAggregate): CanonicalLabManifestV1 {
  const publicArtifacts = aggregate.artifacts.filter((artifact) => artifact.isPublic);
  const inputs: LabManifestInputDescriptor[] = aggregate.inputs.map((input) => ({
    id: input.id,
    inputKey: input.inputKey,
    inputType: input.inputType,
    label: input.label,
    description: input.description,
    sourceKind: input.sourceKind,
    schemaVersion: input.schemaVersion,
    isPrimary: input.isPrimary,
    sortOrder: input.sortOrder,
    hasPayload: input.payload !== null && input.payload !== undefined,
    externalReference: Boolean(input.externalUrl),
    artifact: publicArtifact(input.artifact),
  }));

  const evidence: LabManifestEvidence[] = aggregate.evidence
    .filter((entry) => entry.isPublic)
    .map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      title: entry.title,
      description: entry.description,
      content: entry.content,
      externalUrl: entry.externalUrl,
      sortOrder: entry.sortOrder,
      artifact: publicArtifact(entry.artifact),
    }));

  return {
    schemaVersion: '1.0',
    lab: {
      id: aggregate.id,
      slug: aggregate.slug,
      title: aggregate.title,
      summary: aggregate.summary,
      domain: aggregate.domain,
      kind: aggregate.kind,
      status: aggregate.status,
      isInteractive: aggregate.isInteractive,
      capabilities: [...aggregate.capabilities],
    },
    project: aggregate.project,
    inputs,
    normalizedState: aggregate.normalizedState,
    topology: { nodes: aggregate.nodes, links: aggregate.links },
    scenarios: aggregate.scenarios.filter((scenario) => scenario.isEnabled),
    runbook: aggregate.runbookSteps,
    evidence,
    artifacts: publicArtifacts,
  };
}

export class LabManifestService {
  constructor(private readonly labs: LabRepository) {}

  async getPublic(identifier: string): Promise<CanonicalLabManifestV1> {
    const aggregate = await this.findAggregate(identifier);
    if (aggregate.status !== 'READY' || !aggregate.project || aggregate.project.status !== 'PUBLISHED') {
      throw new NotFoundError('Lab manifest not found');
    }
    if (aggregate.manifestVersion !== '1.0') throw new NotFoundError('Lab manifest version is not supported');
    return toManifest(aggregate);
  }

  async preview(identifier: string): Promise<CanonicalLabManifestV1> {
    const aggregate = await this.findAggregate(identifier);
    if (aggregate.manifestVersion !== '1.0') throw new NotFoundError('Lab manifest version is not supported');
    return toManifest(aggregate);
  }

  private async findAggregate(identifier: string): Promise<LabAggregate> {
    const aggregate = await this.labs.findAggregateById(identifier) ?? await this.labs.findAggregateBySlug(identifier);
    if (!aggregate) throw new NotFoundError('Lab not found');
    return aggregate;
  }
}
