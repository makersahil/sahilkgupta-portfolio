import { ValidationError } from '../../lib/errors.js';
import type { DevOpsLabState } from '../../types/devops.js';
import type { LinuxLabState } from '../../types/linux.js';
import type { NetworkingLabState } from '../../types/networking.js';
import type { ScenarioVerificationCheck } from '../../types/scenario.js';

export type ScenarioDomainState = NetworkingLabState | LinuxLabState | DevOpsLabState;

type Mutation = Record<string, unknown> & { type: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`Scenario mutation requires ${field}`);
  }
  return value.trim();
}


function nullableSelector(value: unknown, field: string): string | null {
  if (value === null) return null;
  return text(value, field);
}

function requiredNamespace(mutation: Mutation): string | null {
  if (!Object.prototype.hasOwnProperty.call(mutation, 'namespace')) {
    throw new ValidationError('Scenario mutation requires namespace (use null for the default/unspecified namespace)');
  }
  return nullableSelector(mutation.namespace, 'namespace');
}

function integer(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new ValidationError(`Scenario mutation requires a non-negative integer ${field}`);
  }
  return value;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function scenarioMutations(actions: unknown): Mutation[] {
  if (!isRecord(actions) || !Array.isArray(actions.mutations)) {
    throw new ValidationError('Scenario actions must contain a mutations array');
  }
  return actions.mutations.map((entry, index) => {
    if (!isRecord(entry) || typeof entry.type !== 'string' || !entry.type.trim()) {
      throw new ValidationError(`Scenario mutation ${index + 1} is invalid`);
    }
    return { ...entry, type: entry.type.trim() } as Mutation;
  });
}

function networkingMutate(state: NetworkingLabState, mutation: Mutation): void {
  switch (mutation.type) {
    case 'SET_LINK_STATUS': {
      const linkKey = text(mutation.linkKey, 'linkKey');
      const status = text(mutation.status, 'status').toUpperCase();
      if (!['UP', 'DOWN', 'STANDBY', 'DEGRADED', 'UNKNOWN'].includes(status)) {
        throw new ValidationError(`Unsupported networking link status: ${status}`);
      }
      const link = state.links.find((entry) => entry.key === linkKey);
      if (!link) throw new ValidationError(`Scenario link not found: ${linkKey}`);
      link.status = status as typeof link.status;
      if (status === 'DOWN') {
        const endpoints = new Set([link.sourceDeviceKey, link.targetDeviceKey]);
        for (const neighbor of state.bgpNeighbors) {
          if (endpoints.has(neighbor.deviceKey) && neighbor.peerDeviceKey && endpoints.has(neighbor.peerDeviceKey)) {
            neighbor.state = 'IDLE';
            neighbor.health = 'DOWN';
          }
        }
        for (const neighbor of state.ospfNeighbors) {
          if (endpoints.has(neighbor.deviceKey) && neighbor.peerDeviceKey && endpoints.has(neighbor.peerDeviceKey)) {
            neighbor.state = 'DOWN';
            neighbor.health = 'DOWN';
          }
        }
      }
      return;
    }
    case 'SET_OSPF_NEIGHBOR_STATE': {
      const neighborId = text(mutation.neighborId, 'neighborId');
      const value = text(mutation.state, 'state').toUpperCase();
      const matches = state.ospfNeighbors.filter((entry) => entry.id === neighborId || entry.neighborId === neighborId);
      if (!matches.length) throw new ValidationError(`Scenario OSPF neighbor not found: ${neighborId}`);
      for (const neighbor of matches) {
        neighbor.state = value;
        neighbor.health = ['FULL', '2-WAY', '2WAY'].includes(value) ? 'UP' : value === 'DOWN' ? 'DOWN' : 'DEGRADED';
      }
      return;
    }
    case 'SET_DEVICE_STATUS': {
      const deviceKey = text(mutation.deviceKey, 'deviceKey');
      const status = text(mutation.status, 'status').toUpperCase();
      if (!['UP', 'DOWN', 'STANDBY', 'DEGRADED', 'UNKNOWN'].includes(status)) {
        throw new ValidationError(`Unsupported networking device status: ${status}`);
      }
      const device = state.devices.find((entry) => entry.key === deviceKey);
      if (!device) throw new ValidationError(`Scenario device not found: ${deviceKey}`);
      device.status = status as typeof device.status;
      if (status === 'DOWN') {
        for (const neighbor of state.bgpNeighbors) {
          if (neighbor.deviceKey === deviceKey || neighbor.peerDeviceKey === deviceKey) {
            neighbor.state = 'IDLE';
            neighbor.health = 'DOWN';
          }
        }
        for (const neighbor of state.ospfNeighbors) {
          if (neighbor.deviceKey === deviceKey || neighbor.peerDeviceKey === deviceKey) {
            neighbor.state = 'DOWN';
            neighbor.health = 'DOWN';
          }
        }
        for (const group of state.gatewayRedundancy) {
          const failed = group.members.find((member) => member.deviceKey === deviceKey);
          if (!failed) continue;
          failed.status = 'DOWN';
          const wasActive = failed.role === 'ACTIVE';
          if (wasActive) {
            failed.role = 'LISTEN';
            const replacement = group.members
              .filter((member) => member.deviceKey !== deviceKey && member.status !== 'DOWN')
              .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0];
            if (replacement) {
              replacement.role = 'ACTIVE';
              replacement.status = 'UP';
            }
          }
          group.health = 'DEGRADED';
        }
      }
      return;
    }
    case 'SELECT_ACL_OBSERVATION': {
      const aclId = text(mutation.aclId, 'aclId');
      const acl = state.aclRules.find((entry) => entry.id === aclId || entry.name === aclId);
      if (!acl) throw new ValidationError(`Scenario ACL observation not found: ${aclId}`);
      return;
    }
    default:
      throw new ValidationError(`Unsupported Networking scenario mutation: ${mutation.type}`);
  }
}

function linuxHost(state: LinuxLabState, hostKey: string) {
  const host = state.hosts.find((entry) => entry.key === hostKey);
  if (!host) throw new ValidationError(`Scenario Linux host not found: ${hostKey}`);
  return host;
}

function linuxMutate(state: LinuxLabState, mutation: Mutation): void {
  switch (mutation.type) {
    case 'SET_SERVICE_STATE': {
      const host = linuxHost(state, text(mutation.hostKey, 'hostKey'));
      const unit = text(mutation.unit, 'unit');
      const activeState = text(mutation.activeState, 'activeState').toUpperCase();
      if (!['ACTIVE', 'INACTIVE', 'FAILED', 'UNKNOWN'].includes(activeState)) {
        throw new ValidationError(`Unsupported Linux service state: ${activeState}`);
      }
      const service = host.services.find((entry) => entry.unit === unit);
      if (!service) throw new ValidationError(`Scenario systemd unit not found: ${unit}`);
      service.activeState = activeState as typeof service.activeState;
      if (activeState === 'FAILED') {
        service.subState = 'failed';
        host.status = 'DEGRADED';
      }
      return;
    }
    case 'ADD_RECORDED_AVC_DENIAL': {
      const host = linuxHost(state, text(mutation.hostKey, 'hostKey'));
      const id = 'scenario-avc-denial';
      if (!host.logs.some((entry) => entry.id === id)) {
        host.logs.push({
          id,
          source: 'scenario:audit',
          priority: 'warning',
          timestamp: null,
          message: 'scenario-injected AVC denial: SELinux recorded-state simulation requires policy/context investigation',
          recorded: true,
        });
      }
      host.status = 'DEGRADED';
      return;
    }
    case 'SET_MOUNT_STATE': {
      const host = linuxHost(state, text(mutation.hostKey, 'hostKey'));
      const target = text(mutation.target, 'target');
      const value = text(mutation.state, 'state').toUpperCase();
      if (!['MOUNTED', 'UNMOUNTED', 'DEGRADED', 'UNKNOWN'].includes(value)) {
        throw new ValidationError(`Unsupported Linux mount state: ${value}`);
      }
      const mount = host.mounts.find((entry) => entry.target === target);
      if (!mount) throw new ValidationError(`Scenario mount not found: ${target}`);
      mount.state = value as typeof mount.state;
      for (const logicalVolume of host.logicalVolumes.filter((entry) => entry.mountPoint === target)) {
        logicalVolume.state = value as typeof logicalVolume.state;
      }
      for (const device of host.blockDevices.filter((entry) => entry.mountPoint === target)) {
        device.state = value as typeof device.state;
      }
      if (value !== 'MOUNTED') host.status = 'DEGRADED';
      return;
    }
    case 'SET_INTERFACE_STATE': {
      const host = linuxHost(state, text(mutation.hostKey, 'hostKey'));
      const interfaceName = text(mutation.interfaceName, 'interfaceName');
      const value = text(mutation.state, 'state').toUpperCase();
      if (!['UP', 'DOWN', 'UNKNOWN'].includes(value)) {
        throw new ValidationError(`Unsupported Linux interface state: ${value}`);
      }
      const iface = host.interfaces.find((entry) => entry.name === interfaceName);
      if (!iface) throw new ValidationError(`Scenario interface not found: ${interfaceName}`);
      iface.state = value as typeof iface.state;
      if (value === 'DOWN') host.status = 'DEGRADED';
      return;
    }
    default:
      throw new ValidationError(`Unsupported Linux scenario mutation: ${mutation.type}`);
  }
}

function devOpsMutate(state: DevOpsLabState, mutation: Mutation): void {
  switch (mutation.type) {
    case 'SET_PIPELINE_STAGE_STATUS': {
      const pipelineId = text(mutation.pipelineId, 'pipelineId');
      const stageId = text(mutation.stageId, 'stageId');
      const status = text(mutation.status, 'status').toUpperCase();
      if (!['SUCCESS', 'RUNNING', 'PENDING', 'FAILED', 'UNKNOWN'].includes(status)) {
        throw new ValidationError(`Unsupported pipeline stage status: ${status}`);
      }
      const pipeline = state.pipelines.find((entry) => entry.id === pipelineId);
      if (!pipeline) throw new ValidationError(`Scenario pipeline not found: ${pipelineId}`);
      const stage = pipeline.stages.find((entry) => entry.id === stageId);
      if (!stage) throw new ValidationError(`Scenario pipeline stage not found: ${stageId}`);
      stage.status = status as typeof stage.status;
      pipeline.status = status === 'FAILED' ? 'FAILED' : pipeline.stages.every((entry) => entry.status === 'SUCCESS') ? 'SUCCESS' : status as typeof pipeline.status;
      return;
    }
    case 'SET_TERRAFORM_DRIFT_STATUS': {
      if (!state.terraform) throw new ValidationError('Scenario requires recorded Terraform state');
      const status = text(mutation.status, 'status').toUpperCase();
      if (!['CLEAN', 'DRIFTED', 'ERROR', 'UNKNOWN'].includes(status)) {
        throw new ValidationError(`Unsupported Terraform drift status: ${status}`);
      }
      state.terraform.driftStatus = status as typeof state.terraform.driftStatus;
      if (status === 'DRIFTED' && !state.terraform.driftSummary) {
        state.terraform.driftSummary = 'Session-scoped scenario overlay records Terraform drift for investigation.';
      }
      return;
    }
    case 'SET_WORKLOAD_READINESS': {
      const workloadName = text(mutation.name, 'name');
      const namespace = requiredNamespace(mutation);
      const workload = state.kubernetes.workloads.find((entry) =>
        entry.name === workloadName && entry.namespace === namespace,
      );
      if (!workload) throw new ValidationError(`Scenario Kubernetes workload not found: ${namespace ?? 'default'}/${workloadName}`);
      workload.readyReplicas = integer(mutation.readyReplicas, 'readyReplicas');
      const status = text(mutation.status, 'status').toUpperCase();
      if (!['READY', 'DEGRADED', 'FAILED', 'UNKNOWN'].includes(status)) {
        throw new ValidationError(`Unsupported Kubernetes workload status: ${status}`);
      }
      workload.status = status as typeof workload.status;
      return;
    }
    case 'SET_GITOPS_SYNC_STATUS': {
      const appName = text(mutation.appName, 'appName');
      const app = state.gitops.find((entry) => entry.name === appName);
      if (!app) throw new ValidationError(`Scenario GitOps application not found: ${appName}`);
      const syncStatus = text(mutation.syncStatus, 'syncStatus').toUpperCase();
      if (!['SYNCED', 'OUT_OF_SYNC', 'UNKNOWN'].includes(syncStatus)) {
        throw new ValidationError(`Unsupported GitOps sync status: ${syncStatus}`);
      }
      app.syncStatus = syncStatus as typeof app.syncStatus;
      if (syncStatus === 'OUT_OF_SYNC') app.healthStatus = 'DEGRADED';
      return;
    }
    case 'SET_OBSERVATION_STATUS': {
      const observationId = text(mutation.observationId, 'observationId');
      const observation = state.observability.find((entry) => entry.id === observationId);
      if (!observation) throw new ValidationError(`Scenario observability snapshot not found: ${observationId}`);
      const status = text(mutation.status, 'status').toUpperCase();
      if (!['PASS', 'WARN', 'FAIL', 'UNKNOWN'].includes(status)) {
        throw new ValidationError(`Unsupported observation status: ${status}`);
      }
      observation.status = status as typeof observation.status;
      return;
    }
    case 'SET_NETWORK_POLICY_STATUS': {
      const policyName = text(mutation.policyName, 'policyName');
      const namespace = requiredNamespace(mutation);
      const policy = state.networkPolicies.find((entry) => entry.name === policyName && entry.namespace === namespace);
      if (!policy) throw new ValidationError(`Scenario network-policy record not found: ${namespace ?? 'default'}/${policyName}`);
      const status = text(mutation.status, 'status').toUpperCase();
      if (!['ENFORCED', 'RECORDED', 'UNKNOWN'].includes(status)) {
        throw new ValidationError(`Unsupported network-policy status: ${status}`);
      }
      policy.status = status as typeof policy.status;
      return;
    }
    default:
      throw new ValidationError(`Unsupported DevOps scenario mutation: ${mutation.type}`);
  }
}

export function applyScenarioActions<T extends ScenarioDomainState>(state: T, actions: unknown): T {
  const next = clone(state);
  for (const mutation of scenarioMutations(actions)) {
    if (next.schemaVersion === 'networking.v1') networkingMutate(next as NetworkingLabState, mutation);
    else if (next.schemaVersion === 'linux.v1') linuxMutate(next as LinuxLabState, mutation);
    else if (next.schemaVersion === 'devops.v1') devOpsMutate(next as DevOpsLabState, mutation);
    else throw new ValidationError('Unsupported scenario domain state');
  }
  return next;
}

function check(id: string, passed: boolean, summary: string, evidence: string[]): ScenarioVerificationCheck {
  return { id, passed, summary, evidence };
}

function verifyNetworking(state: NetworkingLabState, mutation: Mutation, index: number): ScenarioVerificationCheck {
  if (mutation.type === 'SET_LINK_STATUS') {
    const key = text(mutation.linkKey, 'linkKey');
    const expected = text(mutation.status, 'status').toUpperCase();
    const actual = state.links.find((entry) => entry.key === key)?.status;
    return check(`mutation-${index + 1}`, actual === expected, `Link ${key} should be ${expected}.`, [`actual=${actual ?? 'missing'}`]);
  }
  if (mutation.type === 'SET_OSPF_NEIGHBOR_STATE') {
    const id = text(mutation.neighborId, 'neighborId');
    const expected = text(mutation.state, 'state').toUpperCase();
    const matches = state.ospfNeighbors.filter((entry) => entry.id === id || entry.neighborId === id);
    return check(`mutation-${index + 1}`, matches.length > 0 && matches.every((entry) => entry.state.toUpperCase() === expected), `OSPF neighbor ${id} should be ${expected}.`, matches.map((entry) => `${entry.id}=${entry.state}`));
  }
  if (mutation.type === 'SET_DEVICE_STATUS') {
    const key = text(mutation.deviceKey, 'deviceKey');
    const expected = text(mutation.status, 'status').toUpperCase();
    const actual = state.devices.find((entry) => entry.key === key)?.status;
    return check(`mutation-${index + 1}`, actual === expected, `Device ${key} should be ${expected}.`, [`actual=${actual ?? 'missing'}`]);
  }
  if (mutation.type === 'SELECT_ACL_OBSERVATION') {
    const id = text(mutation.aclId, 'aclId');
    const acl = state.aclRules.find((entry) => entry.id === id || entry.name === id);
    return check(`mutation-${index + 1}`, Boolean(acl), `ACL ${id} should remain inspectable.`, acl ? [`action=${acl.action}`, `source=${acl.source}`, `destination=${acl.destination}`] : ['missing']);
  }
  return check(`mutation-${index + 1}`, false, `Unsupported Networking verification mutation ${mutation.type}.`, []);
}

function verifyLinux(state: LinuxLabState, mutation: Mutation, index: number): ScenarioVerificationCheck {
  const hostKey = typeof mutation.hostKey === 'string' ? mutation.hostKey : '';
  const host = state.hosts.find((entry) => entry.key === hostKey);
  if (!host) return check(`mutation-${index + 1}`, false, `Linux host ${hostKey || '?'} should exist.`, ['host missing']);
  if (mutation.type === 'SET_SERVICE_STATE') {
    const unit = text(mutation.unit, 'unit');
    const expected = text(mutation.activeState, 'activeState').toUpperCase();
    const actual = host.services.find((entry) => entry.unit === unit)?.activeState;
    return check(`mutation-${index + 1}`, actual === expected, `Service ${unit} should be ${expected}.`, [`actual=${actual ?? 'missing'}`]);
  }
  if (mutation.type === 'ADD_RECORDED_AVC_DENIAL') {
    const found = host.logs.some((entry) => entry.id === 'scenario-avc-denial');
    return check(`mutation-${index + 1}`, found, 'Scenario AVC denial should be present in recorded logs.', [found ? 'scenario-avc-denial=present' : 'missing']);
  }
  if (mutation.type === 'SET_MOUNT_STATE') {
    const target = text(mutation.target, 'target');
    const expected = text(mutation.state, 'state').toUpperCase();
    const actual = host.mounts.find((entry) => entry.target === target)?.state;
    return check(`mutation-${index + 1}`, actual === expected, `Mount ${target} should be ${expected}.`, [`actual=${actual ?? 'missing'}`]);
  }
  if (mutation.type === 'SET_INTERFACE_STATE') {
    const name = text(mutation.interfaceName, 'interfaceName');
    const expected = text(mutation.state, 'state').toUpperCase();
    const actual = host.interfaces.find((entry) => entry.name === name)?.state;
    return check(`mutation-${index + 1}`, actual === expected, `Interface ${name} should be ${expected}.`, [`actual=${actual ?? 'missing'}`]);
  }
  return check(`mutation-${index + 1}`, false, `Unsupported Linux verification mutation ${mutation.type}.`, []);
}

function verifyDevOps(state: DevOpsLabState, mutation: Mutation, index: number): ScenarioVerificationCheck {
  if (mutation.type === 'SET_PIPELINE_STAGE_STATUS') {
    const pipelineId = text(mutation.pipelineId, 'pipelineId');
    const stageId = text(mutation.stageId, 'stageId');
    const expected = text(mutation.status, 'status').toUpperCase();
    const pipeline = state.pipelines.find((entry) => entry.id === pipelineId);
    const stage = pipeline?.stages.find((entry) => entry.id === stageId);
    return check(`mutation-${index + 1}`, stage?.status === expected, `Pipeline stage ${pipelineId}/${stageId} should be ${expected}.`, [`actual=${stage?.status ?? 'missing'}`, `pipeline=${pipeline?.status ?? 'missing'}`]);
  }
  if (mutation.type === 'SET_TERRAFORM_DRIFT_STATUS') {
    const expected = text(mutation.status, 'status').toUpperCase();
    return check(`mutation-${index + 1}`, state.terraform?.driftStatus === expected, `Terraform drift should be ${expected}.`, [`actual=${state.terraform?.driftStatus ?? 'missing'}`]);
  }
  if (mutation.type === 'SET_WORKLOAD_READINESS') {
    const expectedReady = integer(mutation.readyReplicas, 'readyReplicas');
    const workloadName = text(mutation.name, 'name');
    const namespace = requiredNamespace(mutation);
    const workload = state.kubernetes.workloads.find((entry) =>
      entry.name === workloadName && entry.namespace === namespace,
    );
    return check(`mutation-${index + 1}`, workload?.readyReplicas === expectedReady, `The selected workload should report ${expectedReady} ready replicas.`, workload ? [`${workload.namespace ?? 'default'}/${workload.name}=${workload.readyReplicas}/${workload.desiredReplicas ?? '?'}`] : ['missing']);
  }
  if (mutation.type === 'SET_GITOPS_SYNC_STATUS') {
    const expected = text(mutation.syncStatus, 'syncStatus').toUpperCase();
    const appName = text(mutation.appName, 'appName');
    const app = state.gitops.find((entry) => entry.name === appName);
    return check(`mutation-${index + 1}`, app?.syncStatus === expected, `The selected GitOps application should be ${expected}.`, app ? [`${app.name}=${app.syncStatus}/${app.healthStatus}`] : ['missing']);
  }
  if (mutation.type === 'SET_OBSERVATION_STATUS') {
    const expected = text(mutation.status, 'status').toUpperCase();
    const observationId = text(mutation.observationId, 'observationId');
    const observation = state.observability.find((entry) => entry.id === observationId);
    return check(`mutation-${index + 1}`, observation?.status === expected, `The selected observability snapshot should be ${expected}.`, observation ? [`${observation.id}=${observation.status}`] : ['missing']);
  }
  if (mutation.type === 'SET_NETWORK_POLICY_STATUS') {
    const expected = text(mutation.status, 'status').toUpperCase();
    const policyName = text(mutation.policyName, 'policyName');
    const namespace = requiredNamespace(mutation);
    const policy = state.networkPolicies.find((entry) => entry.name === policyName && entry.namespace === namespace);
    return check(`mutation-${index + 1}`, policy?.status === expected, `The selected network-policy record should be ${expected}.`, policy ? [`${policy.name}=${policy.status}`] : ['missing']);
  }
  return check(`mutation-${index + 1}`, false, `Unsupported DevOps verification mutation ${mutation.type}.`, []);
}

export function verifyScenarioActions(state: ScenarioDomainState, actions: unknown): ScenarioVerificationCheck[] {
  return scenarioMutations(actions).map((mutation, index) => {
    if (state.schemaVersion === 'networking.v1') return verifyNetworking(state, mutation, index);
    if (state.schemaVersion === 'linux.v1') return verifyLinux(state, mutation, index);
    return verifyDevOps(state as DevOpsLabState, mutation, index);
  });
}
