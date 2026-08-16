import { ApplicationError, NotFoundError, ValidationError } from '../../lib/errors.js';
import type {
  UnifiedCliBootstrap,
  UnifiedCliContext,
  UnifiedCliContextSummary,
  UnifiedCliDomain,
  UnifiedCliExecutionResult,
  UnifiedCliOutputType,
} from '../../types/cli.js';
import type { DevOpsLabState } from '../../types/devops.js';
import type { LinuxHostState, LinuxLabState } from '../../types/linux.js';
import type { NetworkingDeviceState, NetworkingLabState } from '../../types/networking.js';
import type { DevOpsOperationsService } from '../devops/devops-operations.service.js';
import type { DevOpsService } from '../devops/devops.service.js';
import type { LinuxOperationsService } from '../linux/linux-operations.service.js';
import type { LinuxService } from '../linux/linux.service.js';
import type { NetworkingOperationsService } from '../networking/networking-operations.service.js';
import type { NetworkingService } from '../networking/networking.service.js';
import type { ScenarioEngineService } from '../scenarios/scenario-engine.service.js';

const ROOT_CONTEXT: UnifiedCliContext = {
  contextId: 'PORTFOLIO',
  prompt: 'PORTFOLIO>',
  domain: 'PORTFOLIO',
  scope: 'ROOT',
  lab: null,
  target: null,
  availableInspectors: ['contexts'],
  executionMode: 'RECORDED_STATE',
  mutable: false,
  note: 'Select a persisted Lab context with `ctx list` and `ctx use <context-id>`. The CLI reads recorded portfolio state only.',
};

const GLOBAL_HINTS = [
  'help',
  'ctx',
  'ctx list',
  'ctx targets',
  'ctx lab',
  'inspect',
  'show health',
  'scenario list',
  'scenario status',
  'scenario run <slug>',
  'scenario verify',
  'scenario remediate',
  'scenario reset',
  'evidence',
  'clear',
];

function contextSegment(value: string): string {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || 'LAB';
}

function normalizeDomain(value?: string | null): UnifiedCliDomain {
  const normalized = (value ?? '').trim().toLowerCase();
  if (!normalized) return 'PORTFOLIO';
  if (normalized.includes('network') || normalized === 'netops') return 'NETWORKING';
  if (normalized.includes('linux') || normalized === 'rhel') return 'LINUX';
  if (normalized.includes('devops') || normalized === 'gitops') return 'DEVOPS';
  return 'PORTFOLIO';
}

function display(value: unknown, fallback = '-'): string {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function renderTable(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const values = rows.map((row) => row.map((value) => display(value)));
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...values.map((row) => (row[index] ?? '').length)),
  );
  const line = (row: string[]) => row.map((cell, index) => cell.padEnd(widths[index] ?? 0)).join('  ');
  const separator = widths.map((width) => '-'.repeat(width)).join('  ');
  return [line(headers), separator, ...values.map(line)].join('\n');
}

function renderList(values: string[], empty: string): string {
  return values.length ? values.map((value) => `- ${value}`).join('\n') : empty;
}

function splitCommand(command: string): string[] {
  const parts: string[] = [];
  let token = '';
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < command.length; i += 1) {
    const char = command[i]!;
    if (quote) {
      if (char === quote) quote = null;
      else token += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (token) {
        parts.push(token);
        token = '';
      }
      continue;
    }
    token += char;
  }
  if (token) parts.push(token);
  return parts;
}

function scenarioSignals(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const record = value as Record<string, unknown>;
  const raw = record.observableSignals;
  return Array.isArray(raw) ? raw.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0) : [];
}

export class UnifiedCliService {
  constructor(
    private readonly networking: NetworkingService,
    private readonly networkingOperations: NetworkingOperationsService,
    private readonly linux: LinuxService,
    private readonly linuxOperations: LinuxOperationsService,
    private readonly devOps: DevOpsService,
    private readonly devOpsOperations: DevOpsOperationsService,
    private readonly scenarios: ScenarioEngineService,
  ) {}

  async bootstrap(category?: string, sessionKey?: string): Promise<UnifiedCliBootstrap> {
    const domain = normalizeDomain(category);
    const contexts = await this.listLabContexts();
    const first = domain === 'PORTFOLIO' ? null : contexts.find((entry) => entry.domain === domain) ?? null;
    const context = first ? await this.resolveContext(first.contextId, sessionKey) : ROOT_CONTEXT;
    return {
      schemaVersion: 'cli.v1',
      context,
      contexts,
      commandHints: this.commandHints(context),
      note: 'Unified CLI v1 reads canonical recorded Lab state plus an optional session-scoped scenario overlay. It never spawns a shell, network tool, kubectl, Terraform, or provider CLI.',
    };
  }

  async execute(command: string, contextId?: string, category?: string, sessionKey?: string): Promise<UnifiedCliExecutionResult> {
    const raw = command.trim();
    const current = contextId?.trim()
      ? await this.resolveContext(contextId, sessionKey)
      : (await this.bootstrap(category, sessionKey)).context;

    if (!raw) return this.result(raw, '', 0, 'stdout', current);

    try {
      const parts = splitCommand(raw);
      const root = (parts[0] ?? '').toLowerCase();
      const args = parts.slice(1);

      if (root === 'clear') return this.result(raw, '', 0, 'system', current, false, true);
      if (root === 'help' || root === '?') return this.result(raw, this.help(current), 0, 'banner', current);
      if (root === 'ctx') return await this.handleContextCommand(raw, args, current, sessionKey);
      if (root === 'whoami') {
        return this.result(raw, 'portfolio-visitor (recorded-state CLI; shell access disabled)', 0, 'stdout', current);
      }
      if (root === 'scenario') return await this.handleScenarioCommand(raw, args, current, sessionKey);
      if (root === 'evidence') return await this.handleEvidence(raw, current, sessionKey);
      if (root === 'inspect') return await this.handleInspect(raw, args, current, sessionKey);
      if (root === 'show') return await this.handleShow(raw, args, current, sessionKey);
      if (root === 'trace') return await this.handleTrace(raw, args, current, sessionKey);
      if (root === 'route') return await this.handleRoute(raw, args, current, sessionKey);

      const alias = await this.handleRecordedStateAlias(raw, root, args, current, sessionKey);
      if (alias) return alias;

      return this.result(
        raw,
        `Unknown CLI command: ${parts[0] ?? raw}\nUse \`help\` for commands available in ${current.contextId}.`,
        127,
        'stderr',
        current,
      );
    } catch (error) {
      if (error instanceof ApplicationError && ['VALIDATION_ERROR', 'NOT_FOUND', 'CONFLICT'].includes(error.code)) {
        return this.result(raw, error.message, 2, 'stderr', current);
      }
      throw error;
    }
  }

  private result(
    command: string,
    output: string,
    exitCode: number,
    type: UnifiedCliOutputType,
    context: UnifiedCliContext,
    contextChanged = false,
    clear = false,
  ): UnifiedCliExecutionResult {
    return {
      schemaVersion: 'cli.v1',
      command,
      output,
      exitCode,
      type,
      context,
      contextChanged,
      clear,
      note: 'Output is derived from canonical recorded Lab state, an optional session-scoped scenario overlay, or explicit CLI metadata. No host/provider command was executed.',
    };
  }

  private async listLabContexts(): Promise<UnifiedCliContextSummary[]> {
    const [networkingLabs, linuxLabs, devOpsLabs] = await Promise.all([
      this.networking.listPublic(),
      this.linux.listPublic(),
      this.devOps.listPublic(),
    ]);

    return [
      ...networkingLabs.map((lab) => ({
        contextId: `NETOPS/${contextSegment(lab.slug)}`,
        prompt: `NETOPS/${contextSegment(lab.slug)}>`,
        domain: 'NETWORKING' as const,
        labTitle: lab.title,
        projectTitle: lab.project.title,
      })),
      ...linuxLabs.map((lab) => ({
        contextId: `RHEL/${contextSegment(lab.slug)}`,
        prompt: `RHEL/${contextSegment(lab.slug)}>`,
        domain: 'LINUX' as const,
        labTitle: lab.title,
        projectTitle: lab.project.title,
      })),
      ...devOpsLabs.map((lab) => ({
        contextId: `GITOPS/${contextSegment(lab.slug)}`,
        prompt: `GITOPS/${contextSegment(lab.slug)}>`,
        domain: 'DEVOPS' as const,
        labTitle: lab.title,
        projectTitle: lab.project.title,
      })),
    ].sort((a, b) => a.domain.localeCompare(b.domain) || a.labTitle.localeCompare(b.labTitle));
  }

  private async resolveContext(contextId: string, sessionKey?: string): Promise<UnifiedCliContext> {
    const normalized = contextId.trim();
    if (!normalized || normalized.toUpperCase() === 'PORTFOLIO') return ROOT_CONTEXT;

    const segments = normalized.split('/').filter(Boolean);
    const prefix = (segments[0] ?? '').toUpperCase();
    const labSegment = segments[1];
    const targetSegment = segments[2];
    if (!labSegment) throw new ValidationError('Context must include a Lab segment');

    if (prefix === 'NETOPS') {
      const labs = await this.networking.listPublic();
      const lab = labs.find((entry) => this.matchesSegment(entry.id, entry.slug, labSegment));
      if (!lab) throw new NotFoundError('Networking CLI Lab context not found');
      const state = await this.networking.getPublic(lab.id, sessionKey);
      const target = targetSegment
        ? state.devices.find((entry) => this.matchesSegment(entry.key, entry.label, targetSegment))
        : undefined;
      if (targetSegment && !target) throw new NotFoundError('Networking CLI device context not found');
      return this.withScenarioRuntime(this.fromNetworkingContext(await this.networkingOperations.getContext(lab.id, target?.key, sessionKey)), sessionKey);
    }

    if (prefix === 'RHEL') {
      const labs = await this.linux.listPublic();
      const lab = labs.find((entry) => this.matchesSegment(entry.id, entry.slug, labSegment));
      if (!lab) throw new NotFoundError('Linux CLI Lab context not found');
      const state = await this.linux.getPublic(lab.id, sessionKey);
      const target = targetSegment
        ? state.hosts.find((entry) => this.matchesSegment(entry.key, entry.hostname, targetSegment))
        : undefined;
      if (targetSegment && !target) throw new NotFoundError('Linux CLI host context not found');
      return this.withScenarioRuntime(this.fromLinuxContext(await this.linuxOperations.getContext(lab.id, target?.key, sessionKey)), sessionKey);
    }

    if (prefix === 'GITOPS') {
      const labs = await this.devOps.listPublic();
      const lab = labs.find((entry) => this.matchesSegment(entry.id, entry.slug, labSegment));
      if (!lab) throw new NotFoundError('DevOps CLI Lab context not found');
      const state = await this.devOps.getPublic(lab.id, sessionKey);
      const target = targetSegment
        ? state.pipelines.find((entry) => this.matchesSegment(entry.id, entry.name, targetSegment))
        : undefined;
      if (targetSegment && !target) throw new NotFoundError('DevOps CLI pipeline context not found');
      return this.withScenarioRuntime(this.fromDevOpsContext(await this.devOpsOperations.getContext(lab.id, target?.id, sessionKey)), sessionKey);
    }

    throw new ValidationError('Unknown context prefix. Use PORTFOLIO, NETOPS, RHEL, or GITOPS.');
  }

  private async withScenarioRuntime(context: UnifiedCliContext, sessionKey?: string): Promise<UnifiedCliContext> {
    if (!context.lab || !sessionKey) return context;
    const active = await this.scenarios.hasActiveRuntime(context.lab.id, sessionKey);
    return {
      ...context,
      executionMode: active ? 'SCENARIO_RUNTIME' : 'RECORDED_STATE',
      mutable: true,
      note: active
        ? 'A session-scoped scenario overlay is active. Reads are synchronized to that simulated state; no external infrastructure command is executed.'
        : context.note,
    };
  }

  private matchesSegment(id: string, label: string, segment: string): boolean {
    const candidate = contextSegment(segment);
    return contextSegment(id) === candidate || contextSegment(label) === candidate;
  }

  private fromNetworkingContext(context: Awaited<ReturnType<NetworkingOperationsService['getContext']>>): UnifiedCliContext {
    const contextId = context.device
      ? `NETOPS/${contextSegment(context.lab.slug)}/${contextSegment(context.device.key)}`
      : `NETOPS/${contextSegment(context.lab.slug)}`;
    return {
      contextId,
      prompt: `${contextId}>`,
      domain: 'NETWORKING',
      scope: context.scope === 'DEVICE' ? 'DEVICE' : 'LAB',
      lab: context.lab,
      target: context.device
        ? { kind: 'DEVICE', key: context.device.key, label: context.device.label, status: null }
        : null,
      availableInspectors: [...context.availableInspectors],
      executionMode: 'RECORDED_STATE',
      mutable: true,
      note: 'NETOPS CLI reads persisted networking.v1 and networking.operations.v1 state. It does not execute IOS commands or send packets.',
    };
  }

  private fromLinuxContext(context: Awaited<ReturnType<LinuxOperationsService['getContext']>>): UnifiedCliContext {
    const contextId = context.host
      ? `RHEL/${contextSegment(context.lab.slug)}/${contextSegment(context.host.key)}`
      : `RHEL/${contextSegment(context.lab.slug)}`;
    return {
      contextId,
      prompt: `${contextId}>`,
      domain: 'LINUX',
      scope: context.scope === 'HOST' ? 'HOST' : 'LAB',
      lab: context.lab,
      target: context.host
        ? { kind: 'HOST', key: context.host.key, label: context.host.hostname, status: context.host.osVersion }
        : null,
      availableInspectors: [...context.availableInspectors],
      executionMode: 'RECORDED_STATE',
      mutable: true,
      note: 'RHEL CLI reads persisted linux.v1 and linux.operations.v1 state. It does not spawn a shell or modify the host.',
    };
  }

  private fromDevOpsContext(context: Awaited<ReturnType<DevOpsOperationsService['getContext']>>): UnifiedCliContext {
    const contextId = context.pipeline
      ? `GITOPS/${contextSegment(context.lab.slug)}/${contextSegment(context.pipeline.id)}`
      : `GITOPS/${contextSegment(context.lab.slug)}`;
    return {
      contextId,
      prompt: `${contextId}>`,
      domain: 'DEVOPS',
      scope: context.scope === 'PIPELINE' ? 'PIPELINE' : 'LAB',
      lab: context.lab,
      target: context.pipeline
        ? { kind: 'PIPELINE', key: context.pipeline.id, label: context.pipeline.name, status: context.pipeline.status }
        : null,
      availableInspectors: [...context.availableInspectors],
      executionMode: 'RECORDED_STATE',
      mutable: true,
      note: 'GITOPS CLI reads persisted devops.v1 and devops.operations.v1 state. It does not execute CI/CD, Terraform, kubectl, Helm, or ArgoCD commands.',
    };
  }

  private commandHints(context: UnifiedCliContext): string[] {
    if (context.domain === 'NETWORKING') {
      return [...GLOBAL_HINTS, 'show topology', 'show device', 'show interfaces', 'show routes', 'show bgp', 'show ospf', 'show gateway', 'show vlans', 'show acls', 'trace <source> <target>', 'route <destination>'];
    }
    if (context.domain === 'LINUX') {
      return [...GLOBAL_HINTS, 'show host', 'show services', 'show storage', 'show fstab', 'show selinux', 'show network', 'show logs', 'show configurations', 'show verification'];
    }
    if (context.domain === 'DEVOPS') {
      return [...GLOBAL_HINTS, 'show repository', 'show pipelines', 'show terraform', 'show kubernetes', 'show gitops', 'show helm', 'show network-policy', 'show observability'];
    }
    return GLOBAL_HINTS;
  }

  private help(context: UnifiedCliContext): string {
    const global = `Unified Infrastructure CLI — recorded-state + session simulation mode\n\nGlobal commands\n  help                         Show context-aware help\n  ctx                          Show current context\n  ctx list [domain]            List public Lab contexts\n  ctx use <context-id>         Switch context\n  ctx targets                  List devices/hosts/pipelines in current Lab\n  ctx target <key>             Select a device/host/pipeline\n  ctx lab                      Return to Lab scope\n  ctx root                     Return to PORTFOLIO\n  inspect [area]               Inspect current context or delegate to show\n  show <area>                  Read normalized recorded state\n  show health                  Read domain operations health\n  scenario list                List runnable scenario definitions\n  scenario status              Show current session scenario runtime\n  scenario run <slug>          Apply the scenario to this browser session\n  scenario verify              Verify active scenario or recovery state\n  scenario remediate           Disable the scenario overlay and restore baseline\n  scenario reset               Delete the session runtime\n  evidence                     List public Lab evidence\n  clear                        Clear the browser transcript\n\nSafety boundary: scenario commands mutate only the persisted session runtime overlay. No shell, SSH, IOS, kubectl, Terraform, Helm, ArgoCD, cloud, or external infrastructure command is executed.`;
    if (context.domain === 'NETWORKING') return `${global}\n\nNETOPS areas\n  topology | device | interfaces | routes | bgp | ospf | gateway | vlans | acls | health\n  trace <source-device> <target-device> [protocol]\n  route <destination-ip> [device-key]`;
    if (context.domain === 'LINUX') return `${global}\n\nRHEL areas\n  host | services | storage | fstab | selinux | network | logs | configurations | verification | health\nLegacy read aliases such as \`sestatus\`, \`lsblk\`, \`ip route\`, and \`systemctl status <unit>\` resolve to recorded state; mutating systemctl operations are blocked.`;
    if (context.domain === 'DEVOPS') return `${global}\n\nGITOPS areas\n  repository | pipelines | terraform | kubernetes | gitops | helm | network-policy | observability | health\nLegacy read aliases such as \`kubectl get pods\`, \`terraform plan\`, \`argocd app list\`, and \`helm list\` resolve to recorded state only.`;
    return `${global}\n\nStart with \`ctx list\`, then \`ctx use <context-id>\`.`;
  }

  private async handleContextCommand(raw: string, args: string[], current: UnifiedCliContext, sessionKey?: string): Promise<UnifiedCliExecutionResult> {
    const action = (args[0] ?? '').toLowerCase();
    if (!action) return this.result(raw, this.describeContext(current), 0, 'system', current);

    if (action === 'list') {
      const requestedDomain = normalizeDomain(args[1]);
      const contexts = (await this.listLabContexts()).filter((entry) => requestedDomain === 'PORTFOLIO' || entry.domain === requestedDomain);
      const output = contexts.length
        ? renderTable(['CONTEXT', 'DOMAIN', 'LAB', 'PROJECT'], contexts.map((entry) => [entry.contextId, entry.domain, entry.labTitle, entry.projectTitle]))
        : 'No public Lab contexts are available for that domain.';
      return this.result(raw, output, 0, 'table', current);
    }

    if (action === 'root') return this.result(raw, 'Context changed to PORTFOLIO.', 0, 'system', ROOT_CONTEXT, true);

    if (action === 'lab') {
      if (!current.lab) return this.result(raw, 'Already at PORTFOLIO scope.', 0, 'system', current);
      const prefix = current.domain === 'NETWORKING' ? 'NETOPS' : current.domain === 'LINUX' ? 'RHEL' : 'GITOPS';
      const next = await this.resolveContext(`${prefix}/${contextSegment(current.lab.slug)}`, sessionKey);
      return this.result(raw, `Context changed to ${next.contextId}.`, 0, 'system', next, next.contextId !== current.contextId);
    }

    if (action === 'targets') return this.handleContextTargets(raw, current, sessionKey);

    if (action === 'target') {
      const key = args[1];
      if (!key) throw new ValidationError('Usage: ctx target <device|host|pipeline-key>');
      if (!current.lab) throw new ValidationError('Select a Lab context before selecting a target');
      const prefix = current.domain === 'NETWORKING' ? 'NETOPS' : current.domain === 'LINUX' ? 'RHEL' : current.domain === 'DEVOPS' ? 'GITOPS' : null;
      if (!prefix) throw new ValidationError('PORTFOLIO has no target selector');
      const next = await this.resolveContext(`${prefix}/${contextSegment(current.lab.slug)}/${contextSegment(key)}`, sessionKey);
      return this.result(raw, `Context changed to ${next.contextId}.`, 0, 'system', next, next.contextId !== current.contextId);
    }

    if (action === 'use') {
      const requested = args.slice(1).join(' ');
      if (!requested) throw new ValidationError('Usage: ctx use <context-id>');
      const next = await this.resolveContext(requested, sessionKey);
      return this.result(raw, `Context changed to ${next.contextId}.`, 0, 'system', next, next.contextId !== current.contextId);
    }

    const prefixMap: Record<string, string> = { networking: 'NETOPS', netops: 'NETOPS', linux: 'RHEL', rhel: 'RHEL', devops: 'GITOPS', gitops: 'GITOPS' };
    const prefix = prefixMap[action];
    if (prefix) {
      const lab = args[1];
      if (!lab) throw new ValidationError(`Usage: ctx ${action} <lab> [target]`);
      const requested = [prefix, contextSegment(lab), args[2] ? contextSegment(args[2]) : null].filter(Boolean).join('/');
      const next = await this.resolveContext(requested, sessionKey);
      return this.result(raw, `Context changed to ${next.contextId}.`, 0, 'system', next, next.contextId !== current.contextId);
    }

    const next = await this.resolveContext(args.join(' '));
    return this.result(raw, `Context changed to ${next.contextId}.`, 0, 'system', next, next.contextId !== current.contextId);
  }

  private describeContext(context: UnifiedCliContext): string {
    if (!context.lab) return `${context.prompt}\nScope: ROOT\nMode: RECORDED_STATE\n${context.note}`;
    return [
      context.prompt,
      `Domain: ${context.domain}`,
      `Scope: ${context.scope}`,
      `Lab: ${context.lab.title} (${context.lab.slug})`,
      context.target ? `Target: ${context.target.label} [${context.target.key}]${context.target.status ? ` — ${context.target.status}` : ''}` : 'Target: Lab scope',
      `Inspectors: ${context.availableInspectors.join(', ')}`,
      `Mode: ${context.executionMode}`,
      'Scenario mutation: session-scoped simulation enabled; canonical Lab state is read-only',
      context.note,
    ].join('\n');
  }

  private async handleContextTargets(raw: string, current: UnifiedCliContext, sessionKey?: string): Promise<UnifiedCliExecutionResult> {
    if (!current.lab) throw new ValidationError('Select a Lab context before listing targets');
    if (current.domain === 'NETWORKING') {
      const state = await this.networking.getPublic(current.lab.id, sessionKey);
      return this.result(raw, renderTable(['KEY', 'DEVICE', 'KIND', 'STATUS'], state.devices.map((entry) => [entry.key, entry.label, entry.kind, entry.status])), 0, 'table', current);
    }
    if (current.domain === 'LINUX') {
      const state = await this.linux.getPublic(current.lab.id, sessionKey);
      return this.result(raw, renderTable(['KEY', 'HOSTNAME', 'OS', 'STATUS'], state.hosts.map((entry) => [entry.key, entry.hostname, [entry.osName, entry.osVersion].filter(Boolean).join(' '), entry.status])), 0, 'table', current);
    }
    if (current.domain === 'DEVOPS') {
      const state = await this.devOps.getPublic(current.lab.id, sessionKey);
      return this.result(raw, state.pipelines.length ? renderTable(['ID', 'PIPELINE', 'STATUS', 'FRAMEWORK'], state.pipelines.map((entry) => [entry.id, entry.name, entry.status, entry.framework])) : 'No pipelines are recorded in this Lab.', 0, 'table', current);
    }
    throw new ValidationError('PORTFOLIO has no target list');
  }

  private async handleInspect(raw: string, args: string[], current: UnifiedCliContext, sessionKey?: string): Promise<UnifiedCliExecutionResult> {
    if (args[0]) return this.handleShow(raw, args, current, sessionKey);
    if (!current.lab) return this.result(raw, this.describeContext(current), 0, 'system', current);

    if (current.domain === 'NETWORKING') {
      const state = await this.networking.getPublic(current.lab.id, sessionKey);
      const selected = current.target ? state.devices.find((entry) => entry.key === current.target?.key) : null;
      const output = selected ? this.describeNetworkDevice(selected) : [
        `Lab: ${state.lab.title}`,
        `Project: ${state.project.title}`,
        `Devices: ${state.devices.length}`,
        `Links: ${state.links.length}`,
        `Routes: ${state.routingTable.length}`,
        `VLANs: ${state.vlans.length}`,
        `ACL rules: ${state.aclRules.length}`,
        `Recorded inputs: ${state.inputs.map((entry) => entry.inputType).join(', ') || 'none'}`,
      ].join('\n');
      return this.result(raw, output, 0, 'stdout', current);
    }

    if (current.domain === 'LINUX') {
      const state = await this.linux.getPublic(current.lab.id, sessionKey);
      const selected = current.target ? state.hosts.find((entry) => entry.key === current.target?.key) : null;
      const output = selected ? this.describeLinuxHost(selected) : [
        `Lab: ${state.lab.title}`,
        `Project: ${state.project.title}`,
        `Hosts: ${state.hosts.length}`,
        `Recorded inputs: ${state.inputs.map((entry) => entry.inputType).join(', ') || 'none'}`,
        `Evidence records: ${state.evidence.length}`,
        `Scenario definitions: ${state.scenarios.length}`,
      ].join('\n');
      return this.result(raw, output, 0, 'stdout', current);
    }

    if (current.domain === 'DEVOPS') {
      const state = await this.devOps.getPublic(current.lab.id, sessionKey);
      const pipeline = current.target ? state.pipelines.find((entry) => entry.id === current.target?.key) : null;
      const output = pipeline ? this.describePipeline(pipeline) : [
        `Lab: ${state.lab.title}`,
        `Project: ${state.project.title}`,
        `Repository: ${state.repository?.name ?? 'not recorded'}`,
        `Pipelines: ${state.pipelines.length}`,
        `Terraform: ${state.terraform?.present ? 'represented' : 'not represented'}`,
        `Kubernetes workloads: ${state.kubernetes.workloads.length}`,
        `GitOps applications: ${state.gitops.length}`,
        `Helm releases: ${state.helm.length}`,
        `Network policies: ${state.networkPolicies.length}`,
        `Observability records: ${state.observability.length}`,
      ].join('\n');
      return this.result(raw, output, 0, 'stdout', current);
    }

    return this.result(raw, this.describeContext(current), 0, 'system', current);
  }

  private async handleShow(raw: string, args: string[], current: UnifiedCliContext, sessionKey?: string): Promise<UnifiedCliExecutionResult> {
    const area = (args[0] ?? '').toLowerCase();
    if (!area) throw new ValidationError('Usage: show <area>. Run `help` for available areas.');
    if (!current.lab) throw new ValidationError('Select a Lab context with `ctx list` and `ctx use <context-id>`');

    if (current.domain === 'NETWORKING') return this.showNetworking(raw, area, args.slice(1), current, sessionKey);
    if (current.domain === 'LINUX') return this.showLinux(raw, area, args.slice(1), current, sessionKey);
    if (current.domain === 'DEVOPS') return this.showDevOps(raw, area, args.slice(1), current, sessionKey);
    throw new ValidationError('PORTFOLIO has no domain state. Select a Lab context first.');
  }

  private async showNetworking(raw: string, area: string, args: string[], current: UnifiedCliContext, sessionKey?: string): Promise<UnifiedCliExecutionResult> {
    const state = await this.networking.getPublic(current.lab!.id, sessionKey);
    const deviceKey = args[0] ?? (current.target?.kind === 'DEVICE' ? current.target.key : undefined);
    const device = deviceKey ? state.devices.find((entry) => this.matchesSegment(entry.key, entry.label, deviceKey)) : undefined;

    if (['topology', 'devices'].includes(area)) {
      const devices = renderTable(['KEY', 'DEVICE', 'KIND', 'STATUS', 'MGMT'], state.devices.map((entry) => [entry.key, entry.label, entry.kind, entry.status, entry.managementAddress]));
      const links = renderTable(['LINK', 'SOURCE', 'TARGET', 'STATUS', 'PROTOCOLS'], state.links.map((entry) => [entry.key, entry.sourceDeviceKey, entry.targetDeviceKey, entry.status, entry.protocols.join(',') || entry.kind]));
      return this.result(raw, `DEVICES\n${devices}\n\nLINKS\n${links}`, 0, 'table', current);
    }
    if (area === 'device') {
      if (!device) {
        if (deviceKey) throw new NotFoundError('Networking device not found');
        return this.result(raw, renderTable(['KEY', 'DEVICE', 'KIND', 'STATUS'], state.devices.map((entry) => [entry.key, entry.label, entry.kind, entry.status])), 0, 'table', current);
      }
      return this.result(raw, this.describeNetworkDevice(device), 0, 'stdout', current);
    }
    if (area === 'interfaces') {
      if (deviceKey && !device) throw new NotFoundError('Networking device not found');
      const targets = device ? [device] : state.devices;
      const rows = targets.flatMap((entry) => entry.interfaces.map((iface) => [entry.key, iface.name, iface.address, iface.status, iface.vlan, iface.description]));
      return this.result(raw, rows.length ? renderTable(['DEVICE', 'INTERFACE', 'ADDRESS', 'STATUS', 'VLAN', 'DESCRIPTION'], rows) : 'No interfaces are recorded for this selection.', 0, 'table', current);
    }
    if (area === 'routes') {
      if (deviceKey && !device) throw new NotFoundError('Networking device not found');
      const routes = device ? state.routingTable.filter((entry) => entry.deviceKey === device.key) : state.routingTable;
      return this.result(raw, routes.length ? renderTable(['DEVICE', 'NETWORK', 'NEXT-HOP', 'INTERFACE', 'PROTOCOL', 'AD/METRIC'], routes.map((entry) => [entry.deviceKey, entry.network, entry.nextHop, entry.interface, entry.protocolName || entry.protocol, [entry.administrativeDistance, entry.metric].filter((value) => value !== null).join('/')])) : 'No recorded routes match this selection.', 0, 'table', current);
    }
    if (area === 'bgp') {
      const ops = await this.networkingOperations.getOperations(current.lab!.id, sessionKey);
      const neighbors = device ? ops.bgpNeighbors.filter((entry) => entry.deviceKey === device.key) : ops.bgpNeighbors;
      return this.result(raw, neighbors.length ? renderTable(['DEVICE', 'PEER', 'REMOTE-AS', 'TYPE', 'STATE', 'HEALTH', 'PREFIXES'], neighbors.map((entry) => [entry.deviceKey, entry.peerAddress, entry.remoteAs, entry.sessionType, entry.state, entry.health, entry.prefixesReceived])) : 'No BGP neighbor state is recorded for this selection.', 0, 'table', current);
    }
    if (area === 'ospf') {
      const ops = await this.networkingOperations.getOperations(current.lab!.id, sessionKey);
      const neighbors = device ? ops.ospfNeighbors.filter((entry) => entry.deviceKey === device.key) : ops.ospfNeighbors;
      return this.result(raw, neighbors.length ? renderTable(['DEVICE', 'NEIGHBOR', 'ADDRESS', 'INTERFACE', 'AREA', 'STATE', 'HEALTH'], neighbors.map((entry) => [entry.deviceKey, entry.neighborId, entry.neighborAddress, entry.interface, entry.area, entry.state, entry.health])) : 'No OSPF neighbor state is recorded for this selection.', 0, 'table', current);
    }
    if (['gateway', 'hsrp'].includes(area)) {
      const ops = await this.networkingOperations.getOperations(current.lab!.id, sessionKey);
      const rows = ops.gatewayRedundancy.flatMap((group) => group.members
        .filter((member) => !device || member.deviceKey === device.key)
        .map((member) => [group.protocol, group.group, group.virtualIp, member.deviceKey, member.role, member.priority, member.status, group.health]));
      return this.result(raw, rows.length ? renderTable(['PROTOCOL', 'GROUP', 'VIRTUAL-IP', 'DEVICE', 'ROLE', 'PRIORITY', 'STATUS', 'HEALTH'], rows) : 'No gateway redundancy state is recorded.', 0, 'table', current);
    }
    if (['vlans', 'vlan'].includes(area)) {
      return this.result(raw, state.vlans.length ? renderTable(['VLAN', 'NAME', 'STATUS', 'PORTS'], state.vlans.map((entry) => [entry.vlanId, entry.name, entry.status, entry.ports.join(', ')])) : 'No VLAN state is recorded.', 0, 'table', current);
    }
    if (['acls', 'acl'].includes(area)) {
      const rules = device ? state.aclRules.filter((entry) => entry.deviceKey === device.key) : state.aclRules;
      return this.result(raw, rules.length ? renderTable(['SEQ', 'NAME', 'ACTION', 'PROTO', 'SOURCE', 'DESTINATION', 'DEVICE', 'INTERFACE', 'DIR'], rules.map((entry) => [entry.sequence, entry.name, entry.action, entry.protocol, entry.source, entry.destination, entry.deviceKey, entry.interface, entry.direction])) : 'No structured ACL rules are recorded for this selection.', 0, 'table', current);
    }
    if (area === 'health') {
      const ops = await this.networkingOperations.getOperations(current.lab!.id, sessionKey);
      const table = renderTable(['STATUS', 'CATEGORY', 'CHECK', 'SUMMARY'], ops.healthChecks.map((entry) => [entry.status, entry.category, entry.title, entry.summary]));
      return this.result(raw, `Overall: ${ops.overallStatus}\n${table}`, 0, 'table', current);
    }
    throw new ValidationError(`Unknown NETOPS inspector: ${area}`);
  }

  private describeNetworkDevice(device: NetworkingDeviceState): string {
    return [
      `${device.label} [${device.key}]`,
      `Kind: ${device.kind}`,
      `Status: ${device.status}`,
      `Vendor/Model: ${[device.vendor, device.model].filter(Boolean).join(' ') || 'not recorded'}`,
      `Role: ${device.role ?? 'not recorded'}`,
      `Management: ${device.managementAddress ?? 'not recorded'}`,
      `Routing protocols: ${device.routingProtocols.join(', ') || 'none recorded'}`,
      `Interfaces: ${device.interfaces.length}`,
      device.configurationSnippet ? `\nRecorded configuration excerpt:\n${device.configurationSnippet}` : 'Recorded configuration excerpt: none',
    ].join('\n');
  }

  private async showLinux(raw: string, area: string, args: string[], current: UnifiedCliContext, sessionKey?: string): Promise<UnifiedCliExecutionResult> {
    const state = await this.linux.getPublic(current.lab!.id, sessionKey);
    const hostKey = args[0] ?? (current.target?.kind === 'HOST' ? current.target.key : undefined);
    const host = hostKey ? state.hosts.find((entry) => this.matchesSegment(entry.key, entry.hostname, hostKey)) : undefined;
    if (hostKey && !host) throw new NotFoundError('Linux host not found');
    const hosts = host ? [host] : state.hosts;

    if (['host', 'hosts'].includes(area)) {
      if (host) return this.result(raw, this.describeLinuxHost(host), 0, 'stdout', current);
      return this.result(raw, renderTable(['KEY', 'HOSTNAME', 'OS', 'KERNEL', 'STATUS'], hosts.map((entry) => [entry.key, entry.hostname, [entry.osName, entry.osVersion].filter(Boolean).join(' '), entry.kernelVersion, entry.status])), 0, 'table', current);
    }
    if (area === 'services') {
      const rows = hosts.flatMap((entry) => entry.services.map((service) => [entry.key, service.unit, service.activeState, service.subState, service.enabled === null ? 'unknown' : service.enabled ? 'enabled' : 'disabled', service.description]));
      return this.result(raw, rows.length ? renderTable(['HOST', 'UNIT', 'ACTIVE', 'SUB', 'ENABLED', 'DESCRIPTION'], rows) : 'No systemd service state is recorded.', 0, 'table', current);
    }
    if (area === 'storage') {
      const rows = hosts.flatMap((entry) => [
        ...entry.blockDevices.map((device) => [entry.key, 'BLOCK', device.name, device.size, device.filesystem, device.mountPoint, device.state]),
        ...entry.logicalVolumes.map((volume) => [entry.key, 'LV', `${volume.volumeGroup}/${volume.name}`, volume.size, volume.filesystem, volume.mountPoint, volume.state]),
        ...entry.mounts.map((mount) => [entry.key, 'MOUNT', mount.source, '-', mount.filesystem, mount.target, mount.state]),
      ]);
      return this.result(raw, rows.length ? renderTable(['HOST', 'TYPE', 'RESOURCE', 'SIZE', 'FS', 'MOUNT', 'STATE'], rows) : 'No storage state is recorded.', 0, 'table', current);
    }
    if (area === 'fstab') {
      const rows = hosts.flatMap((entry) => entry.fstab.map((record) => [entry.key, record.source, record.target, record.filesystem, record.options.join(','), record.dump, record.pass]));
      return this.result(raw, rows.length ? renderTable(['HOST', 'SOURCE', 'TARGET', 'FS', 'OPTIONS', 'DUMP', 'PASS'], rows) : 'No fstab entries are recorded.', 0, 'table', current);
    }
    if (area === 'selinux') {
      const sections = hosts.map((entry) => {
        const base = [`${entry.hostname}: status=${entry.selinux.status} mode=${entry.selinux.mode} configured=${entry.selinux.configuredMode} policy=${entry.selinux.policy ?? 'not recorded'}`];
        if (entry.selinux.booleans.length) base.push(`Booleans: ${entry.selinux.booleans.map((item) => `${item.name}=${item.enabled ? 'on' : 'off'}`).join(', ')}`);
        if (entry.selinux.ports.length) base.push(`Ports: ${entry.selinux.ports.map((item) => `${item.type}:${item.protocol}:${item.ports}`).join(', ')}`);
        if (entry.selinux.contexts.length) base.push(`Contexts:\n${entry.selinux.contexts.map((item) => `  ${item.path} -> ${item.context}`).join('\n')}`);
        return base.join('\n');
      });
      return this.result(raw, sections.join('\n\n'), 0, 'stdout', current);
    }
    if (area === 'network') {
      const interfaces = hosts.flatMap((entry) => entry.interfaces.map((iface) => [entry.key, iface.name, iface.state, iface.addresses.join(', '), iface.gateway, iface.dns.join(', '), iface.connection]));
      const routes = hosts.flatMap((entry) => entry.routes.map((route) => [entry.key, route.destination, route.gateway, route.interface, route.metric, route.protocol]));
      return this.result(raw, `INTERFACES\n${interfaces.length ? renderTable(['HOST', 'IFACE', 'STATE', 'ADDRESSES', 'GATEWAY', 'DNS', 'CONNECTION'], interfaces) : 'No interfaces recorded.'}\n\nROUTES\n${routes.length ? renderTable(['HOST', 'DESTINATION', 'GATEWAY', 'IFACE', 'METRIC', 'PROTOCOL'], routes) : 'No routes recorded.'}`, 0, 'table', current);
    }
    if (area === 'logs') {
      const rows = hosts.flatMap((entry) => entry.logs.map((log) => [entry.key, log.timestamp, log.priority, log.source, log.message]));
      return this.result(raw, rows.length ? renderTable(['HOST', 'TIMESTAMP', 'PRIORITY', 'SOURCE', 'MESSAGE'], rows) : 'No recorded log extract is available for this selection.', 0, 'table', current);
    }
    if (['configurations', 'configs'].includes(area)) {
      const rows = hosts.flatMap((entry) => entry.configurations.map((config) => [entry.key, config.path, config.format, config.description, config.source]));
      const details = hosts.flatMap((entry) => entry.configurations.map((config) => `\n[${entry.key}] ${config.path}\n${config.content}`)).join('\n');
      return this.result(raw, `${rows.length ? renderTable(['HOST', 'PATH', 'FORMAT', 'DESCRIPTION', 'SOURCE'], rows) : 'No configuration snapshots are recorded.'}${details}`, 0, 'stdout', current);
    }
    if (['verification', 'checks'].includes(area)) {
      const rows = hosts.flatMap((entry) => entry.verificationRecords.map((record) => [entry.key, record.title, record.command, record.recordedObservation, record.source]));
      return this.result(raw, rows.length ? renderTable(['HOST', 'CHECK', 'COMMAND', 'RECORDED OBSERVATION', 'SOURCE'], rows) : 'No recorded verification records are available.', 0, 'table', current);
    }
    if (area === 'health') {
      const selectedHosts = host ? [host] : state.hosts;
      const snapshots = await Promise.all(selectedHosts.map((entry) => this.linuxOperations.getOperations(current.lab!.id, entry.key, sessionKey)));
      const rows = snapshots.flatMap((snapshot) => snapshot.healthChecks.map((check) => [snapshot.hostname, snapshot.overallStatus, check.status, check.category, check.title, check.summary]));
      return this.result(raw, rows.length ? renderTable(['HOST', 'OVERALL', 'STATUS', 'CATEGORY', 'CHECK', 'SUMMARY'], rows) : 'No Linux health checks are available.', 0, 'table', current);
    }
    throw new ValidationError(`Unknown RHEL inspector: ${area}`);
  }

  private describeLinuxHost(host: LinuxHostState): string {
    return [
      `${host.hostname} [${host.key}]`,
      `Status: ${host.status}`,
      `OS: ${[host.osName, host.osVersion].filter(Boolean).join(' ') || 'not recorded'}`,
      `Kernel: ${host.kernelVersion ?? 'not recorded'}`,
      `Architecture: ${host.architecture ?? 'not recorded'}`,
      `Boot target: ${host.bootTarget ?? 'not recorded'}`,
      `FIPS: ${host.fipsMode === null ? 'not recorded' : host.fipsMode ? 'enabled' : 'disabled'}`,
      `Time sync: ${host.timeSynchronization ?? 'not recorded'}`,
      `Services: ${host.services.length}; mounts: ${host.mounts.length}; interfaces: ${host.interfaces.length}; recorded logs: ${host.logs.length}`,
    ].join('\n');
  }

  private async showDevOps(raw: string, area: string, args: string[], current: UnifiedCliContext, sessionKey?: string): Promise<UnifiedCliExecutionResult> {
    const state = await this.devOps.getPublic(current.lab!.id, sessionKey);
    const pipelineId = args[0] ?? (current.target?.kind === 'PIPELINE' ? current.target.key : undefined);
    const pipeline = pipelineId ? state.pipelines.find((entry) => this.matchesSegment(entry.id, entry.name, pipelineId)) : undefined;
    if (pipelineId && !pipeline) throw new NotFoundError('DevOps pipeline not found');

    if (area === 'repository') {
      if (!state.repository) return this.result(raw, 'No repository snapshot is recorded.', 0, 'stdout', current);
      return this.result(raw, `Repository: ${state.repository.name ?? 'not recorded'}\nBranch: ${state.repository.branch ?? 'not recorded'}\nCommit: ${state.repository.commitSha ?? 'not recorded'}\nSource: ${state.repository.source}`, 0, 'stdout', current);
    }
    if (['pipelines', 'pipeline'].includes(area)) {
      if (pipeline) return this.result(raw, this.describePipeline(pipeline), 0, 'stdout', current);
      const rows = state.pipelines.flatMap((entry) => entry.stages.length ? entry.stages.map((stage) => [entry.id, entry.status, stage.id, stage.name, stage.tool, stage.status, stage.recordedOutput]) : [[entry.id, entry.status, '-', '-', '-', '-', '-']]);
      return this.result(raw, rows.length ? renderTable(['PIPELINE', 'PIPE STATUS', 'STAGE', 'NAME', 'TOOL', 'STATUS', 'RECORDED OUTPUT'], rows) : 'No pipelines are recorded.', 0, 'table', current);
    }
    if (['terraform', 'iac'].includes(area)) {
      const tf = state.terraform;
      if (!tf?.present) return this.result(raw, 'Terraform is not represented by this Lab.', 0, 'stdout', current);
      const files = tf.files.length ? renderTable(['PATH', 'TYPE', 'SIZE', 'SOURCE'], tf.files.map((file) => [file.path, file.type, file.size, file.source])) : 'No Terraform files are recorded.';
      const plan = tf.recordedPlanOutput ? `\n\nRecorded plan output (not executed now):\n${tf.recordedPlanOutput}` : '';
      return this.result(raw, `Workspace: ${tf.workspace ?? 'not recorded'}\nBackend: ${tf.backend ?? 'not recorded'}\nDrift: ${tf.driftStatus}\nSummary: ${tf.driftSummary ?? 'not recorded'}\n\nFILES\n${files}${plan}`, 0, 'stdout', current);
    }
    if (['kubernetes', 'k8s'].includes(area)) {
      const clusters = state.kubernetes.clusters.length ? renderTable(['CLUSTER', 'VERSION', 'STATUS', 'PROVIDER'], state.kubernetes.clusters.map((entry) => [entry.name, entry.version, entry.status, entry.provider])) : 'No clusters recorded.';
      const workloads = state.kubernetes.workloads.length ? renderTable(['KIND', 'NAMESPACE', 'NAME', 'READY/DESIRED', 'STATUS', 'IMAGE'], state.kubernetes.workloads.map((entry) => [entry.kind, entry.namespace, entry.name, `${display(entry.readyReplicas, '?')}/${display(entry.desiredReplicas, '?')}`, entry.status, entry.image])) : 'No workloads recorded.';
      return this.result(raw, `CLUSTERS\n${clusters}\n\nWORKLOADS\n${workloads}`, 0, 'table', current);
    }
    if (area === 'gitops') {
      return this.result(raw, state.gitops.length ? renderTable(['APP', 'CONTROLLER', 'SYNC', 'HEALTH', 'REVISION', 'DESTINATION'], state.gitops.map((entry) => [entry.name, entry.controller, entry.syncStatus, entry.healthStatus, entry.revision, entry.destination])) : 'No GitOps applications are recorded.', 0, 'table', current);
    }
    if (area === 'helm') {
      return this.result(raw, state.helm.length ? renderTable(['RELEASE', 'NAMESPACE', 'CHART', 'VERSION', 'STATUS'], state.helm.map((entry) => [entry.name, entry.namespace, entry.chart, entry.version, entry.status])) : 'No Helm releases are recorded.', 0, 'table', current);
    }
    if (['network-policy', 'cilium', 'policies'].includes(area)) {
      return this.result(raw, state.networkPolicies.length ? renderTable(['POLICY', 'NAMESPACE', 'PROVIDER', 'STATUS', 'SUMMARY'], state.networkPolicies.map((entry) => [entry.name, entry.namespace, entry.provider, entry.status, entry.summary])) : 'No network-policy records are available.', 0, 'table', current);
    }
    if (['observability', 'observations'].includes(area)) {
      return this.result(raw, state.observability.length ? renderTable(['NAME', 'PROVIDER', 'STATUS', 'SUMMARY', 'RECORDED OUTPUT'], state.observability.map((entry) => [entry.name, entry.provider, entry.status, entry.summary, entry.recordedOutput])) : 'No observability snapshots are recorded.', 0, 'table', current);
    }
    if (area === 'health') {
      const ops = await this.devOpsOperations.getOperations(current.lab!.id, sessionKey);
      const table = renderTable(['STATUS', 'CATEGORY', 'CHECK', 'SUMMARY'], ops.healthChecks.map((entry) => [entry.status, entry.category, entry.title, entry.summary]));
      return this.result(raw, `Overall: ${ops.overallStatus}\n${table}`, 0, 'table', current);
    }
    throw new ValidationError(`Unknown GITOPS inspector: ${area}`);
  }

  private describePipeline(pipeline: DevOpsLabState['pipelines'][number]): string {
    const stages = pipeline.stages.length ? renderTable(['ID', 'STAGE', 'TOOL', 'STATUS', 'DURATION', 'RECORDED OUTPUT'], pipeline.stages.map((stage) => [stage.id, stage.name, stage.tool, stage.status, stage.durationSeconds === null ? null : `${stage.durationSeconds}s`, stage.recordedOutput])) : 'No stages recorded.';
    return `Pipeline: ${pipeline.name} [${pipeline.id}]\nFramework: ${pipeline.framework ?? 'not recorded'}\nStatus: ${pipeline.status}\nSource: ${pipeline.source}\n\n${stages}`;
  }

  private async handleScenarioCommand(raw: string, args: string[], current: UnifiedCliContext, sessionKey?: string): Promise<UnifiedCliExecutionResult> {
    if (!current.lab) throw new ValidationError('Select a Lab context before using scenarios');
    if (!sessionKey) throw new ValidationError('Scenario commands require a browser Lab session identifier');
    const action = (args[0] ?? 'list').toLowerCase();
    let overview;
    if (action === 'list' || action === 'status') {
      overview = await this.scenarios.getOverview(current.lab.id, sessionKey);
    } else if (action === 'run') {
      const slug = args[1];
      if (!slug) throw new ValidationError('Usage: scenario run <slug>');
      overview = await this.scenarios.run(current.lab.id, sessionKey, slug);
    } else if (action === 'verify') {
      overview = await this.scenarios.verify(current.lab.id, sessionKey);
    } else if (action === 'remediate') {
      overview = await this.scenarios.remediate(current.lab.id, sessionKey);
    } else if (action === 'reset') {
      overview = await this.scenarios.reset(current.lab.id, sessionKey);
    } else {
      throw new ValidationError('Usage: scenario list|status|run <slug>|verify|remediate|reset');
    }

    const refreshed = await this.resolveContext(current.contextId, sessionKey);
    if (action === 'list') {
      const output = overview.scenarios.length
        ? renderTable(['SLUG', 'TITLE', 'SUMMARY'], overview.scenarios.map((entry) => [entry.slug, entry.title, entry.summary]))
        : 'No enabled scenario definitions are recorded for this Lab.';
      return this.result(raw, output, 0, 'table', refreshed);
    }
    if (action === 'status') {
      const runtime = overview.runtime;
      return this.result(raw, runtime
        ? ['Scenario: ' + runtime.scenarioTitle + ' (' + runtime.scenarioSlug + ')', 'Status: ' + runtime.status, 'Mode: ' + runtime.executionMode, runtime.verification ? 'Last verification: ' + (runtime.verification.passed ? 'PASS' : 'FAIL') + ' [' + runtime.verification.phase + ']' : 'Last verification: not run', runtime.note].join('\n')
        : 'No scenario runtime is active for this browser session and Lab.', 0, 'stdout', refreshed);
    }
    const runtime = overview.runtime;
    const verb = action === 'run' ? 'started' : action === 'remediate' ? 'remediated to canonical baseline' : action === 'verify' ? 'verified' : 'reset';
    const verification = runtime?.verification ? '\nVerification: ' + (runtime.verification.passed ? 'PASS' : 'FAIL') + ' [' + runtime.verification.phase + ']' : '';
    return this.result(raw, runtime
      ? 'Scenario ' + verb + ': ' + runtime.scenarioTitle + ' (' + runtime.status + ')' + verification + '\n' + runtime.note
      : 'Scenario runtime reset. Canonical recorded Lab state is active.', 0, 'system', refreshed, refreshed.executionMode !== current.executionMode);
  }
  private async handleEvidence(raw: string, current: UnifiedCliContext, sessionKey?: string): Promise<UnifiedCliExecutionResult> {
    if (!current.lab) throw new ValidationError('Select a Lab context before inspecting evidence');
    const state = await this.getDomainState(current, sessionKey);
    const output = state.evidence.length
      ? renderTable(['KIND', 'TITLE', 'DESCRIPTION', 'ARTIFACT', 'EXTERNAL'], state.evidence.map((entry) => [entry.kind, entry.title, entry.description, entry.artifact?.fileName ?? null, entry.externalUrl ? 'reference present' : null]))
      : 'No public evidence records are available for this Lab.';
    return this.result(raw, output, 0, 'table', current);
  }

  private async getDomainState(current: UnifiedCliContext, sessionKey?: string): Promise<NetworkingLabState | LinuxLabState | DevOpsLabState> {
    if (!current.lab) throw new ValidationError('Select a Lab context first');
    if (current.domain === 'NETWORKING') return this.networking.getPublic(current.lab.id, sessionKey);
    if (current.domain === 'LINUX') return this.linux.getPublic(current.lab.id, sessionKey);
    if (current.domain === 'DEVOPS') return this.devOps.getPublic(current.lab.id, sessionKey);
    throw new ValidationError('PORTFOLIO has no Lab state');
  }

  private async handleTrace(raw: string, args: string[], current: UnifiedCliContext, sessionKey?: string): Promise<UnifiedCliExecutionResult> {
    if (current.domain !== 'NETWORKING' || !current.lab) throw new ValidationError('`trace` is available only in a NETOPS Lab context');
    const [source, target, protocol = 'ICMP'] = args;
    if (!source || !target) throw new ValidationError('Usage: trace <source-device> <target-device> [protocol]');
    const analysis = await this.networkingOperations.analyzePath(current.lab.id, source, target, protocol, sessionKey);
    const blockers = analysis.blockers.length ? `\nBlockers:\n${renderList(analysis.blockers.map((entry) => `${entry.type}: ${entry.message}`), '')}` : '';
    const output = [
      `Status: ${analysis.status}`,
      `Protocol: ${analysis.protocol}`,
      `Path: ${analysis.hops.length ? analysis.hops.join(' -> ') : 'none'}`,
      `Links: ${analysis.linkKeys.join(' -> ') || 'none'}`,
      `Firewall traversed: ${analysis.traversesFirewall ? 'yes' : 'no'}`,
      `ACL assessment: ${analysis.aclAssessment.status} — ${analysis.aclAssessment.reason}`,
      analysis.routeLookup ? `Route lookup: ${analysis.routeLookup.status}${analysis.routeLookup.matchedRoute ? ` (${analysis.routeLookup.matchedRoute.network} via ${analysis.routeLookup.matchedRoute.nextHop})` : ''}` : 'Route lookup: not available',
      blockers,
      analysis.note,
    ].filter(Boolean).join('\n');
    return this.result(raw, output, analysis.status === 'BLOCKED' || analysis.status === 'UNREACHABLE' ? 1 : 0, 'stdout', current);
  }

  private async handleRoute(raw: string, args: string[], current: UnifiedCliContext, sessionKey?: string): Promise<UnifiedCliExecutionResult> {
    if (current.domain !== 'NETWORKING' || !current.lab) throw new ValidationError('`route` is available only in a NETOPS Lab context');
    const destination = args[0];
    if (!destination) throw new ValidationError('Usage: route <destination-ip> [device-key]');
    const device = args[1] ?? (current.target?.kind === 'DEVICE' ? current.target.key : undefined);
    const lookup = await this.networkingOperations.lookupRoute(current.lab.id, destination, device, sessionKey);
    const route = lookup.matchedRoute;
    const output = route
      ? `Status: ${lookup.status}\nDestination: ${lookup.destination}\nDevice: ${lookup.deviceKey ?? 'all recorded routes'}\nMatched: ${route.network}\nNext hop: ${route.nextHop}\nInterface: ${route.interface}\nProtocol: ${route.protocolName || route.protocol}\nPrefix length: ${lookup.prefixLength}\n${lookup.note}`
      : `Status: ${lookup.status}\nDestination: ${lookup.destination}\nDevice: ${lookup.deviceKey ?? 'all recorded routes'}\n${lookup.note}`;
    return this.result(raw, output, lookup.status === 'MATCH_FOUND' ? 0 : 1, 'stdout', current);
  }

  private async handleRecordedStateAlias(raw: string, root: string, args: string[], current: UnifiedCliContext, sessionKey?: string): Promise<UnifiedCliExecutionResult | null> {
    if (['ping', 'traceroute'].includes(root)) {
      return this.result(raw, 'Live ICMP/traceroute execution is disabled. In NETOPS use `trace <source-device> <target-device> [protocol]` for deterministic recorded-state path analysis.', 2, 'stderr', current);
    }
    if (root.startsWith('./')) {
      return this.result(raw, 'Automation scripts are not executed by the portfolio CLI. Use `show`, `inspect`, `scenario`, and `evidence`; automation scripts remain disabled.', 126, 'stderr', current);
    }

    if (current.domain === 'NETWORKING' && root === 'cisco') {
      const sub = args.join(' ').toLowerCase();
      if (sub.includes('show running-config') || sub.includes('show run')) return this.showNetworking(raw, 'device', [], current, sessionKey);
      if (sub.includes('show ip route')) return this.showNetworking(raw, 'routes', [], current, sessionKey);
      if (sub.includes('show vlan')) return this.showNetworking(raw, 'vlans', [], current, sessionKey);
      return this.result(raw, 'IOS is not executed. Supported recorded-state aliases: `cisco show run`, `cisco show ip route`, `cisco show vlan`.', 2, 'stderr', current);
    }

    if (current.domain === 'LINUX') {
      if (root === 'uname') return this.showLinux(raw, 'host', [], current, sessionKey);
      if (['sestatus', 'getenforce'].includes(root)) return this.showLinux(raw, 'selinux', [], current, sessionKey);
      if (root === 'lsblk') return this.showLinux(raw, 'storage', [], current, sessionKey);
      if (root === 'ip' && (args[0] === 'a' || args[0] === 'addr' || args[0] === 'address' || args[0] === 'route' || args[0] === 'r')) return this.showLinux(raw, 'network', [], current, sessionKey);
      if (root === 'journalctl') return this.showLinux(raw, 'logs', [], current, sessionKey);
      if (root === 'systemctl') {
        const action = (args[0] ?? '').toLowerCase();
        if (action === 'list-units' || !action) return this.showLinux(raw, 'services', [], current, sessionKey);
        if (action === 'status') {
          const unit = args[1];
          const state = await this.linux.getPublic(current.lab!.id, sessionKey);
          const host = current.target?.kind === 'HOST' ? state.hosts.find((entry) => entry.key === current.target?.key) : state.hosts[0];
          if (!host) throw new NotFoundError('Linux host not found');
          if (!unit) return this.showLinux(raw, 'services', [host.key], current, sessionKey);
          const service = host.services.find((entry) => entry.unit === unit || entry.unit === `${unit}.service` || entry.unit.replace(/\.service$/i, '') === unit.replace(/\.service$/i, ''));
          if (!service) throw new NotFoundError('Recorded systemd unit not found');
          return this.result(raw, [
            `${service.unit} — ${service.description ?? 'no description recorded'}`,
            `Load: ${service.loadState ?? 'not recorded'}`,
            `Active: ${service.activeState}`,
            `Sub: ${service.subState ?? 'not recorded'}`,
            `Enabled: ${service.enabled === null ? 'not recorded' : service.enabled ? 'yes' : 'no'}`,
            `Restart policy: ${service.restartPolicy ?? 'not recorded'}`,
            `User: ${service.user ?? 'not recorded'}`,
            service.configurationSnippet ? `\nRecorded unit/config excerpt:\n${service.configurationSnippet}` : '',
            '\nRecorded-state result only; systemctl was not executed.',
          ].filter(Boolean).join('\n'), 0, 'stdout', current);
        }
        return this.result(raw, `Mutating systemctl action '${action}' is disabled. External host mutation is disabled; use scenario commands for session-scoped simulation.`, 126, 'stderr', current);
      }
    }

    if (current.domain === 'DEVOPS') {
      if (root === 'terraform' && (args[0] ?? '').toLowerCase() === 'plan') return this.showDevOps(raw, 'terraform', [], current, sessionKey);
      if (root === 'kubectl' && (args[0] ?? '').toLowerCase() === 'get') return this.showDevOps(raw, 'kubernetes', [], current, sessionKey);
      if (root === 'argocd' && (args[0] ?? '').toLowerCase() === 'app') return this.showDevOps(raw, 'gitops', [], current, sessionKey);
      if (root === 'helm' && (args[0] ?? '').toLowerCase() === 'list') return this.showDevOps(raw, 'helm', [], current, sessionKey);
      if (root === 'docker') return this.result(raw, 'No container-runtime process model exists in devops.v1. Docker commands are not executed or fabricated.', 2, 'stderr', current);
    }

    return null;
  }
}
