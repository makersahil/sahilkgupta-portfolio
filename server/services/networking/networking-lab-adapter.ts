import { ValidationError } from '../../lib/errors.js';
import type { CanonicalLabManifestV1, LabNodeRecord } from '../../types/lab-platform.js';
import type {
  NetworkingAclRuleState,
  NetworkingDeviceKind,
  NetworkingDeviceState,
  NetworkingInterfaceState,
  NetworkingLabState,
  NetworkingLabSummary,
  NetworkingLinkState,
  NetworkingOperationalStatus,
  NetworkingPosition,
  NetworkingRouteState,
  NetworkingStateProvenance,
  NetworkingVerificationRecord,
  NetworkingVlanState,
} from '../../types/networking.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asRecord = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const stringValue = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;
const numberValue = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;
const booleanValue = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;

function stringArray(value: unknown): string[] {
  if (typeof value === 'string') {
    return value
      .split(/[\/,]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return asArray(value)
    .map((entry) => stringValue(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function rootState(normalizedState: unknown): Record<string, unknown> {
  const root = asRecord(normalizedState);
  const networking = asRecord(root.networking);
  if (Object.keys(networking).length > 0) return networking;
  const legacy = asRecord(root.network);
  return Object.keys(legacy).length > 0 ? legacy : root;
}

function normalizeKind(value: unknown): NetworkingDeviceKind {
  const normalized = String(value ?? '').trim().toLowerCase().replaceAll('-', '_').replaceAll(' ', '_');
  switch (normalized) {
    case 'isp':
    case 'carrier':
    case 'provider':
      return 'isp';
    case 'router':
    case 'edge_router':
      return 'router';
    case 'multilayer_switch':
    case 'l3_switch':
    case 'layer3_switch':
      return 'multilayer_switch';
    case 'switch':
    case 'l2_switch':
    case 'layer2_switch':
      return 'switch';
    case 'firewall':
    case 'security_appliance':
      return 'firewall';
    case 'server':
      return 'server';
    case 'workstation':
    case 'pc':
    case 'client':
      return 'workstation';
    case 'endpoint':
    case 'host':
      return 'endpoint';
    default:
      return 'unknown';
  }
}

function normalizeStatus(value: unknown): NetworkingOperationalStatus {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (['UP', 'ONLINE', 'ACTIVE', 'READY', 'ESTABLISHED'].includes(normalized)) return 'UP';
  if (['DOWN', 'OFFLINE', 'FAILED', 'ADMIN_DOWN', 'DISABLED'].includes(normalized)) return 'DOWN';
  if (['STANDBY', 'BACKUP'].includes(normalized)) return 'STANDBY';
  if (['DEGRADED', 'WARNING', 'PARTIAL'].includes(normalized)) return 'DEGRADED';
  return 'UNKNOWN';
}

function deterministicPosition(index: number, count: number): NetworkingPosition {
  const columns = Math.max(1, Math.ceil(Math.sqrt(Math.max(count, 1) * 1.5)));
  const rows = Math.max(1, Math.ceil(Math.max(count, 1) / columns));
  const column = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: Math.round(columns === 1 ? 500 : 100 + (column * 800) / (columns - 1)),
    y: Math.round(rows === 1 ? 280 : 80 + (row * 400) / (rows - 1)),
  };
}

function normalizeCoordinate(value: number, axis: 'x' | 'y', percentage: boolean): number {
  const max = axis === 'x' ? 1000 : 560;
  if (percentage) return Math.round((value / 100) * max);
  return Math.max(0, Math.min(max, Math.round(value)));
}

function position(value: unknown, index: number, count: number): NetworkingPosition {
  const record = asRecord(value);
  const x = numberValue(record.x);
  const y = numberValue(record.y);
  if (x !== null && y !== null) {
    // Admin-created layouts may use percentages, while imported/seeded layouts use
    // the canonical 1000x560 canvas. Treat the pair as percentages only when both
    // coordinates fit the percentage range so values such as {x: 150, y: 70}
    // are not partially rescaled.
    const percentage = x >= 0 && x <= 100 && y >= 0 && y <= 100;
    return {
      x: normalizeCoordinate(x, 'x', percentage),
      y: normalizeCoordinate(y, 'y', percentage),
    };
  }
  return deterministicPosition(index, count);
}

function interfaces(value: unknown): NetworkingInterfaceState[] {
  return asArray(value).flatMap((entry) => {
    const record = asRecord(entry);
    const name = stringValue(record.name);
    if (!name) return [];
    return [{
      name,
      address: stringValue(record.ipAddress) ?? stringValue(record.ip) ?? stringValue(record.address),
      subnet: stringValue(record.subnet) ?? stringValue(record.mask) ?? stringValue(record.cidr),
      status: normalizeStatus(record.status),
      type: stringValue(record.type),
      vlan: stringValue(record.vlan) ?? stringValue(record.vlanId),
      description: stringValue(record.description),
    }];
  });
}

function rawDeviceMap(state: Record<string, unknown>): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  for (const item of asArray(state.devices)) {
    const record = asRecord(item);
    const key = stringValue(record.id) ?? stringValue(record.nodeKey) ?? stringValue(record.key);
    if (key) map.set(key, record);
  }
  return map;
}

function deviceFromNode(
  node: LabNodeRecord,
  raw: Record<string, unknown>,
  index: number,
  count: number,
): NetworkingDeviceState {
  const configurationRoot = asRecord(node.configuration);
  const configuration = Object.keys(asRecord(configurationRoot.device)).length > 0
    ? asRecord(configurationRoot.device)
    : configurationRoot;
  const metadata = asRecord(node.metadata);
  const merged = { ...metadata, ...configuration, ...raw };

  return {
    key: node.nodeKey,
    label: node.label,
    kind: normalizeKind(node.kind || merged.type),
    vendor: stringValue(merged.vendor),
    model: stringValue(merged.model),
    role: stringValue(merged.role),
    managementAddress:
      stringValue(merged.managementIp) ??
      stringValue(merged.mgmtIp) ??
      stringValue(merged.managementAddress) ??
      stringValue(merged.ip),
    status: normalizeStatus(merged.status),
    position: position(node.position, index, count),
    description: node.description ?? stringValue(merged.description),
    interfaces: interfaces(merged.interfaces),
    routingProtocols: stringArray(merged.routingProtocols),
    configurationSnippet:
      stringValue(merged.configurationText) ??
      stringValue(merged.runningConfigSnippet) ??
      stringValue(merged.configurationSnippet) ??
      stringValue(merged.config),
    metadata,
  };
}

function deviceFromRaw(raw: Record<string, unknown>, index: number, count: number): NetworkingDeviceState | null {
  const key = stringValue(raw.id) ?? stringValue(raw.nodeKey) ?? stringValue(raw.key);
  if (!key) return null;
  return {
    key,
    label: stringValue(raw.name) ?? stringValue(raw.label) ?? key,
    kind: normalizeKind(raw.type ?? raw.kind),
    vendor: stringValue(raw.vendor),
    model: stringValue(raw.model),
    role: stringValue(raw.role),
    managementAddress: stringValue(raw.managementIp) ?? stringValue(raw.mgmtIp) ?? stringValue(raw.ip),
    status: normalizeStatus(raw.status),
    position: position(raw.position ?? raw, index, count),
    description: stringValue(raw.description) ?? stringValue(raw.details),
    interfaces: interfaces(raw.interfaces),
    routingProtocols: stringArray(raw.routingProtocols),
    configurationSnippet:
      stringValue(raw.configurationText) ??
      stringValue(raw.runningConfigSnippet) ??
      stringValue(raw.configurationSnippet),
    metadata: asRecord(raw.metadata),
  };
}

function links(manifest: CanonicalLabManifestV1, state: Record<string, unknown>): NetworkingLinkState[] {
  const canonical = manifest.topology.links.map((link) => {
    const configuration = asRecord(link.configuration);
    const metadata = asRecord(link.metadata);
    const active = booleanValue(configuration.active ?? metadata.active);
    return {
      key: link.linkKey,
      sourceDeviceKey: link.sourceNodeKey,
      targetDeviceKey: link.targetNodeKey,
      label: link.label,
      kind: link.kind,
      status: active === false ? 'DOWN' : normalizeStatus(configuration.status ?? metadata.status ?? 'UP'),
      speed: stringValue(configuration.speed) ?? stringValue(metadata.speed),
      protocols: stringArray(configuration.protocols ?? metadata.protocols ?? configuration.protocol ?? metadata.protocol),
      sourceInterface: stringValue(configuration.sourceInterface) ?? stringValue(metadata.sourceInterface),
      targetInterface: stringValue(configuration.targetInterface) ?? stringValue(metadata.targetInterface),
      metadata,
    } satisfies NetworkingLinkState;
  });
  if (canonical.length > 0) return canonical;

  return asArray(state.links).flatMap((entry, index) => {
    const record = asRecord(entry);
    const source = stringValue(record.sourceDeviceKey) ?? stringValue(record.sourceNodeKey) ?? stringValue(record.source);
    const target = stringValue(record.targetDeviceKey) ?? stringValue(record.targetNodeKey) ?? stringValue(record.target);
    if (!source || !target) return [];
    const active = booleanValue(record.active);
    return [{
      key: stringValue(record.key) ?? stringValue(record.linkKey) ?? `${source}-${target}-${index + 1}`,
      sourceDeviceKey: source,
      targetDeviceKey: target,
      label: stringValue(record.label) ?? stringValue(record.protocol),
      kind: stringValue(record.kind),
      status: active === false ? 'DOWN' : normalizeStatus(record.status ?? 'UP'),
      speed: stringValue(record.speed),
      protocols: stringArray(record.protocols ?? record.protocol),
      sourceInterface: stringValue(record.sourceInterface),
      targetInterface: stringValue(record.targetInterface),
      metadata: asRecord(record.metadata),
    }];
  });
}

function routingTable(state: Record<string, unknown>): NetworkingRouteState[] {
  return asArray(state.routingTable ?? state.routes).flatMap((entry) => {
    const record = asRecord(entry);
    const network = stringValue(record.network) ?? stringValue(record.prefix);
    if (!network) return [];
    return [{
      network,
      nextHop: stringValue(record.nextHop) ?? stringValue(record.via) ?? 'Unknown',
      interface: stringValue(record.interfaceName) ?? stringValue(record.interface) ?? stringValue(record.iface) ?? 'Unknown',
      protocol: stringValue(record.protocolCode) ?? stringValue(record.protocol) ?? stringValue(record.code) ?? '?',
      protocolName: stringValue(record.protocolName) ?? stringValue(record.name) ?? 'Unknown',
      administrativeDistance: numberValue(record.ad) ?? numberValue(record.administrativeDistance),
      metric: stringValue(record.metric) ?? (numberValue(record.metric) !== null ? String(record.metric) : null),
      deviceKey: stringValue(record.deviceKey),
    }];
  });
}

function vlans(state: Record<string, unknown>): NetworkingVlanState[] {
  return asArray(state.vlanDatabase ?? state.vlans).flatMap((entry) => {
    const record = asRecord(entry);
    const vlanId = numberValue(record.vlanId ?? record.id);
    if (vlanId === null) return [];
    return [{
      vlanId,
      name: stringValue(record.name) ?? `VLAN ${vlanId}`,
      status: normalizeStatus(record.status),
      ports: stringArray(record.ports),
    }];
  });
}

function aclRules(state: Record<string, unknown>): NetworkingAclRuleState[] {
  return asArray(state.accessControlLists ?? state.aclRules ?? state.acls).flatMap((entry, index) => {
    const record = asRecord(entry);
    const action = String(record.action ?? '').toLowerCase();
    return [{
      id: stringValue(record.id) ?? `acl-${index + 1}`,
      name: stringValue(record.name) ?? 'Unnamed ACL',
      action: action === 'permit' || action === 'deny' ? action : 'unknown',
      protocol: stringValue(record.protocol) ?? 'ip',
      source: stringValue(record.source) ?? 'unknown',
      destination: stringValue(record.destination) ?? 'unknown',
    }];
  });
}

function verificationRecords(
  manifest: CanonicalLabManifestV1,
  state: Record<string, unknown>,
): NetworkingVerificationRecord[] {
  const recorded = asArray(state.verificationChecks ?? state.verificationTasks ?? state.verificationRecords)
    .flatMap((entry, index) => {
      const record = asRecord(entry);
      const title = stringValue(record.task) ?? stringValue(record.title);
      if (!title) return [];
      return [{
        id: stringValue(record.id) ?? `recorded-check-${index + 1}`,
        title,
        command: stringValue(record.testCommand) ?? stringValue(record.command),
        recordedObservation:
          stringValue(record.expectedObservation) ??
          stringValue(record.expectedResult) ??
          stringValue(record.recordedObservation) ??
          stringValue(record.result),
        source: stringValue(record.status) === 'EXPECTED' || record.expectedObservation !== undefined
          ? 'EXPECTED_CHECK' as const
          : 'RECORDED_SNAPSHOT' as const,
        evidenceId: null,
      }];
    });

  const evidence = manifest.evidence
    .filter((entry) => entry.kind === 'COMMAND_OUTPUT' || entry.kind === 'CONFIGURATION')
    .map((entry) => ({
      id: `evidence-${entry.id}`,
      title: entry.title,
      command: null,
      recordedObservation: entry.description,
      source: 'EVIDENCE_RECORD' as const,
      evidenceId: entry.id,
    }));

  return [...recorded, ...evidence];
}

function specifications(state: Record<string, unknown>) {
  const record = asRecord(state.specifications);
  return {
    environment: stringValue(record.environment),
    protocols: stringArray(record.protocols),
    addressing: stringArray(record.addressing),
  };
}

function provenance(state: Record<string, unknown>): NetworkingStateProvenance {
  const record = asRecord(state.provenance);
  const packetTracer = asRecord(record.packetTracerReference);
  const source = stringValue(record.sourceType);
  const sourceType: NetworkingStateProvenance['sourceType'] =
    source === 'CANONICAL_MANIFEST' ||
    source === 'NORMALIZED_PROJECT_FIXTURE' ||
    source === 'LAB_TOPOLOGY_RECORDS'
      ? source
      : 'UNKNOWN';

  const fileName = stringValue(packetTracer.fileName);
  return {
    sourceType,
    packetTracerReference: fileName
      ? {
          fileName,
          sizeBytes: numberValue(packetTracer.sizeBytes),
          recordedAt: stringValue(packetTracer.recordedAt),
          referenceOnly: true,
        }
      : null,
    notes: stringArray(record.notes),
  };
}

export class NetworkingLabAdapter {
  toState(manifest: CanonicalLabManifestV1): NetworkingLabState {
    if (manifest.lab.domain !== 'NETWORKING' || manifest.lab.kind !== 'NETWORK_TOPOLOGY') {
      throw new ValidationError('The selected lab is not a Networking topology lab');
    }
    if (!manifest.project) throw new ValidationError('Networking labs must belong to a published project');

    const state = rootState(manifest.normalizedState);
    const deviceLookup = rawDeviceMap(state);
    const canonicalNodes = manifest.topology.nodes;
    const devices = canonicalNodes.length > 0
      ? canonicalNodes.map((node, index) => deviceFromNode(node, deviceLookup.get(node.nodeKey) ?? {}, index, canonicalNodes.length))
      : asArray(state.devices)
          .map((entry, index, all) => deviceFromRaw(asRecord(entry), index, all.length))
          .filter((entry): entry is NetworkingDeviceState => Boolean(entry));
    const networkLinks = links(manifest, state);
    const deviceKeys = new Set(devices.map((device) => device.key));
    const filteredLinks = networkLinks.filter(
      (link) => deviceKeys.has(link.sourceDeviceKey) && deviceKeys.has(link.targetDeviceKey),
    );

    const warnings: string[] = [];
    if (canonicalNodes.length === 0 && devices.length > 0) {
      warnings.push('Topology nodes were derived from normalized input state; persist LabNode records for authoritative layout control.');
    }
    if (networkLinks.length !== filteredLinks.length) {
      warnings.push('One or more links referenced unknown devices and were omitted from the public topology.');
    }
    if (manifest.inputs.some((input) => input.inputType === 'PACKET_TRACER')) {
      warnings.push('Packet Tracer is represented as a reference input; arbitrary .pkt binary parsing is not performed.');
    }

    return {
      schemaVersion: 'networking.v1',
      lab: {
        id: manifest.lab.id,
        slug: manifest.lab.slug,
        title: manifest.lab.title,
        summary: manifest.lab.summary,
        capabilities: [...manifest.lab.capabilities],
      },
      project: manifest.project,
      inputs: manifest.inputs,
      overview: stringValue(state.overview) ?? stringValue(state.overviewSummary),
      devices,
      links: filteredLinks,
      routingTable: routingTable(state),
      vlans: vlans(state),
      aclRules: aclRules(state),
      verificationRecords: verificationRecords(manifest, state),
      specifications: specifications(state),
      provenance: provenance(state),
      runbook: manifest.runbook,
      evidence: manifest.evidence,
      warnings,
    };
  }

  toSummary(manifest: CanonicalLabManifestV1): NetworkingLabSummary {
    const state = this.toState(manifest);
    return {
      id: state.lab.id,
      slug: state.lab.slug,
      title: state.lab.title,
      summary: state.lab.summary,
      project: state.project,
      capabilities: state.lab.capabilities,
      deviceCount: state.devices.length,
      linkCount: state.links.length,
      inputTypes: [...new Set(state.inputs.map((input) => input.inputType))],
    };
  }
}

export const networkingLabAdapter = new NetworkingLabAdapter();
