import { NotFoundError, ValidationError } from '../../lib/errors.js';
import type {
  NetworkingAclAssessment,
  NetworkingDeviceState,
  NetworkingHealthCheck,
  NetworkingHealthStatus,
  NetworkingLabState,
  NetworkingOperationalPathAnalysis,
  NetworkingOperationsSnapshot,
  NetworkingOperatorContext,
  NetworkingPathBlocker,
  NetworkingRouteLookup,
  NetworkingRouteState,
  NetworkingScenarioReadiness,
} from '../../types/networking.js';
import type { NetworkingService } from './networking.service.js';

function ipv4ToNumber(value: string): number | null {
  const parts = value.trim().split('.');
  if (parts.length !== 4) return null;
  let result = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
    result = ((result << 8) | octet) >>> 0;
  }
  return result >>> 0;
}

function routePrefix(value: string): { network: number; prefixLength: number } | null {
  const [address, prefixText] = value.trim().split('/');
  if (!address || prefixText === undefined || !/^\d{1,2}$/.test(prefixText)) return null;
  const prefixLength = Number(prefixText);
  if (prefixLength < 0 || prefixLength > 32) return null;
  const ip = ipv4ToNumber(address);
  if (ip === null) return null;
  const mask = prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;
  return { network: (ip & mask) >>> 0, prefixLength };
}

function routeMatches(route: NetworkingRouteState, destination: number): number | null {
  const parsed = routePrefix(route.network);
  if (!parsed) return null;
  const mask = parsed.prefixLength === 0 ? 0 : (0xffffffff << (32 - parsed.prefixLength)) >>> 0;
  return ((destination & mask) >>> 0) === parsed.network ? parsed.prefixLength : null;
}

function interfaceForLink(device: NetworkingDeviceState, interfaceName: string | null) {
  if (!interfaceName) return null;
  const normalized = interfaceName.trim().toLowerCase();
  return device.interfaces.find((entry) => {
    const current = entry.name.trim().toLowerCase();
    return current === normalized || current.startsWith(`${normalized} `) || current.startsWith(`${normalized}(`);
  }) ?? null;
}

function interfaceNameMatches(left: string | null, right: string | null): boolean {
  if (!left || !right) return false;
  const normalize = (value: string) => value.trim().toLowerCase().replace(/\s*\([^)]*\)\s*$/, '');
  return normalize(left) === normalize(right);
}

function deviceAddress(device: NetworkingDeviceState): string | null {
  if (device.managementAddress && ipv4ToNumber(device.managementAddress) !== null) return device.managementAddress;
  return device.interfaces.find((entry) => entry.address && ipv4ToNumber(entry.address) !== null)?.address ?? null;
}

function trafficProtocol(value: string): { protocol: string; port: number | null } {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'ssh') return { protocol: 'tcp', port: 22 };
  const tcp = normalized.match(/^tcp(?:\/(\d+))?$/);
  if (tcp) return { protocol: 'tcp', port: tcp[1] ? Number(tcp[1]) : null };
  const udp = normalized.match(/^udp(?:\/(\d+))?$/);
  if (udp) return { protocol: 'udp', port: udp[1] ? Number(udp[1]) : null };
  if (normalized === 'icmp') return { protocol: 'icmp', port: null };
  return { protocol: normalized || 'ip', port: null };
}

function splitAclAddress(value: string): { address: string; port: number | null } {
  const match = value.trim().match(/^(.*?)(?:\s+eq\s+(\d+))?$/i);
  return { address: (match?.[1] ?? value).trim(), port: match?.[2] ? Number(match[2]) : null };
}

function aclAddressMatches(spec: string, address: string): boolean {
  const normalized = spec.trim().toLowerCase();
  if (normalized === 'any' || normalized === 'any4') return true;
  const ip = ipv4ToNumber(address);
  if (ip === null) return false;
  const host = normalized.match(/^host\s+(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (host) return ipv4ToNumber(host[1]!) === ip;
  if (normalized.includes('/')) {
    const parsed = routePrefix(normalized);
    if (!parsed) return false;
    const mask = parsed.prefixLength === 0 ? 0 : (0xffffffff << (32 - parsed.prefixLength)) >>> 0;
    return ((ip & mask) >>> 0) === parsed.network;
  }
  return ipv4ToNumber(normalized) === ip;
}

function sideInterface(
  state: NetworkingLabState,
  linkKey: string | undefined,
  deviceKey: string,
): string | null {
  if (!linkKey) return null;
  const link = state.links.find((entry) => entry.key === linkKey);
  if (!link) return null;
  if (link.sourceDeviceKey === deviceKey) return link.sourceInterface;
  if (link.targetDeviceKey === deviceKey) return link.targetInterface;
  return null;
}

function topologyPath(
  state: NetworkingLabState,
  sourceKey: string,
  targetKey: string,
): { hops: string[]; linkKeys: string[] } | null {
  if (sourceKey === targetKey) return { hops: [sourceKey], linkKeys: [] };
  const adjacency = new Map<string, Array<{ neighbor: string; linkKey: string }>>();
  for (const device of state.devices) adjacency.set(device.key, []);
  for (const link of state.links) {
    adjacency.get(link.sourceDeviceKey)?.push({ neighbor: link.targetDeviceKey, linkKey: link.key });
    adjacency.get(link.targetDeviceKey)?.push({ neighbor: link.sourceDeviceKey, linkKey: link.key });
  }
  for (const entries of adjacency.values()) entries.sort((a, b) => a.neighbor.localeCompare(b.neighbor) || a.linkKey.localeCompare(b.linkKey));

  const queue = [sourceKey];
  const previous = new Map<string, { device: string | null; linkKey: string | null }>([[sourceKey, { device: null, linkKey: null }]]);
  while (queue.length > 0 && !previous.has(targetKey)) {
    const current = queue.shift()!;
    for (const edge of adjacency.get(current) ?? []) {
      if (previous.has(edge.neighbor)) continue;
      previous.set(edge.neighbor, { device: current, linkKey: edge.linkKey });
      queue.push(edge.neighbor);
    }
  }
  if (!previous.has(targetKey)) return null;

  const hops: string[] = [];
  const linkKeys: string[] = [];
  let cursor: string | null = targetKey;
  while (cursor) {
    hops.unshift(cursor);
    const entry = previous.get(cursor);
    if (entry?.linkKey) linkKeys.unshift(entry.linkKey);
    cursor = entry?.device ?? null;
  }
  return { hops, linkKeys };
}

function assessAcl(
  state: NetworkingLabState,
  hops: string[],
  linkKeys: string[],
  protocolText: string,
  source: NetworkingDeviceState,
  target: NetworkingDeviceState,
): NetworkingAclAssessment {
  const sourceIp = deviceAddress(source);
  const targetIp = deviceAddress(target);
  const structured = state.aclRules.filter((rule) => rule.deviceKey && hops.includes(rule.deviceKey));
  if (structured.length === 0) {
    return { status: 'NOT_EVALUATED', ruleId: null, ruleName: null, deviceKey: null, reason: 'No path-attached structured ACL rule is available for deterministic assessment.' };
  }
  if (!sourceIp || !targetIp) {
    return { status: 'NOT_EVALUATED', ruleId: null, ruleName: null, deviceKey: null, reason: 'Source or target IPv4 addressing is not recorded, so ACL matching is intentionally not inferred.' };
  }

  const traffic = trafficProtocol(protocolText);
  const rules = [...structured].sort((left, right) => (left.sequence ?? 999999) - (right.sequence ?? 999999) || left.id.localeCompare(right.id));
  for (const rule of rules) {
    const hopIndex = hops.indexOf(rule.deviceKey!);
    const interfaceOnPath = rule.direction === 'OUT'
      ? sideInterface(state, linkKeys[hopIndex], rule.deviceKey!)
      : rule.direction === 'IN'
        ? sideInterface(state, linkKeys[hopIndex - 1], rule.deviceKey!)
        : null;
    if (rule.interface && rule.direction !== 'UNKNOWN' && !interfaceNameMatches(rule.interface, interfaceOnPath)) continue;

    const aclProtocol = rule.protocol.trim().toLowerCase();
    if (aclProtocol !== 'ip' && aclProtocol !== traffic.protocol) continue;
    const sourceSpec = splitAclAddress(rule.source);
    const destinationSpec = splitAclAddress(rule.destination);
    if (!aclAddressMatches(sourceSpec.address, sourceIp)) continue;
    if (!aclAddressMatches(destinationSpec.address, targetIp)) continue;
    const requiredPort = destinationSpec.port ?? sourceSpec.port;
    if (requiredPort !== null && traffic.port !== requiredPort) continue;

    return {
      status: rule.action === 'deny' ? 'DENY' : rule.action === 'permit' ? 'PERMIT' : 'NOT_EVALUATED',
      ruleId: rule.id,
      ruleName: rule.name,
      deviceKey: rule.deviceKey,
      reason: rule.action === 'deny'
        ? `Structured ACL rule ${rule.id} records a deny for this source, destination, and protocol tuple.`
        : rule.action === 'permit'
          ? `Structured ACL rule ${rule.id} records a permit for this source, destination, and protocol tuple.`
          : `Structured ACL rule ${rule.id} has an unknown action.`,
    };
  }

  return {
    status: 'NO_MATCH',
    ruleId: null,
    ruleName: null,
    deviceKey: null,
    reason: 'Structured ACL records exist on this path, but none match this recorded source/destination/protocol tuple. No implicit platform default is assumed.',
  };
}

function scenarioSignals(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const record = value as Record<string, unknown>;
  const explicit = record.observableSignals;
  if (Array.isArray(explicit)) {
    return explicit.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
  }
  return [];
}

function healthRank(status: NetworkingHealthStatus): number {
  switch (status) {
    case 'FAIL': return 3;
    case 'WARN': return 2;
    case 'UNKNOWN': return 1;
    default: return 0;
  }
}

function buildHealthChecks(state: NetworkingLabState): NetworkingHealthCheck[] {
  const checks: NetworkingHealthCheck[] = [];
  const downDevices = state.devices.filter((device) => device.status === 'DOWN');
  checks.push({
    id: 'devices-operational',
    category: 'DEVICE',
    status: downDevices.length ? 'FAIL' : state.devices.length ? 'PASS' : 'UNKNOWN',
    title: 'Device operational state',
    summary: downDevices.length
      ? `${downDevices.length} persisted device record(s) are DOWN.`
      : state.devices.length
        ? 'No persisted device record is marked DOWN.'
        : 'No device state is available.',
    relatedDeviceKeys: downDevices.map((device) => device.key),
    relatedLinkKeys: [],
  });

  const downLinks = state.links.filter((link) => link.status === 'DOWN');
  checks.push({
    id: 'links-operational',
    category: 'LINK',
    status: downLinks.length ? 'FAIL' : state.links.length ? 'PASS' : 'UNKNOWN',
    title: 'Link operational state',
    summary: downLinks.length
      ? `${downLinks.length} persisted topology link(s) are DOWN.`
      : state.links.length
        ? 'All persisted topology links are currently recorded as usable.'
        : 'No link state is available.',
    relatedDeviceKeys: [],
    relatedLinkKeys: downLinks.map((link) => link.key),
  });

  const downInterfaces = state.devices.flatMap((device) =>
    device.interfaces
      .filter((entry) => entry.status === 'DOWN')
      .map((entry) => `${device.key}:${entry.name}`),
  );
  checks.push({
    id: 'interfaces-operational',
    category: 'INTERFACE',
    status: downInterfaces.length ? 'WARN' : state.devices.some((device) => device.interfaces.length) ? 'PASS' : 'UNKNOWN',
    title: 'Interface state',
    summary: downInterfaces.length
      ? `${downInterfaces.length} persisted interface record(s) are DOWN; this may be intentional or operationally significant.`
      : 'No persisted interface is marked DOWN.',
    relatedDeviceKeys: [...new Set(downInterfaces.map((entry) => entry.split(':')[0]!).filter(Boolean))],
    relatedLinkKeys: [],
  });

  for (const neighbor of state.bgpNeighbors) {
    checks.push({
      id: `bgp:${neighbor.id}`,
      category: 'BGP',
      status: neighbor.health === 'UP' ? 'PASS' : neighbor.health === 'UNKNOWN' ? 'UNKNOWN' : 'FAIL',
      title: `BGP ${neighbor.deviceKey} → ${neighbor.peerAddress}`,
      summary: `${neighbor.sessionType} session is recorded as ${neighbor.state}.`,
      relatedDeviceKeys: [neighbor.deviceKey, neighbor.peerDeviceKey].filter((entry): entry is string => Boolean(entry)),
      relatedLinkKeys: [],
    });
  }
  if (state.specifications.protocols.some((entry) => /BGP/i.test(entry)) && state.bgpNeighbors.length === 0) {
    checks.push({
      id: 'bgp-data-coverage', category: 'DATA', status: 'WARN', title: 'BGP neighbor coverage',
      summary: 'BGP is listed for this lab, but no normalized BGP neighbor snapshot is attached.',
      relatedDeviceKeys: [], relatedLinkKeys: [],
    });
  }

  for (const neighbor of state.ospfNeighbors) {
    const upper = neighbor.state.toUpperCase();
    const status: NetworkingHealthStatus = upper.startsWith('FULL') ? 'PASS' : upper === '2WAY' ? 'WARN' : neighbor.health === 'UNKNOWN' ? 'UNKNOWN' : 'FAIL';
    checks.push({
      id: `ospf:${neighbor.id}`,
      category: 'OSPF',
      status,
      title: `OSPF ${neighbor.deviceKey} → ${neighbor.neighborId}`,
      summary: `Area ${neighbor.area} adjacency is recorded as ${neighbor.state} on ${neighbor.interface}.`,
      relatedDeviceKeys: [neighbor.deviceKey, neighbor.peerDeviceKey].filter((entry): entry is string => Boolean(entry)),
      relatedLinkKeys: [],
    });
  }
  if (state.specifications.protocols.some((entry) => /OSPF/i.test(entry)) && state.ospfNeighbors.length === 0) {
    checks.push({
      id: 'ospf-data-coverage', category: 'DATA', status: 'WARN', title: 'OSPF neighbor coverage',
      summary: 'OSPF is listed for this lab, but no normalized OSPF adjacency snapshot is attached.',
      relatedDeviceKeys: [], relatedLinkKeys: [],
    });
  }

  for (const group of state.gatewayRedundancy) {
    const active = group.members.find((member) => member.role === 'ACTIVE');
    const standby = group.members.find((member) => member.role === 'STANDBY');
    const status: NetworkingHealthStatus = !active || active.status === 'DOWN'
      ? 'FAIL'
      : standby && standby.status !== 'DOWN'
        ? 'PASS'
        : 'WARN';
    checks.push({
      id: `gateway:${group.id}`,
      category: 'GATEWAY',
      status,
      title: `${group.protocol} group ${group.group ?? 'unknown'}`,
      summary: active
        ? `Active gateway ${active.deviceKey}${standby ? `; standby ${standby.deviceKey}` : '; no healthy standby is recorded'}.`
        : 'No active gateway member is recorded.',
      relatedDeviceKeys: group.members.map((member) => member.deviceKey),
      relatedLinkKeys: [],
    });
  }

  checks.push({
    id: 'routing-snapshot',
    category: 'ROUTING',
    status: state.routingTable.length ? 'PASS' : 'UNKNOWN',
    title: 'Recorded route table',
    summary: state.routingTable.length
      ? `${state.routingTable.length} normalized route record(s) are available for investigation.`
      : 'No normalized route records are attached to this lab.',
    relatedDeviceKeys: [...new Set(state.routingTable.map((route) => route.deviceKey).filter((entry): entry is string => Boolean(entry)))],
    relatedLinkKeys: [],
  });

  return checks;
}

function overallStatus(checks: NetworkingHealthCheck[]): NetworkingOperationsSnapshot['overallStatus'] {
  if (checks.some((check) => check.status === 'FAIL')) return 'CRITICAL';
  if (checks.some((check) => check.status === 'WARN')) return 'DEGRADED';
  if (checks.some((check) => check.status === 'PASS')) return 'HEALTHY';
  return 'UNKNOWN';
}

export class NetworkingOperationsService {
  constructor(private readonly networking: NetworkingService) {}

  async getOperations(identifier: string): Promise<NetworkingOperationsSnapshot> {
    const state = await this.networking.getPublic(identifier);
    const healthChecks = buildHealthChecks(state);
    const scenarioReadiness: NetworkingScenarioReadiness[] = state.scenarios.map((scenario) => ({
      id: scenario.id,
      slug: scenario.slug,
      title: scenario.title,
      summary: scenario.summary,
      enabled: scenario.isEnabled,
      observableSignals: scenarioSignals(scenario.expectedObservations),
      executionAvailable: false,
    }));
    return {
      schemaVersion: 'networking.operations.v1',
      labId: state.lab.id,
      labSlug: state.lab.slug,
      overallStatus: overallStatus(healthChecks),
      bgpNeighbors: state.bgpNeighbors,
      ospfNeighbors: state.ospfNeighbors,
      gatewayRedundancy: state.gatewayRedundancy,
      healthChecks: healthChecks.sort((left, right) => healthRank(right.status) - healthRank(left.status) || left.id.localeCompare(right.id)),
      scenarioReadiness,
      counts: {
        devices: state.devices.length,
        interfaces: state.devices.reduce((total, device) => total + device.interfaces.length, 0),
        links: state.links.length,
        routes: state.routingTable.length,
        bgpNeighbors: state.bgpNeighbors.length,
        ospfNeighbors: state.ospfNeighbors.length,
        gatewayGroups: state.gatewayRedundancy.length,
      },
      note: 'Health is derived from persisted normalized Lab state. It is not live device telemetry.',
    };
  }

  async lookupRoute(identifier: string, destination: string, deviceKey?: string): Promise<NetworkingRouteLookup> {
    const state = await this.networking.getPublic(identifier);
    const destinationNumber = ipv4ToNumber(destination);
    if (destinationNumber === null) throw new ValidationError('destination must be a valid IPv4 address', { field: 'destination' });
    if (deviceKey && !state.devices.some((device) => device.key === deviceKey)) {
      throw new NotFoundError('Networking device not found');
    }

    const candidates = state.routingTable
      .filter((route) => !deviceKey || route.deviceKey === deviceKey || route.deviceKey === null)
      .flatMap((route) => {
        const prefixLength = routeMatches(route, destinationNumber);
        return prefixLength === null ? [] : [{ route, prefixLength }];
      })
      .sort((left, right) => right.prefixLength - left.prefixLength || (left.route.administrativeDistance ?? 999) - (right.route.administrativeDistance ?? 999));

    const selected = candidates[0] ?? null;
    return {
      labId: state.lab.id,
      labSlug: state.lab.slug,
      destination,
      deviceKey: deviceKey ?? null,
      status: selected ? 'MATCH_FOUND' : 'NO_MATCH',
      matchedRoute: selected?.route ?? null,
      prefixLength: selected?.prefixLength ?? null,
      interpretation: 'RECORDED_ROUTE_TABLE_LONGEST_PREFIX_MATCH',
      note: selected
        ? 'Longest-prefix match is calculated from the persisted normalized route snapshot; it is not a live router lookup.'
        : 'No matching prefix exists in the persisted normalized route snapshot.',
    };
  }

  async analyzePath(
    identifier: string,
    sourceKey: string,
    targetKey: string,
    protocol = 'ICMP',
  ): Promise<NetworkingOperationalPathAnalysis> {
    const state = await this.networking.getPublic(identifier);
    const source = state.devices.find((device) => device.key === sourceKey);
    const target = state.devices.find((device) => device.key === targetKey);
    if (!source) throw new ValidationError('Invalid source device', { field: 'sourceDeviceKey' });
    if (!target) throw new ValidationError('Invalid target device', { field: 'targetDeviceKey' });

    const blockers: NetworkingPathBlocker[] = [];
    if (source.status === 'DOWN') blockers.push({ type: 'DEVICE_DOWN', key: source.key, message: `${source.label} is recorded DOWN.` });
    if (target.status === 'DOWN') blockers.push({ type: 'DEVICE_DOWN', key: target.key, message: `${target.label} is recorded DOWN.` });

    const deviceByKey = new Map(state.devices.map((device) => [device.key, device]));
    const usableLinks = state.links.filter((link) => {
      const left = deviceByKey.get(link.sourceDeviceKey);
      const right = deviceByKey.get(link.targetDeviceKey);
      if (!left || !right || left.status === 'DOWN' || right.status === 'DOWN') return false;
      if (link.status === 'DOWN') return false;
      const leftInterface = interfaceForLink(left, link.sourceInterface);
      const rightInterface = interfaceForLink(right, link.targetInterface);
      return leftInterface?.status !== 'DOWN' && rightInterface?.status !== 'DOWN';
    });

    const adjacency = new Map<string, Array<{ neighbor: string; linkKey: string }>>();
    for (const device of state.devices.filter((entry) => entry.status !== 'DOWN')) adjacency.set(device.key, []);
    for (const link of usableLinks) {
      adjacency.get(link.sourceDeviceKey)?.push({ neighbor: link.targetDeviceKey, linkKey: link.key });
      adjacency.get(link.targetDeviceKey)?.push({ neighbor: link.sourceDeviceKey, linkKey: link.key });
    }
    for (const entries of adjacency.values()) entries.sort((a, b) => a.neighbor.localeCompare(b.neighbor) || a.linkKey.localeCompare(b.linkKey));

    const queue = blockers.length ? [] : [source.key];
    const previous = new Map<string, { device: string | null; linkKey: string | null }>();
    if (queue.length) previous.set(source.key, { device: null, linkKey: null });
    while (queue.length > 0 && !previous.has(target.key)) {
      const current = queue.shift()!;
      for (const edge of adjacency.get(current) ?? []) {
        if (previous.has(edge.neighbor)) continue;
        previous.set(edge.neighbor, { device: current, linkKey: edge.linkKey });
        queue.push(edge.neighbor);
      }
    }

    if (!previous.has(target.key)) {
      const rawTopologyPath = topologyPath(state, source.key, target.key);
      if (rawTopologyPath) {
        for (const linkKey of rawTopologyPath.linkKeys) {
          const link = state.links.find((entry) => entry.key === linkKey);
          if (!link) continue;
          if (link.status === 'DOWN') blockers.push({ type: 'LINK_DOWN', key: link.key, message: `${link.label ?? link.key} is recorded DOWN.` });
          const left = deviceByKey.get(link.sourceDeviceKey);
          const right = deviceByKey.get(link.targetDeviceKey);
          for (const [device, interfaceName] of [[left, link.sourceInterface], [right, link.targetInterface]] as const) {
            if (!device) continue;
            if (device.status === 'DOWN' && !blockers.some((entry) => entry.type === 'DEVICE_DOWN' && entry.key === device.key)) {
              blockers.push({ type: 'DEVICE_DOWN', key: device.key, message: `${device.label} is recorded DOWN.` });
            }
            const linkedInterface = interfaceForLink(device, interfaceName);
            if (linkedInterface?.status === 'DOWN') {
              blockers.push({ type: 'INTERFACE_DOWN', key: `${device.key}:${linkedInterface.name}`, message: `${device.label} ${linkedInterface.name} is recorded DOWN.` });
            }
          }
        }
        return {
          labId: state.lab.id,
          labSlug: state.lab.slug,
          sourceDeviceKey: source.key,
          targetDeviceKey: target.key,
          protocol,
          status: 'BLOCKED',
          hops: rawTopologyPath.hops,
          linkKeys: rawTopologyPath.linkKeys,
          blockers,
          traversesFirewall: rawTopologyPath.hops.some((key) => deviceByKey.get(key)?.kind === 'firewall'),
          routeLookup: null,
          aclAssessment: { status: 'NOT_EVALUATED', ruleId: null, ruleName: null, deviceKey: null, reason: 'Path is already blocked by recorded operational state; ACL evaluation is not required.' },
          interpretation: 'RECORDED_STATE_FORWARDING_ANALYSIS',
          note: 'A persisted topology path exists, but recorded device/link/interface state blocks the operational path. ACL evaluation is not needed until the operational path is usable.',
        };
      }
      return {
        labId: state.lab.id,
        labSlug: state.lab.slug,
        sourceDeviceKey: source.key,
        targetDeviceKey: target.key,
        protocol,
        status: 'UNREACHABLE',
        hops: [],
        linkKeys: [],
        blockers,
        traversesFirewall: false,
        routeLookup: null,
        aclAssessment: { status: 'NOT_EVALUATED', ruleId: null, ruleName: null, deviceKey: null, reason: 'No topology path exists, so ACL evaluation is not applicable.' },
        interpretation: 'RECORDED_STATE_FORWARDING_ANALYSIS',
        note: 'No path exists in the persisted topology. ACL semantics are intentionally not simulated.',
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

    let routeLookup: NetworkingRouteLookup | null = null;
    const targetIp = target.managementAddress ?? target.interfaces.find((entry) => ipv4ToNumber(entry.address ?? '') !== null)?.address ?? null;
    const firstRoutingDevice = hops
      .map((key) => deviceByKey.get(key))
      .find((device) => device?.kind === 'router' || device?.kind === 'multilayer_switch');
    if (targetIp && firstRoutingDevice && state.routingTable.length > 0) {
      routeLookup = await this.lookupRoute(identifier, targetIp, firstRoutingDevice.key);
      const scopedRoutes = state.routingTable.filter((route) => route.deviceKey === firstRoutingDevice.key || route.deviceKey === null);
      if (scopedRoutes.length > 0 && routeLookup.status === 'NO_MATCH') {
        blockers.push({
          type: 'ROUTE_DATA_INCOMPLETE',
          key: firstRoutingDevice.key,
          message: `The recorded route snapshot for ${firstRoutingDevice.label} has no prefix for ${targetIp}.`,
        });
      }
    }

    const traversesFirewall = hops.some((key) => deviceByKey.get(key)?.kind === 'firewall');
    const aclAssessment = assessAcl(state, hops, linkKeys, protocol, source, target);
    const status = aclAssessment.status === 'DENY'
      ? 'BLOCKED'
      : blockers.some((entry) => entry.type !== 'ROUTE_DATA_INCOMPLETE')
        ? 'BLOCKED'
        : blockers.length
          ? 'INDETERMINATE'
          : 'FORWARDABLE';
    return {
      labId: state.lab.id,
      labSlug: state.lab.slug,
      sourceDeviceKey: source.key,
      targetDeviceKey: target.key,
      protocol,
      status,
      hops,
      linkKeys,
      blockers,
      traversesFirewall,
      routeLookup,
      aclAssessment,
      interpretation: 'RECORDED_STATE_FORWARDING_ANALYSIS',
      note: status === 'FORWARDABLE'
        ? `Persisted device, link, and linked-interface state allow this path. Structured ACL assessment: ${aclAssessment.status}. Live convergence is not simulated.`
        : 'The path assessment is limited to persisted normalized operational state; missing route data produces an indeterminate result rather than a fabricated forwarding decision.',
    };
  }

  async getContext(identifier: string, deviceKey?: string): Promise<NetworkingOperatorContext> {
    const state = await this.networking.getPublic(identifier);
    const device = deviceKey ? state.devices.find((entry) => entry.key === deviceKey) : null;
    if (deviceKey && !device) throw new NotFoundError('Networking device not found');

    const inspectors: NetworkingOperatorContext['availableInspectors'] = ['topology', 'health', 'scenarios', 'evidence'];
    if (device) inspectors.push('device', 'interfaces');
    if (state.routingTable.length) inspectors.push('routes');
    if (state.bgpNeighbors.length) inspectors.push('bgp');
    if (state.ospfNeighbors.length) inspectors.push('ospf');
    if (state.gatewayRedundancy.length) inspectors.push('gateway');
    if (state.vlans.length) inspectors.push('vlans');
    if (state.aclRules.length) inspectors.push('acls');

    const contextId = `NETOPS/${device?.key ?? state.lab.slug}`.toUpperCase();
    return {
      contextId,
      prompt: `${contextId}>`,
      scope: device ? 'DEVICE' : 'LAB',
      lab: { id: state.lab.id, slug: state.lab.slug, title: state.lab.title },
      device: device ? { key: device.key, label: device.label, kind: device.kind } : null,
      availableInspectors: [...new Set(inspectors)],
      executionAvailable: false,
      note: 'This durable NETOPS context contract is consumed by the Phase 6 unified recorded-state CLI. The operations API itself does not execute arbitrary device commands.',
    };
  }
}
