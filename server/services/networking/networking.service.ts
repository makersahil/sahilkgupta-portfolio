import { NotFoundError, ValidationError } from '../../lib/errors.js';
import type { LabRepository } from '../../repositories/contracts/lab.repository.js';
import { LabManifestService } from '../labs/lab-manifest.service.js';
import type {
  CompatibilityTopologyData,
  NetworkingDeviceState,
  NetworkingLabState,
  NetworkingLabSummary,
  NetworkingPathTrace,
} from '../../types/networking.js';
import { NetworkingLabAdapter, networkingLabAdapter } from './networking-lab-adapter.js';

const NETWORK_DOMAIN = 'NETWORKING' as const;
const NETWORK_KIND = 'NETWORK_TOPOLOGY' as const;

function usableLink(status: string): boolean {
  return status !== 'DOWN';
}

function defaultSource(devices: NetworkingDeviceState[]): NetworkingDeviceState | undefined {
  return (
    devices.find((device) => ['workstation', 'endpoint'].includes(device.kind)) ??
    devices.find((device) => device.kind === 'server') ??
    devices[0]
  );
}

function defaultTarget(devices: NetworkingDeviceState[], sourceKey: string): NetworkingDeviceState | undefined {
  return (
    devices.find((device) => device.key !== sourceKey && device.kind === 'server') ??
    devices.find((device) => device.key !== sourceKey && device.kind === 'isp') ??
    devices.find((device) => device.key !== sourceKey)
  );
}

export class NetworkingService {
  private readonly manifests: LabManifestService;

  constructor(
    private readonly labs: LabRepository,
    private readonly adapter: NetworkingLabAdapter = networkingLabAdapter,
  ) {
    this.manifests = new LabManifestService(labs);
  }

  async listPublic(projectSlug?: string): Promise<NetworkingLabSummary[]> {
    const records = await this.labs.findAll({
      projectSlug,
      domain: NETWORK_DOMAIN,
      kind: NETWORK_KIND,
      status: 'READY',
      publishedProjectOnly: true,
    });

    return Promise.all(
      records.map(async (record) => this.adapter.toSummary(await this.manifests.getPublic(record.id))),
    );
  }

  async getPublic(identifier?: string): Promise<NetworkingLabState> {
    const target = identifier ?? await this.defaultPublicIdentifier();
    return this.adapter.toState(await this.manifests.getPublic(target));
  }

  async getDevice(identifier: string, nodeKey: string): Promise<NetworkingDeviceState> {
    const state = await this.getPublic(identifier);
    const device = state.devices.find((entry) => entry.key === nodeKey);
    if (!device) throw new NotFoundError('Networking device not found');
    return device;
  }

  async getCompatibilityTopology(identifier?: string): Promise<CompatibilityTopologyData> {
    const state = await this.getPublic(identifier);
    return {
      nodes: state.devices.map((device) => ({
        id: device.key,
        name: device.label,
        type: device.kind,
        ip: device.managementAddress ?? 'Not recorded',
        vlan: device.interfaces.find((entry) => entry.vlan)?.vlan ?? null,
        status: device.status,
        x: device.position.x,
        y: device.position.y,
        details: device.role ?? device.description ?? 'Persisted networking device',
      })),
      links: state.links.map((link) => ({
        source: link.sourceDeviceKey,
        target: link.targetDeviceKey,
        protocol: link.protocols.join(' / ') || link.label || 'Network link',
        speed: link.speed ?? 'Not recorded',
        active: link.status !== 'DOWN',
      })),
    };
  }

  async tracePath(
    identifier: string | undefined,
    sourceKey?: string,
    targetKey?: string,
    protocol = 'ICMP',
  ): Promise<NetworkingPathTrace> {
    const state = await this.getPublic(identifier);
    if (state.devices.length === 0) throw new ValidationError('This Networking Lab has no topology devices');

    const source = sourceKey
      ? state.devices.find((device) => device.key === sourceKey)
      : defaultSource(state.devices);
    if (!source) throw new ValidationError('Invalid source device', { field: 'sourceDeviceKey' });

    const target = targetKey
      ? state.devices.find((device) => device.key === targetKey)
      : defaultTarget(state.devices, source.key);
    if (!target) throw new ValidationError('Invalid target device', { field: 'targetDeviceKey' });

    if (source.key === target.key) {
      return {
        labId: state.lab.id,
        labSlug: state.lab.slug,
        sourceDeviceKey: source.key,
        targetDeviceKey: target.key,
        protocol,
        status: 'PATH_FOUND',
        hops: [source.key],
        linkKeys: [],
        traversesFirewall: source.kind === 'firewall',
        interpretation: 'TOPOLOGY_REACHABILITY',
        note: 'Source and target are the same persisted Lab device.',
      };
    }

    const adjacency = new Map<string, Array<{ neighbor: string; linkKey: string }>>();
    for (const device of state.devices) adjacency.set(device.key, []);
    for (const link of state.links.filter((entry) => usableLink(entry.status))) {
      adjacency.get(link.sourceDeviceKey)?.push({ neighbor: link.targetDeviceKey, linkKey: link.key });
      adjacency.get(link.targetDeviceKey)?.push({ neighbor: link.sourceDeviceKey, linkKey: link.key });
    }
    for (const neighbors of adjacency.values()) {
      neighbors.sort((a, b) => a.neighbor.localeCompare(b.neighbor) || a.linkKey.localeCompare(b.linkKey));
    }

    const queue = [source.key];
    const previous = new Map<string, { device: string | null; linkKey: string | null }>([
      [source.key, { device: null, linkKey: null }],
    ]);

    while (queue.length > 0 && !previous.has(target.key)) {
      const current = queue.shift()!;
      for (const edge of adjacency.get(current) ?? []) {
        if (previous.has(edge.neighbor)) continue;
        previous.set(edge.neighbor, { device: current, linkKey: edge.linkKey });
        queue.push(edge.neighbor);
      }
    }

    if (!previous.has(target.key)) {
      return {
        labId: state.lab.id,
        labSlug: state.lab.slug,
        sourceDeviceKey: source.key,
        targetDeviceKey: target.key,
        protocol,
        status: 'UNREACHABLE',
        hops: [],
        linkKeys: [],
        traversesFirewall: false,
        interpretation: 'TOPOLOGY_REACHABILITY',
        note: 'No path exists across the currently active persisted Lab links.',
      };
    }

    const hops: string[] = [];
    const linkKeys: string[] = [];
    let cursor: string | null = target.key;
    while (cursor) {
      hops.unshift(cursor);
      const previousEntry = previous.get(cursor);
      if (previousEntry?.linkKey) linkKeys.unshift(previousEntry.linkKey);
      cursor = previousEntry?.device ?? null;
    }

    const deviceByKey = new Map(state.devices.map((device) => [device.key, device]));
    return {
      labId: state.lab.id,
      labSlug: state.lab.slug,
      sourceDeviceKey: source.key,
      targetDeviceKey: target.key,
      protocol,
      status: 'PATH_FOUND',
      hops,
      linkKeys,
      traversesFirewall: hops.some((key) => deviceByKey.get(key)?.kind === 'firewall'),
      interpretation: 'TOPOLOGY_REACHABILITY',
      note: 'Path is calculated deterministically from active persisted Lab links. Protocol policy and failure-state evaluation are added in Phase 3B/7.',
    };
  }

  private async defaultPublicIdentifier(): Promise<string> {
    const records = await this.labs.findAll({
      domain: NETWORK_DOMAIN,
      kind: NETWORK_KIND,
      status: 'READY',
      publishedProjectOnly: true,
    });
    if (!records[0]) throw new NotFoundError('No public Networking Lab is available');
    return records[0].id;
  }
}
