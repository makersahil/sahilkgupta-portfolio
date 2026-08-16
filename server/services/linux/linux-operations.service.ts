import { NotFoundError } from '../../lib/errors.js';
import type {
  LinuxFindingSeverity,
  LinuxHealthCheck,
  LinuxHealthStatus,
  LinuxHostState,
  LinuxInvestigationFinding,
  LinuxLabState,
  LinuxOperationsSnapshot,
  LinuxOperatorContext,
  LinuxScenarioReadiness,
} from '../../types/linux.js';
import type { LinuxService } from './linux.service.js';

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function contextSegment(value: string): string {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || 'LAB';
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim()))];
}

function scenarioSignals(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.observableSignals)) return [];
  return record.observableSignals.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
}

function healthRank(status: LinuxHealthStatus): number {
  switch (status) {
    case 'FAIL': return 3;
    case 'WARN': return 2;
    case 'UNKNOWN': return 1;
    default: return 0;
  }
}

function findingRank(severity: LinuxFindingSeverity): number {
  switch (severity) {
    case 'CRITICAL': return 3;
    case 'WARN': return 2;
    default: return 1;
  }
}

function priorityRank(priority: string | null): number {
  const normalized = (priority ?? '').trim().toLowerCase();
  if (['emerg', 'emergency', 'alert', 'crit', 'critical', 'err', 'error'].includes(normalized)) return 3;
  if (['warning', 'warn'].includes(normalized)) return 2;
  if (['notice', 'info', 'informational'].includes(normalized)) return 1;
  return 0;
}

function relatedServiceLogs(host: LinuxHostState, unit: string): string[] {
  const unitBase = unit.replace(/\.service$/i, '').toLowerCase();
  return host.logs
    .filter((entry) => {
      const source = entry.source.toLowerCase();
      const message = entry.message.toLowerCase();
      return source === unit.toLowerCase() || source.includes(unitBase) || message.includes(unit.toLowerCase()) || message.includes(unitBase);
    })
    .slice(0, 4)
    .map((entry) => `${entry.source}${entry.priority ? ` [${entry.priority}]` : ''}: ${entry.message}`);
}

function recordedAvcLogs(host: LinuxHostState): string[] {
  return host.logs
    .filter((entry) => /\bavc\b.*\bdenied\b|selinux.*denied|denied.*scontext=/i.test(entry.message))
    .slice(0, 5)
    .map((entry) => `${entry.source}${entry.priority ? ` [${entry.priority}]` : ''}: ${entry.message}`);
}

function problemMounts(host: LinuxHostState) {
  return host.mounts.filter((entry) => entry.state === 'UNMOUNTED' || entry.state === 'DEGRADED');
}

function problemLogicalVolumes(host: LinuxHostState) {
  return host.logicalVolumes.filter((entry) => entry.state === 'UNMOUNTED' || entry.state === 'DEGRADED');
}

function explicitFstabMismatchTargets(host: LinuxHostState): string[] {
  if (host.mounts.length === 0) return [];
  const explicitProblemTargets = new Set(
    host.mounts
      .filter((entry) => entry.state === 'UNMOUNTED' || entry.state === 'DEGRADED')
      .map((entry) => entry.target),
  );
  return host.fstab
    .filter((entry) => entry.target !== 'none' && entry.filesystem.toLowerCase() !== 'swap')
    .map((entry) => entry.target)
    .filter((target) => explicitProblemTargets.has(target));
}

function unresolvedFstabTargets(host: LinuxHostState): string[] {
  if (host.fstab.length === 0) return [];
  const mountsByTarget = new Map(host.mounts.map((entry) => [entry.target, entry]));
  return host.fstab
    .filter((entry) => entry.target !== 'none' && entry.filesystem.toLowerCase() !== 'swap')
    .map((entry) => entry.target)
    .filter((target) => {
      const mount = mountsByTarget.get(target);
      return !mount || mount.state === 'UNKNOWN';
    });
}

function buildHealthChecks(state: LinuxLabState, host: LinuxHostState): LinuxHealthCheck[] {
  const checks: LinuxHealthCheck[] = [];

  const hostStatus: LinuxHealthStatus = host.status === 'DOWN'
    ? 'FAIL'
    : host.status === 'DEGRADED'
      ? 'WARN'
      : host.status === 'UP'
        ? 'PASS'
        : 'UNKNOWN';
  checks.push({
    id: 'host-operational-state',
    category: 'HOST',
    status: hostStatus,
    title: 'Recorded host state',
    summary: host.status === 'UNKNOWN'
      ? 'No definitive host operational state is recorded.'
      : `${host.hostname} is recorded as ${host.status}.`,
    relatedUnits: [], relatedPaths: [], relatedInterfaces: [], evidence: [`host.status=${host.status}`],
  });

  const failedServices = host.services.filter((entry) => entry.activeState === 'FAILED');
  const inactiveEnabled = host.services.filter((entry) => entry.activeState === 'INACTIVE' && entry.enabled === true);
  checks.push({
    id: 'systemd-service-state',
    category: 'SERVICE',
    status: failedServices.length ? 'FAIL' : inactiveEnabled.length ? 'WARN' : host.services.length ? 'PASS' : 'UNKNOWN',
    title: 'systemd service state',
    summary: failedServices.length
      ? `${failedServices.length} recorded service(s) are FAILED.`
      : inactiveEnabled.length
        ? `${inactiveEnabled.length} enabled service(s) are recorded INACTIVE.`
        : host.services.length
          ? 'No recorded service is FAILED or unexpectedly inactive while enabled.'
          : 'No normalized systemd service snapshot is attached.',
    relatedUnits: unique([...failedServices, ...inactiveEnabled].map((entry) => entry.unit)),
    relatedPaths: [], relatedInterfaces: [],
    evidence: [...failedServices, ...inactiveEnabled].map((entry) => `${entry.unit}=${entry.activeState}${entry.enabled === null ? '' : ` enabled=${entry.enabled}`}`),
  });

  const badMounts = problemMounts(host);
  const badLvs = problemLogicalVolumes(host);
  const knownStorage = [...host.mounts.map((entry) => entry.state), ...host.logicalVolumes.map((entry) => entry.state), ...host.blockDevices.map((entry) => entry.state)];
  const storageStatus: LinuxHealthStatus = badMounts.some((entry) => entry.state === 'UNMOUNTED') || badLvs.some((entry) => entry.state === 'UNMOUNTED')
    ? 'FAIL'
    : badMounts.length || badLvs.length
      ? 'WARN'
      : knownStorage.some((entry) => entry === 'MOUNTED')
        ? 'PASS'
        : knownStorage.length
          ? 'UNKNOWN'
          : 'UNKNOWN';
  checks.push({
    id: 'storage-state',
    category: 'STORAGE',
    status: storageStatus,
    title: 'Storage and mount state',
    summary: badMounts.length || badLvs.length
      ? `${badMounts.length} mount(s) and ${badLvs.length} logical volume(s) have explicit non-healthy recorded state.`
      : knownStorage.some((entry) => entry === 'MOUNTED')
        ? 'Recorded storage entries do not show an explicit degraded or unmounted state.'
        : 'Storage records exist, but current mount health is not fully recorded.',
    relatedUnits: [],
    relatedPaths: unique([...badMounts.map((entry) => entry.target), ...badLvs.map((entry) => entry.mountPoint)]),
    relatedInterfaces: [],
    evidence: [
      ...badMounts.map((entry) => `${entry.source} -> ${entry.target}=${entry.state}`),
      ...badLvs.map((entry) => `${entry.volumeGroup}/${entry.name}=${entry.state}`),
    ],
  });

  const explicitFstabMismatches = explicitFstabMismatchTargets(host);
  const unresolvedFstab = unresolvedFstabTargets(host);
  checks.push({
    id: 'fstab-runtime-alignment',
    category: 'FSTAB',
    status: host.fstab.length === 0
      ? 'UNKNOWN'
      : host.mounts.length === 0
        ? 'UNKNOWN'
        : explicitFstabMismatches.length
          ? 'WARN'
          : unresolvedFstab.length
            ? 'UNKNOWN'
            : 'PASS',
    title: '/etc/fstab and recorded mount alignment',
    summary: host.fstab.length === 0
      ? 'No normalized /etc/fstab entries are attached.'
      : host.mounts.length === 0
        ? 'fstab is recorded, but no runtime mount snapshot is available for comparison.'
        : explicitFstabMismatches.length
          ? `${explicitFstabMismatches.length} fstab target(s) have an explicit degraded/unmounted recorded state.`
          : unresolvedFstab.length
            ? `${unresolvedFstab.length} fstab target(s) cannot be conclusively compared because the recorded mount state is missing or UNKNOWN.`
            : 'Recorded non-swap fstab targets align with explicit mounted state.',
    relatedUnits: [],
    relatedPaths: unique([...explicitFstabMismatches, ...unresolvedFstab]),
    relatedInterfaces: [],
    evidence: [
      ...explicitFstabMismatches.map((target) => `fstab target ${target} has explicit non-mounted recorded state`),
      ...unresolvedFstab.map((target) => `fstab target ${target} lacks conclusive recorded mount state`),
    ],
  });

  const avc = recordedAvcLogs(host);
  const selinuxMismatch = host.selinux.configuredMode === 'ENFORCING' && host.selinux.mode !== 'ENFORCING';
  const selinuxStatus: LinuxHealthStatus = host.selinux.mode === 'DISABLED' && host.selinux.configuredMode === 'ENFORCING'
    ? 'FAIL'
    : selinuxMismatch || avc.length
      ? 'WARN'
      : host.selinux.mode === 'ENFORCING'
        ? 'PASS'
        : host.selinux.mode === 'UNKNOWN'
          ? 'UNKNOWN'
          : 'WARN';
  checks.push({
    id: 'selinux-policy-state',
    category: 'SELINUX',
    status: selinuxStatus,
    title: 'SELinux recorded policy state',
    summary: avc.length
      ? `${avc.length} recorded AVC/SELinux denial observation(s) are available for investigation.`
      : selinuxMismatch
        ? `Current mode ${host.selinux.mode} differs from configured mode ${host.selinux.configuredMode}.`
        : host.selinux.mode === 'UNKNOWN'
          ? 'SELinux mode is not recorded.'
          : `SELinux is recorded as ${host.selinux.mode}${host.selinux.policy ? ` with ${host.selinux.policy} policy` : ''}.`,
    relatedUnits: [], relatedPaths: [], relatedInterfaces: [],
    evidence: [`mode=${host.selinux.mode}`, `configuredMode=${host.selinux.configuredMode}`, ...avc],
  });

  const downInterfaces = host.interfaces.filter((entry) => entry.state === 'DOWN');
  const knownUpInterfaces = host.interfaces.filter((entry) => entry.state === 'UP');
  const defaultRoute = host.routes.find((entry) => entry.destination === '0.0.0.0/0' || entry.destination === 'default');
  const defaultInterfaceDown = defaultRoute?.interface
    ? downInterfaces.find((entry) => entry.name === defaultRoute.interface) ?? null
    : null;
  checks.push({
    id: 'network-state',
    category: 'NETWORK',
    status: defaultInterfaceDown || (host.interfaces.length > 0 && downInterfaces.length === host.interfaces.length)
      ? 'FAIL'
      : downInterfaces.length
        ? 'WARN'
        : knownUpInterfaces.length
          ? 'PASS'
          : host.interfaces.length
            ? 'UNKNOWN'
            : 'UNKNOWN',
    title: 'Network interface and route state',
    summary: defaultInterfaceDown
      ? `Default route references interface ${defaultInterfaceDown.name}, which is recorded DOWN.`
      : host.interfaces.length > 0 && downInterfaces.length === host.interfaces.length
        ? 'All recorded network interfaces are DOWN.'
        : downInterfaces.length
          ? `${downInterfaces.length} network interface(s) are recorded DOWN.`
          : knownUpInterfaces.length
            ? 'At least one network interface is recorded UP and no interface is explicitly DOWN.'
            : 'Network interface health is not definitively recorded.',
    relatedUnits: [], relatedPaths: [], relatedInterfaces: downInterfaces.map((entry) => entry.name),
    evidence: [
      ...downInterfaces.map((entry) => `${entry.name}=DOWN`),
      ...(defaultRoute ? [`default route via ${defaultRoute.gateway ?? 'direct'} dev ${defaultRoute.interface ?? 'unrecorded'}`] : []),
    ],
  });

  const severeLogs = host.logs.filter((entry) => priorityRank(entry.priority) >= 2 || /\b(error|failed|failure|critical|panic|timeout|no space left|read-only file system)\b/i.test(entry.message));
  checks.push({
    id: 'recorded-log-signals',
    category: 'LOG',
    status: severeLogs.length ? 'WARN' : host.logs.length ? 'PASS' : 'UNKNOWN',
    title: 'Recorded journal/log signals',
    summary: severeLogs.length
      ? `${severeLogs.length} warning/error log record(s) warrant investigation.`
      : host.logs.length
        ? 'Recorded log entries contain no simple warning/error signal recognized by the diagnostics layer.'
        : state.inputs.some((entry) => entry.inputType === 'JOURNAL_EXTRACT')
          ? 'A JOURNAL_EXTRACT input descriptor exists, but no normalized log records are available.'
          : 'No JOURNAL_EXTRACT/log snapshot is attached; live logs are not fabricated.',
    relatedUnits: unique(severeLogs.map((entry) => entry.source.endsWith('.service') ? entry.source : null)),
    relatedPaths: [], relatedInterfaces: [],
    evidence: severeLogs.slice(0, 5).map((entry) => `${entry.source}${entry.priority ? ` [${entry.priority}]` : ''}: ${entry.message}`),
  });

  return checks;
}

function buildFindings(host: LinuxHostState): LinuxInvestigationFinding[] {
  const findings: LinuxInvestigationFinding[] = [];

  for (const service of host.services) {
    if (service.activeState !== 'FAILED' && !(service.activeState === 'INACTIVE' && service.enabled === true)) continue;
    const failed = service.activeState === 'FAILED';
    const evidence = unique([
      `${service.unit}: activeState=${service.activeState}${service.subState ? ` subState=${service.subState}` : ''}${service.enabled === null ? '' : ` enabled=${service.enabled}`}`,
      ...relatedServiceLogs(host, service.unit),
    ]);
    findings.push({
      id: `service:${service.unit}`,
      category: 'SERVICE',
      severity: failed ? 'CRITICAL' : 'WARN',
      title: failed ? `${service.unit} is recorded FAILED` : `${service.unit} is enabled but recorded INACTIVE`,
      summary: failed
        ? 'The persisted systemd snapshot records a failed service. Correlate the unit status, recorded journal evidence, and unit configuration before changing service state.'
        : 'The unit is enabled but inactive in the recorded snapshot. Confirm whether the state is intentional before starting or enabling anything.',
      evidence,
      suggestedCommands: [
        `systemctl status ${shellQuote(service.unit)} --no-pager`,
        `journalctl -u ${shellQuote(service.unit)} -b --no-pager`,
        `systemctl cat ${shellQuote(service.unit)}`,
      ],
      remediationGuidance: [
        'Review the recorded failure/sub-state and journal evidence first.',
        'Validate unit configuration and dependencies before changing service state.',
        'After a deliberate remediation, re-check unit status and the relevant application-level verification.',
      ],
      relatedUnit: service.unit,
      relatedPath: null,
      relatedInterface: null,
      interpretation: 'RECORDED_STATE_DIAGNOSTIC',
    });
  }

  for (const mount of problemMounts(host)) {
    findings.push({
      id: `mount:${mount.target}`,
      category: 'STORAGE',
      severity: mount.state === 'UNMOUNTED' ? 'CRITICAL' : 'WARN',
      title: `${mount.target} is recorded ${mount.state}`,
      summary: `The persisted mount snapshot records ${mount.source} at ${mount.target} as ${mount.state}. The operations layer does not attempt a mount.` ,
      evidence: [`${mount.source} -> ${mount.target} (${mount.filesystem}) state=${mount.state}`],
      suggestedCommands: [
        `findmnt --target ${shellQuote(mount.target)}`,
        `lsblk -f`,
        `findmnt --verify --verbose`,
      ],
      remediationGuidance: [
        'Confirm the backing device/LV exists and inspect filesystem identity before mounting.',
        'Compare the runtime mount record with /etc/fstab and device UUID/LV path.',
        'Use a deliberate mount action only after the source, target, and filesystem are validated.',
      ],
      relatedUnit: null,
      relatedPath: mount.target,
      relatedInterface: null,
      interpretation: 'RECORDED_STATE_DIAGNOSTIC',
    });
  }

  for (const volume of problemLogicalVolumes(host)) {
    const path = volume.mountPoint;
    findings.push({
      id: `lv:${volume.volumeGroup}/${volume.name}`,
      category: 'STORAGE',
      severity: volume.state === 'UNMOUNTED' ? 'CRITICAL' : 'WARN',
      title: `${volume.volumeGroup}/${volume.name} requires storage investigation`,
      summary: `The logical volume is recorded ${volume.state}${path ? ` for ${path}` : ''}.`,
      evidence: [`${volume.volumeGroup}/${volume.name} size=${volume.size ?? 'not recorded'} fs=${volume.filesystem ?? 'not recorded'} state=${volume.state}`],
      suggestedCommands: ['pvs', 'vgs', 'lvs -a -o +devices', 'lsblk -f'],
      remediationGuidance: [
        'Verify PV/VG/LV visibility and activation state before modifying LVM metadata.',
        'Validate the filesystem and intended mount point from recorded configuration.',
        'Do not extend, repair, or mount storage automatically from this portfolio UI.',
      ],
      relatedUnit: null,
      relatedPath: path,
      relatedInterface: null,
      interpretation: 'RECORDED_STATE_DIAGNOSTIC',
    });
  }

  const missingTargets = explicitFstabMismatchTargets(host);
  for (const target of missingTargets) {
    const fstab = host.fstab.find((entry) => entry.target === target);
    findings.push({
      id: `fstab:${target}`,
      category: 'STORAGE',
      severity: 'WARN',
      title: `fstab target ${target} is not recorded mounted`,
      summary: 'The persisted fstab and mount snapshots do not align for this target. This can represent a boot/mount issue or an intentionally inactive entry.',
      evidence: fstab ? [`${fstab.source} ${fstab.target} ${fstab.filesystem} ${fstab.options.join(',') || 'defaults'}`] : [],
      suggestedCommands: [`findmnt --target ${shellQuote(target)}`, 'findmnt --verify --verbose', 'lsblk -f'],
      remediationGuidance: [
        'Confirm whether the fstab entry is intentionally inactive.',
        'Validate source identifiers, filesystem type, options, and mount-point existence.',
        'Re-check the configuration with findmnt verification before any reboot or mount change.',
      ],
      relatedUnit: null,
      relatedPath: target,
      relatedInterface: null,
      interpretation: 'RECORDED_STATE_DIAGNOSTIC',
    });
  }

  const avc = recordedAvcLogs(host);
  if (avc.length) {
    findings.push({
      id: 'selinux:recorded-avc-denial',
      category: 'SELINUX',
      severity: 'WARN',
      title: 'Recorded SELinux denial requires policy/context investigation',
      summary: 'A recorded AVC/SELinux denial exists. The diagnostics layer surfaces the evidence but does not recommend disabling SELinux.',
      evidence: avc,
      suggestedCommands: ['getenforce', 'ausearch -m AVC,USER_AVC -ts recent', 'ps -eZ', 'ls -Zd /path/to/affected/resource'],
      remediationGuidance: [
        'Identify the source and target contexts from the denial before changing policy.',
        'Check labeling, booleans, and approved port types against the application requirement.',
        'Prefer correcting labels/booleans/policy narrowly; do not disable SELinux as a generic fix.',
      ],
      relatedUnit: null,
      relatedPath: null,
      relatedInterface: null,
      interpretation: 'RECORDED_STATE_DIAGNOSTIC',
    });
  }

  if (host.selinux.configuredMode === 'ENFORCING' && host.selinux.mode !== 'ENFORCING') {
    findings.push({
      id: 'selinux:mode-drift',
      category: 'SELINUX',
      severity: host.selinux.mode === 'DISABLED' ? 'CRITICAL' : 'WARN',
      title: `SELinux mode drift: ${host.selinux.mode} vs configured ENFORCING`,
      summary: 'The recorded current mode differs from the configured enforcing policy.',
      evidence: [`current=${host.selinux.mode}`, `configured=${host.selinux.configuredMode}`, `policy=${host.selinux.policy ?? 'not recorded'}`],
      suggestedCommands: ['getenforce', 'sestatus', 'grep -E "^SELINUX=" /etc/selinux/config'],
      remediationGuidance: [
        'Confirm whether permissive/disabled mode is intentional for the recorded scenario.',
        'Investigate AVC denials and labeling before restoring enforcing mode.',
        'Apply policy-mode changes through an approved change path rather than from the portfolio UI.',
      ],
      relatedUnit: null,
      relatedPath: '/etc/selinux/config',
      relatedInterface: null,
      interpretation: 'RECORDED_STATE_DIAGNOSTIC',
    });
  }

  for (const iface of host.interfaces.filter((entry) => entry.state === 'DOWN')) {
    const critical = host.interfaces.length > 0 && host.interfaces.every((entry) => entry.state === 'DOWN');
    findings.push({
      id: `network:${iface.name}`,
      category: 'NETWORK',
      severity: critical ? 'CRITICAL' : 'WARN',
      title: `${iface.name} is recorded DOWN`,
      summary: 'The interface is explicitly DOWN in the persisted network snapshot. The engine does not infer physical reachability or attempt activation.',
      evidence: unique([`${iface.name}=DOWN`, ...iface.addresses.map((address) => `address=${address}`), iface.gateway ? `gateway=${iface.gateway}` : null]),
      suggestedCommands: [`nmcli device show ${shellQuote(iface.name)}`, `ip address show dev ${shellQuote(iface.name)}`, 'ip route'],
      remediationGuidance: [
        'Confirm whether the interface should be active for this host role.',
        'Inspect the NetworkManager connection profile, addressing, routes, and link state.',
        'Only activate or modify the connection after validating the intended network configuration.',
      ],
      relatedUnit: null,
      relatedPath: null,
      relatedInterface: iface.name,
      interpretation: 'RECORDED_STATE_DIAGNOSTIC',
    });
  }

  const genericSevereLogs = host.logs.filter((entry) =>
    !recordedAvcLogs(host).some((line) => line.includes(entry.message)) &&
    (priorityRank(entry.priority) >= 2 || /\b(error|failed|failure|critical|panic|timeout|no space left|read-only file system)\b/i.test(entry.message)) &&
    !host.services.some((service) => relatedServiceLogs(host, service.unit).some((line) => line.includes(entry.message))),
  );
  if (genericSevereLogs.length) {
    findings.push({
      id: 'logs:warning-error-signals',
      category: 'LOG',
      severity: 'WARN',
      title: 'Recorded warning/error log signals',
      summary: 'The recorded log extract contains warning/error text that is not already tied to a service or SELinux finding.',
      evidence: genericSevereLogs.slice(0, 5).map((entry) => `${entry.source}${entry.priority ? ` [${entry.priority}]` : ''}: ${entry.message}`),
      suggestedCommands: ['journalctl -b -p warning..alert --no-pager', 'journalctl -b --no-pager'],
      remediationGuidance: [
        'Correlate timestamps and source units before deciding on a remediation.',
        'Inspect the owning service/configuration rather than treating log text as proof of root cause.',
        'Re-run the relevant verification after an intentional change.',
      ],
      relatedUnit: null,
      relatedPath: null,
      relatedInterface: null,
      interpretation: 'RECORDED_STATE_DIAGNOSTIC',
    });
  }

  return findings.sort((left, right) => findingRank(right.severity) - findingRank(left.severity) || left.id.localeCompare(right.id));
}

function overallStatus(checks: LinuxHealthCheck[]): LinuxOperationsSnapshot['overallStatus'] {
  if (checks.some((check) => check.status === 'FAIL')) return 'CRITICAL';
  if (checks.some((check) => check.status === 'WARN')) return 'DEGRADED';
  if (checks.some((check) => check.status === 'UNKNOWN')) return 'UNKNOWN';
  if (checks.length > 0 && checks.every((check) => check.status === 'PASS')) return 'HEALTHY';
  return 'UNKNOWN';
}

function scenarioReadiness(state: LinuxLabState): LinuxScenarioReadiness[] {
  return state.scenarios.map((scenario) => ({
    id: scenario.id,
    slug: scenario.slug,
    title: scenario.title,
    summary: scenario.summary,
    enabled: scenario.isEnabled,
    observableSignals: scenarioSignals(scenario.expectedObservations),
    executionAvailable: false,
  }));
}

export class LinuxOperationsService {
  constructor(private readonly linux: LinuxService) {}

  async getOperations(identifier: string, hostKey?: string): Promise<LinuxOperationsSnapshot> {
    const state = await this.linux.getPublic(identifier);
    const host = hostKey
      ? state.hosts.find((entry) => entry.key === hostKey)
      : state.hosts[0];
    if (!host) throw new NotFoundError(hostKey ? 'Linux host not found' : 'Linux Lab has no normalized hosts');

    const healthChecks = buildHealthChecks(state, host)
      .sort((left, right) => healthRank(right.status) - healthRank(left.status) || left.id.localeCompare(right.id));
    const findings = buildFindings(host);
    const badMounts = problemMounts(host).length + problemLogicalVolumes(host).length;

    return {
      schemaVersion: 'linux.operations.v1',
      labId: state.lab.id,
      labSlug: state.lab.slug,
      hostKey: host.key,
      hostname: host.hostname,
      overallStatus: overallStatus(healthChecks),
      healthChecks,
      findings,
      scenarioReadiness: scenarioReadiness(state),
      counts: {
        services: host.services.length,
        failedServices: host.services.filter((entry) => entry.activeState === 'FAILED').length,
        mounts: host.mounts.length,
        problemMounts: badMounts,
        interfaces: host.interfaces.length,
        downInterfaces: host.interfaces.filter((entry) => entry.state === 'DOWN').length,
        recordedLogs: host.logs.length,
        findings: findings.length,
      },
      executionAvailable: false,
      note: 'Diagnostics are derived from persisted normalized/recorded Lab state. Suggested commands are guidance only; this endpoint does not execute shell commands, mutate host state, or claim live telemetry.',
    };
  }

  async getContext(identifier: string, hostKey?: string): Promise<LinuxOperatorContext> {
    const state = await this.linux.getPublic(identifier);
    const host = hostKey ? state.hosts.find((entry) => entry.key === hostKey) : null;
    if (hostKey && !host) throw new NotFoundError('Linux host not found');

    const contextId = host
      ? `RHEL/${contextSegment(host.hostname || host.key)}`
      : `RHEL/${contextSegment(state.lab.slug)}`;

    return {
      contextId,
      prompt: `${contextId}>`,
      scope: host ? 'HOST' : 'LAB',
      lab: { id: state.lab.id, slug: state.lab.slug, title: state.lab.title },
      host: host ? { key: host.key, hostname: host.hostname, osVersion: host.osVersion } : null,
      availableInspectors: ['host', 'services', 'storage', 'fstab', 'selinux', 'network', 'logs', 'configurations', 'verification', 'health', 'scenarios', 'evidence'],
      executionAvailable: false,
      note: 'This durable RHEL operator-context contract is consumed by the Phase 6 unified recorded-state CLI. The operations API itself does not execute arbitrary shell commands.',
    };
  }
}
