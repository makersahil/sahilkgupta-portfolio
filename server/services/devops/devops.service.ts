import { NotFoundError } from '../../lib/errors.js';
import type { LabRepository } from '../../repositories/contracts/lab.repository.js';
import { LabManifestService } from '../labs/lab-manifest.service.js';
import type { DevOpsLabState, DevOpsLabSummary, DevOpsPipelineState } from '../../types/devops.js';
import { DevOpsLabAdapter, devOpsLabAdapter } from './devops-lab-adapter.js';

const DEVOPS_DOMAIN = 'DEVOPS' as const;
const DEVOPS_KIND = 'DEVOPS_PIPELINE' as const;

export class DevOpsService {
  private readonly manifests: LabManifestService;

  constructor(
    private readonly labs: LabRepository,
    private readonly adapter: DevOpsLabAdapter = devOpsLabAdapter,
  ) {
    this.manifests = new LabManifestService(labs);
  }

  async listPublic(projectSlug?: string): Promise<DevOpsLabSummary[]> {
    const records = await this.labs.findAll({
      projectSlug,
      domain: DEVOPS_DOMAIN,
      kind: DEVOPS_KIND,
      status: 'READY',
      publishedProjectOnly: true,
    });
    return Promise.all(records.map(async (record) => this.adapter.toSummary(await this.manifests.getPublic(record.id))));
  }

  async getPublic(identifier?: string): Promise<DevOpsLabState> {
    const target = identifier ?? await this.defaultPublicIdentifier();
    return this.adapter.toState(await this.manifests.getPublic(target));
  }

  async getPipeline(identifier: string, pipelineId: string): Promise<DevOpsPipelineState> {
    const state = await this.getPublic(identifier);
    const pipeline = state.pipelines.find((entry) => entry.id === pipelineId);
    if (!pipeline) throw new NotFoundError('DevOps pipeline not found');
    return pipeline;
  }

  private async defaultPublicIdentifier(): Promise<string> {
    const records = await this.labs.findAll({
      domain: DEVOPS_DOMAIN,
      kind: DEVOPS_KIND,
      status: 'READY',
      publishedProjectOnly: true,
    });
    if (!records[0]) throw new NotFoundError('No public DevOps Lab is available');
    return records[0].id;
  }
}
