import { ValidationError } from '../../lib/errors.js';
import type { CanonicalLabManifestV1, LabNodeRecord } from '../../types/lab-platform.js';
import type {
  LinuxBlockDeviceRecord,
  LinuxConfigRecord,
  LinuxFstabEntry,
  LinuxHostState,
  LinuxHostStatus,
  LinuxLabState,
  LinuxLabSummary,
  LinuxLogicalVolumeRecord,
  LinuxLogRecord,
  LinuxMountRecord,
  LinuxMountState,
  LinuxNetworkInterfaceRecord,
  LinuxObservationSource,
  LinuxRouteRecord,
  LinuxSelinuxState,
  LinuxServiceRecord,
  LinuxServiceState,
  LinuxStateProvenance,
  LinuxVerificationRecord,
  LinuxVolumeGroupRecord,
} from '../../types/linux.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asRecord = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;
const numberValue = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;
const booleanValue = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;

function strings(value: unknown): string[] {
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return asArray(value)
    .map((entry) => text(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function rootState(value: unknown): Record<string, unknown> {
  const root = asRecord(value);
  const linux = asRecord(root.linux);
  if (Object.keys(linux).length > 0) return linux;
  const system = asRecord(root.system);
  if (Object.keys(system).length > 0) return system;
  return root;
}

function source(value: unknown, fallback: LinuxObservationSource = 'NORMALIZED_INPUT'): LinuxObservationSource {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'RECORDED_SNAPSHOT') return 'RECORDED_SNAPSHOT';
  if (normalized === 'EXPECTED_CHECK') return 'EXPECTED_CHECK';
  if (normalized === 'NORMALIZED_INPUT') return 'NORMALIZED_INPUT';
  return fallback;
}

function hostStatus(value: unknown): LinuxHostStatus {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (['UP', 'ONLINE', 'ACTIVE', 'READY', 'RUNNING'].includes(normalized)) return 'UP';
  if (['DOWN', 'OFFLINE', 'FAILED', 'STOPPED'].includes(normalized)) return 'DOWN';
  if (['DEGRADED', 'WARNING', 'PARTIAL'].includes(normalized)) return 'DEGRADED';
  return 'UNKNOWN';
}

function serviceState(value: unknown): LinuxServiceState {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (['ACTIVE', 'RUNNING', 'UP'].includes(normalized)) return 'ACTIVE';
  if (['INACTIVE', 'STOPPED', 'DOWN'].includes(normalized)) return 'INACTIVE';
  if (['FAILED', 'ERROR'].includes(normalized)) return 'FAILED';
  return 'UNKNOWN';
}

function mountState(value: unknown): LinuxMountState {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (['MOUNTED', 'ACTIVE', 'UP', 'READY'].includes(normalized)) return 'MOUNTED';
  if (['UNMOUNTED', 'INACTIVE', 'DOWN'].includes(normalized)) return 'UNMOUNTED';
  if (['DEGRADED', 'WARNING', 'PARTIAL'].includes(normalized)) return 'DEGRADED';
  return 'UNKNOWN';
}

function normalizeSelinuxMode(value: unknown): LinuxSelinuxState['mode'] {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'ENFORCING') return 'ENFORCING';
  if (normalized === 'PERMISSIVE') return 'PERMISSIVE';
  if (normalized === 'DISABLED') return 'DISABLED';
  return 'UNKNOWN';
}

function normalizeServices(value: unknown): LinuxServiceRecord[] {
  return asArray(value).map((entry, index) => {
    const record = asRecord(entry);
    return {
      unit: text(record.unit) ?? text(record.name) ?? `service-${index + 1}`,
      description: text(record.description),
      loadState: text(record.loadState),
      activeState: serviceState(record.activeState ?? record.status ?? record.state),
      subState: text(record.subState),
      enabled: booleanValue(record.enabled),
      restartPolicy: text(record.restartPolicy),
      user: text(record.user),
      configurationSnippet: text(record.configurationSnippet ?? record.configuration ?? record.unitFile),
      source: source(record.source),
    };
  });
}

function normalizeBlockDevices(value: unknown): LinuxBlockDeviceRecord[] {
  return asArray(value).map((entry, index) => {
    const record = asRecord(entry);
    return {
      name: text(record.name) ?? `device-${index + 1}`,
      type: text(record.type) ?? 'block',
      size: text(record.size),
      filesystem: text(record.filesystem ?? record.fsType),
      mountPoint: text(record.mountPoint ?? record.mountpoint),
      parent: text(record.parent),
      state: mountState(record.state ?? (record.mountPoint ? 'MOUNTED' : 'UNKNOWN')),
    };
  });
}

function normalizeVolumeGroups(value: unknown): LinuxVolumeGroupRecord[] {
  return asArray(value).map((entry, index) => {
    const record = asRecord(entry);
    return {
      name: text(record.name) ?? `vg-${index + 1}`,
      size: text(record.size),
      free: text(record.free),
      physicalVolumes: strings(record.physicalVolumes ?? record.pvs),
    };
  });
}

function normalizeLogicalVolumes(value: unknown): LinuxLogicalVolumeRecord[] {
  return asArray(value).map((entry, index) => {
    const record = asRecord(entry);
    return {
      name: text(record.name) ?? `lv-${index + 1}`,
      volumeGroup: text(record.volumeGroup ?? record.vg) ?? 'unknown',
      size: text(record.size),
      layout: text(record.layout ?? record.type),
      filesystem: text(record.filesystem ?? record.fsType),
      mountPoint: text(record.mountPoint ?? record.mountpoint),
      state: mountState(record.state ?? (record.mountPoint ? 'MOUNTED' : 'UNKNOWN')),
    };
  });
}

function normalizeMounts(value: unknown): LinuxMountRecord[] {
  return asArray(value).map((entry) => {
    const record = asRecord(entry);
    return {
      source: text(record.source) ?? 'unknown',
      target: text(record.target ?? record.mountPoint) ?? 'unknown',
      filesystem: text(record.filesystem ?? record.fsType) ?? 'unknown',
      options: strings(record.options),
      state: mountState(record.state ?? 'UNKNOWN'),
    };
  });
}

function normalizeFstab(value: unknown): LinuxFstabEntry[] {
  return asArray(value).map((entry) => {
    const record = asRecord(entry);
    return {
      source: text(record.source) ?? 'unknown',
      target: text(record.target ?? record.mountPoint) ?? 'unknown',
      filesystem: text(record.filesystem ?? record.fsType) ?? 'unknown',
      options: strings(record.options),
      dump: numberValue(record.dump),
      pass: numberValue(record.pass),
    };
  });
}

function normalizeSelinux(value: unknown): LinuxSelinuxState {
  const record = asRecord(value);
  const mode = normalizeSelinuxMode(record.mode ?? record.currentMode);
  return {
    status: mode === 'DISABLED' ? 'DISABLED' : mode === 'UNKNOWN' ? 'UNKNOWN' : 'ENABLED',
    mode,
    configuredMode: normalizeSelinuxMode(record.configuredMode ?? record.configMode ?? record.mode),
    policy: text(record.policy ?? record.policyType),
    booleans: asArray(record.booleans).map((entry) => {
      const item = asRecord(entry);
      return { name: text(item.name) ?? 'unknown', enabled: Boolean(item.enabled) };
    }),
    ports: asArray(record.ports).map((entry) => {
      const item = asRecord(entry);
      return {
        type: text(item.type) ?? 'unknown',
        protocol: text(item.protocol) ?? 'tcp',
        ports: text(item.ports ?? item.port) ?? 'unknown',
      };
    }),
    contexts: asArray(record.contexts).map((entry) => {
      const item = asRecord(entry);
      return {
        path: text(item.path) ?? 'unknown',
        context: text(item.context) ?? 'unknown',
        source: source(item.source),
      };
    }),
    source: source(record.source),
  };
}

function normalizeInterfaces(value: unknown): LinuxNetworkInterfaceRecord[] {
  return asArray(value).map((entry, index) => {
    const record = asRecord(entry);
    const state = String(record.state ?? record.status ?? '').trim().toUpperCase();
    return {
      name: text(record.name) ?? `interface-${index + 1}`,
      type: text(record.type),
      state: state === 'UP' || state === 'CONNECTED' ? 'UP' : state === 'DOWN' || state === 'DISCONNECTED' ? 'DOWN' : 'UNKNOWN',
      addresses: strings(record.addresses ?? record.address),
      gateway: text(record.gateway),
      dns: strings(record.dns),
      connection: text(record.connection),
      mtu: numberValue(record.mtu),
    };
  });
}

function normalizeRoutes(value: unknown): LinuxRouteRecord[] {
  return asArray(value).map((entry) => {
    const record = asRecord(entry);
    return {
      destination: text(record.destination ?? record.network) ?? 'unknown',
      gateway: text(record.gateway ?? record.nextHop),
      interface: text(record.interface ?? record.device),
      metric: numberValue(record.metric),
      protocol: text(record.protocol),
    };
  });
}

function normalizeLogs(value: unknown): LinuxLogRecord[] {
  return asArray(value).map<LinuxLogRecord>((entry, index) => {
    const record = asRecord(entry);
    return {
      id: text(record.id) ?? `log-${index + 1}`,
      source: text(record.source ?? record.unit) ?? 'journal',
      priority: text(record.priority),
      timestamp: text(record.timestamp),
      message: text(record.message) ?? '',
      recorded: true,
    };
  }).filter((entry) => entry.message.length > 0);
}

function normalizeConfigs(value: unknown): LinuxConfigRecord[] {
  return asArray(value).map((entry, index) => {
    const record = asRecord(entry);
    return {
      path: text(record.path) ?? `config-${index + 1}`,
      format: text(record.format ?? record.language) ?? 'text',
      content: text(record.content) ?? '',
      description: text(record.description),
      source: source(record.source),
    };
  }).filter((entry) => entry.content.length > 0);
}

function normalizeVerification(value: unknown): LinuxVerificationRecord[] {
  return asArray(value).map((entry, index) => {
    const record = asRecord(entry);
    return {
      id: text(record.id) ?? `verification-${index + 1}`,
      title: text(record.title) ?? text(record.name) ?? `Verification ${index + 1}`,
      command: text(record.command),
      recordedObservation: text(record.recordedObservation ?? record.observation ?? record.output),
      source: source(record.source, 'EXPECTED_CHECK'),
      evidenceId: text(record.evidenceId),
    };
  });
}

function hostRecord(node: LabNodeRecord, normalized: Record<string, unknown> | undefined): LinuxHostState {
  const nodeConfiguration = asRecord(node.configuration);
  const nodeHost = asRecord(nodeConfiguration.host);
  const merged = { ...normalized, ...nodeHost } as Record<string, unknown>;
  const selinux = normalizeSelinux(merged.selinux);
  return {
    key: node.nodeKey,
    label: node.label,
    hostname: text(merged.hostname) ?? node.label,
    osName: text(merged.osName ?? merged.distribution),
    osVersion: text(merged.osVersion ?? merged.release),
    kernelVersion: text(merged.kernelVersion ?? merged.kernel),
    architecture: text(merged.architecture ?? merged.arch),
    bootTarget: text(merged.bootTarget ?? merged.defaultTarget),
    status: hostStatus(merged.status),
    fipsMode: booleanValue(merged.fipsMode),
    timeSynchronization: text(merged.timeSynchronization ?? merged.timeSync),
    description: node.description ?? text(merged.description),
    services: normalizeServices(merged.services),
    blockDevices: normalizeBlockDevices(merged.blockDevices ?? merged.storageDevices),
    volumeGroups: normalizeVolumeGroups(merged.volumeGroups),
    logicalVolumes: normalizeLogicalVolumes(merged.logicalVolumes),
    mounts: normalizeMounts(merged.mounts),
    fstab: normalizeFstab(merged.fstab),
    selinux,
    interfaces: normalizeInterfaces(merged.interfaces ?? merged.networkInterfaces),
    routes: normalizeRoutes(merged.routes),
    logs: normalizeLogs(merged.logs ?? merged.journal),
    configurations: normalizeConfigs(merged.configurations ?? merged.configFiles),
    verificationRecords: normalizeVerification(merged.verificationRecords ?? merged.verificationChecks),
    metadata: { ...asRecord(node.metadata), ...asRecord(merged.metadata) },
  };
}

function normalizedHosts(root: Record<string, unknown>): Map<string, Record<string, unknown>> {
  const hosts = new Map<string, Record<string, unknown>>();
  for (const [index, entry] of asArray(root.hosts).entries()) {
    const record = asRecord(entry);
    const key = text(record.key ?? record.hostKey ?? record.hostname) ?? `host-${index + 1}`;
    hosts.set(key, record);
  }
  return hosts;
}

function syntheticNode(key: string, record: Record<string, unknown>, index: number): LabNodeRecord {
  return {
    id: `normalized:${key}`,
    labId: '',
    nodeKey: key,
    label: text(record.label ?? record.hostname) ?? key,
    kind: text(record.kind) ?? 'linux_host',
    description: text(record.description),
    position: { x: 140 + index * 220, y: 180 },
    configuration: { host: record },
    metadata: {},
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

function provenance(manifest: CanonicalLabManifestV1, root: Record<string, unknown>): LinuxStateProvenance {
  const raw = asRecord(root.provenance);
  const sourceType = String(raw.sourceType ?? '').toUpperCase();
  return {
    sourceType:
      sourceType === 'NORMALIZED_PROJECT_FIXTURE'
        ? 'NORMALIZED_PROJECT_FIXTURE'
        : manifest.topology.nodes.length > 0
          ? 'LAB_HOST_RECORDS'
          : Object.keys(root).length > 0
            ? 'CANONICAL_MANIFEST'
            : 'UNKNOWN',
    inputTypes: manifest.inputs.map((input) => input.inputType),
    notes: strings(raw.notes),
  };
}

export class LinuxLabAdapter {
  toState(manifest: CanonicalLabManifestV1): LinuxLabState {
    if (manifest.lab.domain !== 'LINUX' || manifest.lab.kind !== 'LINUX_SYSTEM') {
      throw new ValidationError('Canonical manifest is not a Linux system lab');
    }
    if (!manifest.project) throw new ValidationError('Linux Lab must belong to a project');

    const root = rootState(manifest.normalizedState);
    const hostMap = normalizedHosts(root);
    const nodeHosts = manifest.topology.nodes.filter((node) => {
      const kind = node.kind.toLowerCase();
      return ['linux_host', 'host', 'server', 'rhel_host'].includes(kind) || asRecord(node.configuration).host !== undefined;
    });

    const seen = new Set<string>();
    const hosts = nodeHosts.map((node) => {
      seen.add(node.nodeKey);
      return hostRecord(node, hostMap.get(node.nodeKey));
    });
    for (const [key, record] of hostMap) {
      if (seen.has(key)) continue;
      hosts.push(hostRecord(syntheticNode(key, record, hosts.length), record));
    }

    const warnings: string[] = [];
    if (hosts.length === 0) warnings.push('No normalized Linux host records are attached to this Lab.');
    if (!manifest.inputs.some((entry) => entry.inputType === 'SYSTEM_SNAPSHOT')) {
      warnings.push('This Linux Lab has no SYSTEM_SNAPSHOT input descriptor.');
    }
    if (hosts.every((host) => host.logs.length === 0)) {
      warnings.push('No recorded journal/log extract is attached; the UI does not fabricate live host logs.');
    }

    return {
      schemaVersion: 'linux.v1',
      lab: {
        id: manifest.lab.id,
        slug: manifest.lab.slug,
        title: manifest.lab.title,
        summary: manifest.lab.summary,
        capabilities: [...manifest.lab.capabilities],
      },
      project: manifest.project,
      inputs: manifest.inputs,
      overview: text(root.overview),
      hosts,
      runbook: manifest.runbook,
      evidence: manifest.evidence,
      scenarios: manifest.scenarios,
      provenance: provenance(manifest, root),
      warnings,
    };
  }

  toSummary(manifest: CanonicalLabManifestV1): LinuxLabSummary {
    const state = this.toState(manifest);
    return {
      id: state.lab.id,
      slug: state.lab.slug,
      title: state.lab.title,
      summary: state.lab.summary,
      project: state.project,
      capabilities: [...state.lab.capabilities],
      hostCount: state.hosts.length,
      inputTypes: state.inputs.map((input) => input.inputType),
    };
  }
}

export const linuxLabAdapter = new LinuxLabAdapter();
