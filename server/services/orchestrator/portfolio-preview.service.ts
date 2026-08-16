import { NotFoundError } from '../../lib/errors.js';
import type { PortfolioOrchestratorRepository } from '../../repositories/contracts/portfolio-orchestrator.repository.js';
import { portfolioOrchestratorRepository } from '../../repositories/prisma/portfolio-orchestrator.repository.js';
import { PrismaProjectRepository } from '../../repositories/prisma/project.repository.js';
import type {
  OrchestratorProjectPreview,
  OrchestratorProjectPreviewLab,
} from '../../types/orchestrator.js';
import type { CanonicalLabManifestV1, LabDomain } from '../../types/lab-platform.js';
import type { DevOpsLabState } from '../../types/devops.js';
import type { LinuxLabState } from '../../types/linux.js';
import type { NetworkingLabState } from '../../types/networking.js';
import { devOpsLabAdapter } from '../devops/devops-lab-adapter.js';
import { labManifestService } from '../labs/index.js';
import { linuxLabAdapter } from '../linux/linux-lab-adapter.js';
import { networkingLabAdapter } from '../networking/networking-lab-adapter.js';
import { PortfolioValidationService, portfolioValidationService } from './portfolio-validation.service.js';

function segment(value: string): string {
  return value.trim().replace(/[^A-Za-z0-9_.:-]+/g, '-').replace(/^-+|-+$/g, '').toUpperCase();
}

function stateFor(manifest: CanonicalLabManifestV1): NetworkingLabState | LinuxLabState | DevOpsLabState {
  if (manifest.lab.domain === 'NETWORKING') return networkingLabAdapter.toState(manifest);
  if (manifest.lab.domain === 'LINUX') return linuxLabAdapter.toState(manifest);
  return devOpsLabAdapter.toState(manifest);
}

function contexts(
  domain: LabDomain,
  manifest: CanonicalLabManifestV1,
  state: NetworkingLabState | LinuxLabState | DevOpsLabState,
): OrchestratorProjectPreviewLab['cliContexts'] {
  if (domain === 'NETWORKING') {
    const networking = state as NetworkingLabState;
    if (networking.devices.length === 0) {
      const contextId = `NETOPS/${segment(manifest.lab.slug)}`;
      return [{ contextId, prompt: `${contextId}>`, domain }];
    }
    return networking.devices.map((device) => {
      const contextId = `NETOPS/${segment(manifest.lab.slug)}/${segment(device.key)}`;
      return { contextId, prompt: `${contextId}>`, domain };
    });
  }
  if (domain === 'LINUX') {
    const linux = state as LinuxLabState;
    if (linux.hosts.length === 0) {
      const contextId = `RHEL/${segment(manifest.lab.slug)}`;
      return [{ contextId, prompt: `${contextId}>`, domain }];
    }
    return linux.hosts.map((host) => {
      const contextId = `RHEL/${segment(manifest.lab.slug)}/${segment(host.key)}`;
      return { contextId, prompt: `${contextId}>`, domain };
    });
  }
  const devops = state as DevOpsLabState;
  if (devops.pipelines.length === 0) {
    const contextId = `GITOPS/${segment(manifest.lab.slug)}`;
    return [{ contextId, prompt: `${contextId}>`, domain }];
  }
  return devops.pipelines.map((pipeline) => {
    const contextId = `GITOPS/${segment(manifest.lab.slug)}/${segment(pipeline.id)}`;
    return { contextId, prompt: `${contextId}>`, domain };
  });
}

function warnings(state: NetworkingLabState | LinuxLabState | DevOpsLabState): string[] {
  const candidate = (state as { warnings?: unknown }).warnings;
  return Array.isArray(candidate) ? candidate.filter((entry): entry is string => typeof entry === 'string') : [];
}

export class PortfolioPreviewService {
  private readonly projects = new PrismaProjectRepository();

  constructor(
    private readonly repository: PortfolioOrchestratorRepository = portfolioOrchestratorRepository,
    private readonly validation: PortfolioValidationService = portfolioValidationService,
  ) {}

  async previewProject(projectId: string): Promise<OrchestratorProjectPreview> {
    const aggregate = await this.repository.getProjectAggregate(projectId);
    if (!aggregate) throw new NotFoundError('Project not found');
    const publicProject = await this.projects.findById(projectId);
    if (!publicProject) throw new NotFoundError('Project not found');
    const validation = await this.validation.validateAggregate(aggregate, true);
    const labs: OrchestratorProjectPreviewLab[] = [];
    for (const entry of aggregate.labs.filter((lab) => lab.status !== 'ARCHIVED')) {
      const manifest = await labManifestService.preview(entry.id);
      const domainState = stateFor(manifest);
      labs.push({
        lab: entry,
        labRevision: entry.revision,
        manifest,
        domainState,
        scenarioSummary: manifest.scenarios.map((scenario) => ({
          id: scenario.id,
          slug: scenario.slug,
          title: scenario.title,
          enabled: scenario.isEnabled,
        })),
        cliContexts: contexts(entry.domain, manifest, domainState),
        warnings: warnings(domainState),
      });
    }
    return {
      project: publicProject,
      projectPublicationStatus: aggregate.project.publicationStatus,
      projectRevision: aggregate.project.revision,
      validation,
      labs,
    };
  }

  async previewLab(labId: string): Promise<OrchestratorProjectPreviewLab> {
    const lab = await this.repository.getLabAggregate(labId);
    if (!lab) throw new NotFoundError('Lab not found');
    const manifest = await labManifestService.preview(labId);
    const state = stateFor(manifest);
    const record = await this.repository.findLabBySlug(lab.slug);
    if (!record) throw new NotFoundError('Lab not found');
    return {
      lab: record,
      labRevision: record.revision,
      manifest,
      domainState: state,
      scenarioSummary: manifest.scenarios.map((scenario) => ({ id: scenario.id, slug: scenario.slug, title: scenario.title, enabled: scenario.isEnabled })),
      cliContexts: contexts(record.domain, manifest, state),
      warnings: warnings(state),
    };
  }
}

export const portfolioPreviewService = new PortfolioPreviewService();
