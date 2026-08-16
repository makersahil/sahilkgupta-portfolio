import type {
  NetworkingDeviceState,
  NetworkingLabState,
  NetworkingLinkState,
} from '../../types/networking.js';

export interface NetworkingAdjacencyEdge {
  neighbor: string;
  linkKey: string;
}

export interface OperationalNetworkingTopology {
  deviceByKey: Map<string, NetworkingDeviceState>;
  usableLinks: NetworkingLinkState[];
  adjacency: Map<string, NetworkingAdjacencyEdge[]>;
}

export function networkingInterfaceForLink(
  device: NetworkingDeviceState,
  interfaceName: string | null,
) {
  if (!interfaceName) return null;
  const normalized = interfaceName.trim().toLowerCase();
  return device.interfaces.find((entry) => {
    const current = entry.name.trim().toLowerCase();
    return current === normalized || current.startsWith(`${normalized} `) || current.startsWith(`${normalized}(`);
  }) ?? null;
}

export function buildOperationalNetworkingTopology(
  state: NetworkingLabState,
): OperationalNetworkingTopology {
  const deviceByKey = new Map(state.devices.map((device) => [device.key, device]));
  const usableLinks = state.links.filter((link) => {
    const left = deviceByKey.get(link.sourceDeviceKey);
    const right = deviceByKey.get(link.targetDeviceKey);
    if (!left || !right || left.status === 'DOWN' || right.status === 'DOWN') return false;
    if (link.status === 'DOWN') return false;

    const leftInterface = networkingInterfaceForLink(left, link.sourceInterface);
    const rightInterface = networkingInterfaceForLink(right, link.targetInterface);
    return leftInterface?.status !== 'DOWN' && rightInterface?.status !== 'DOWN';
  });

  const adjacency = new Map<string, NetworkingAdjacencyEdge[]>();
  for (const device of state.devices.filter((entry) => entry.status !== 'DOWN')) {
    adjacency.set(device.key, []);
  }
  for (const link of usableLinks) {
    adjacency.get(link.sourceDeviceKey)?.push({ neighbor: link.targetDeviceKey, linkKey: link.key });
    adjacency.get(link.targetDeviceKey)?.push({ neighbor: link.sourceDeviceKey, linkKey: link.key });
  }
  for (const entries of adjacency.values()) {
    entries.sort((left, right) => left.neighbor.localeCompare(right.neighbor) || left.linkKey.localeCompare(right.linkKey));
  }

  return { deviceByKey, usableLinks, adjacency };
}
