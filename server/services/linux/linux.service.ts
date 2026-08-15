import { NotFoundError } from '../../lib/errors.js';
import type { LabRepository } from '../../repositories/contracts/lab.repository.js';
import { LabManifestService } from '../labs/lab-manifest.service.js';
import type { LinuxHostState, LinuxLabState, LinuxLabSummary } from '../../types/linux.js';
import { LinuxLabAdapter, linuxLabAdapter } from './linux-lab-adapter.js';

const LINUX_DOMAIN = 'LINUX' as const;
const LINUX_KIND = 'LINUX_SYSTEM' as const;

export class LinuxService {
  private readonly manifests: LabManifestService;

  constructor(
    private readonly labs: LabRepository,
    private readonly adapter: LinuxLabAdapter = linuxLabAdapter,
  ) {
    this.manifests = new LabManifestService(labs);
  }

  async listPublic(projectSlug?: string): Promise<LinuxLabSummary[]> {
    const records = await this.labs.findAll({
      projectSlug,
      domain: LINUX_DOMAIN,
      kind: LINUX_KIND,
      status: 'READY',
      publishedProjectOnly: true,
    });
    return Promise.all(records.map(async (record) => this.adapter.toSummary(await this.manifests.getPublic(record.id))));
  }

  async getPublic(identifier?: string): Promise<LinuxLabState> {
    const target = identifier ?? await this.defaultPublicIdentifier();
    return this.adapter.toState(await this.manifests.getPublic(target));
  }

  async getHost(identifier: string, hostKey: string): Promise<LinuxHostState> {
    const state = await this.getPublic(identifier);
    const host = state.hosts.find((entry) => entry.key === hostKey);
    if (!host) throw new NotFoundError('Linux host not found');
    return host;
  }

  private async defaultPublicIdentifier(): Promise<string> {
    const records = await this.labs.findAll({
      domain: LINUX_DOMAIN,
      kind: LINUX_KIND,
      status: 'READY',
      publishedProjectOnly: true,
    });
    if (!records[0]) throw new NotFoundError('No public Linux Lab is available');
    return records[0].id;
  }
}
