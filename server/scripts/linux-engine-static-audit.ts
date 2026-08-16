import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const text = (path: string) => readFile(resolve(ROOT, path), 'utf8');

async function assertMissing(path: string): Promise<void> {
  try {
    await access(resolve(ROOT, path), constants.F_OK);
  } catch {
    return;
  }
  assert.fail(`${path} must be removed after the Dynamic Linux Engine replaces the static preview`);
}

async function main(): Promise<void> {
  await assertMissing('src/components/LinuxWorkspacePreview.tsx');

  const [
    workspace,
    explorer,
    inspector,
    operationsPanel,
    route,
    service,
    operationsService,
    adapter,
    seed,
    apiClient,
    packageJsonText,
    serverEntry,
  ] = await Promise.all([
    text('src/components/DomainWorkspace.tsx'),
    text('src/components/linux/LinuxLabExplorer.tsx'),
    text('src/components/linux/LinuxHostInspector.tsx'),
    text('src/components/linux/LinuxOperationsPanel.tsx'),
    text('server/routes/linux.routes.ts'),
    text('server/services/linux/linux.service.ts'),
    text('server/services/linux/linux-operations.service.ts'),
    text('server/services/linux/linux-lab-adapter.ts'),
    text('prisma/seed.ts'),
    text('src/lib/api.ts'),
    text('package.json'),
    text('server.ts'),
  ]);

  assert.match(workspace, /LinuxLabExplorer/);
  assert.doesNotMatch(workspace, /LinuxWorkspacePreview/);
  assert.match(explorer, /getLinuxLabs/);
  assert.match(explorer, /LinuxHostInspector/);
  assert.match(explorer, /LinuxOperationsPanel/);
  assert.match(explorer, /persisted Lab manifests/i);
  assert.doesNotMatch(explorer, /rhel9-hardening-environment|proj-rhel|Math\.random/i);
  assert.doesNotMatch(explorer, /contextual command execution remains Phase 6|mutable scenario execution remains Phase 7/i);

  assert.match(inspector, /systemd|Services/i);
  assert.match(inspector, /SELinux/);
  assert.match(inspector, /fstab/);
  assert.match(inspector, /No JOURNAL_EXTRACT\/log snapshot is attached/i);
  assert.doesNotMatch(inspector, /rhel9-hardening-environment|proj-rhel|Math\.random/i);

  assert.match(route, /linuxService/);
  assert.match(route, /linuxOperationsService/);
  assert.match(route, /\/labs\/\:identifier\/hosts\/\:hostKey/);
  assert.match(route, /\/labs\/\:identifier\/operations/);
  assert.match(route, /\/labs\/\:identifier\/context/);
  assert.doesNotMatch(route, /PrismaClient|prisma\.|MockDatabaseService|dbService|child_process/);

  assert.match(service, /LabManifestService/);
  assert.match(service, /LinuxLabAdapter/);
  assert.match(service, /domain:\s*LINUX_DOMAIN/);
  assert.match(service, /kind:\s*LINUX_KIND/);
  assert.doesNotMatch(service, /rhel9-hardening-environment|proj-rhel/);

  assert.match(adapter, /manifest\.topology\.nodes/);
  assert.match(adapter, /SYSTEM_SNAPSHOT/);
  assert.match(adapter, /No recorded journal\/log extract is attached/i);
  assert.match(adapter, /normalizeServices/);
  assert.match(adapter, /normalizeSelinux/);
  assert.match(adapter, /normalizeFstab/);
  assert.doesNotMatch(adapter, /rhel9-hardening-environment|proj-rhel/);

  assert.match(operationsService, /linux\.operations\.v1/);
  assert.match(operationsService, /RECORDED_STATE_DIAGNOSTIC/);
  assert.match(operationsService, /systemd service state/i);
  assert.match(operationsService, /fstab and recorded mount alignment/i);
  assert.match(operationsService, /SELinux recorded policy state/i);
  assert.match(operationsService, /Network interface and route state/i);
  assert.match(operationsService, /RHEL\//);
  assert.match(operationsService, /executionAvailable:\s*false/);
  assert.doesNotMatch(operationsService, /rhel9-hardening-environment|proj-rhel|Math\.random/);
  assert.doesNotMatch(operationsService, /from\s+['"]node:child_process['"]|from\s+['"]child_process['"]|execSync|spawnSync|ssh2/);
  assert.doesNotMatch(operationsService, /cpuPercent|memoryPercent|loadAverage|remediationApplied/);

  assert.match(operationsPanel, /getLinuxOperations/);
  assert.match(operationsPanel, /getLinuxContext/);
  assert.match(operationsPanel, /Suggested inspection commands/i);
  assert.match(operationsPanel, /session runnable/i);
  assert.match(operationsPanel, /Run from the Scenario Runtime panel/i);
  assert.match(operationsPanel, /Unified CLI/i);
  assert.doesNotMatch(operationsPanel, /Execution unavailable until Scenario Engine|future unified CLI|Phase 4B exposes/i);
  assert.doesNotMatch(operationsPanel, /rhel9-hardening-environment|proj-rhel|Math\.random/i);

  assert.match(apiClient, /getLinuxOperations/);
  assert.match(apiClient, /getLinuxContext/);

  assert.match(seed, /schemaVersion:\s*'linux\.v1'/);
  assert.match(seed, /reconcileLinuxHosts/);
  assert.match(seed, /inputType:\s*'FSTAB'/);
  assert.match(seed, /inputType:\s*'SYSTEMD_UNIT'/);
  assert.match(seed, /inputType:\s*'SELINUX_AUDIT'/);
  assert.match(seed, /Red Hat Enterprise Linux 9\.4/);
  assert.match(seed, /not live host telemetry/i);
  assert.match(seed, /linuxScenarioDefinitions/);
  assert.match(seed, /service-failure/);
  assert.match(seed, /selinux-denial/);
  assert.match(seed, /mount-failure/);
  assert.match(seed, /network-interface-loss/);

  assert.match(serverEntry, /\/api\/linux/);

  const packageJson = JSON.parse(packageJsonText) as { scripts?: Record<string, string> };
  assert.ok(packageJson.scripts?.['test:linux:static']);
  assert.ok(packageJson.scripts?.['test:linux']);
  assert.ok(packageJson.scripts?.['test:linux:http']);
  assert.ok(packageJson.scripts?.['test:linux:operations']);
  assert.ok(packageJson.scripts?.['test:linux:operations:http']);

  const architecture = await text('docs/LINUX_ENGINE_ARCHITECTURE.md');
  assert.match(architecture, /multi-project/i);
  assert.match(architecture, /RHEL 9\.4/i);
  assert.match(architecture, /recorded state/i);
  assert.match(architecture, /Phase 4B/i);
  assert.match(architecture, /LinuxOperationsService/);
  assert.match(architecture, /RHEL\//);
  assert.match(architecture, /scenario-ready/i);

  console.log('Linux engine static audit: PASS');
}

main().catch((error: unknown) => {
  console.error(`Linux engine static audit: FAIL (${error instanceof Error ? `${error.name}: ${error.message}` : String(error)})`);
  process.exitCode = 1;
});
