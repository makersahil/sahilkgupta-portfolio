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

  const [workspace, explorer, inspector, route, service, adapter, seed, packageJsonText, serverEntry] = await Promise.all([
    text('src/components/DomainWorkspace.tsx'),
    text('src/components/linux/LinuxLabExplorer.tsx'),
    text('src/components/linux/LinuxHostInspector.tsx'),
    text('server/routes/linux.routes.ts'),
    text('server/services/linux/linux.service.ts'),
    text('server/services/linux/linux-lab-adapter.ts'),
    text('prisma/seed.ts'),
    text('package.json'),
    text('server.ts'),
  ]);

  assert.match(workspace, /LinuxLabExplorer/);
  assert.doesNotMatch(workspace, /LinuxWorkspacePreview/);
  assert.match(explorer, /getLinuxLabs/);
  assert.match(explorer, /LinuxHostInspector/);
  assert.match(explorer, /persisted Lab manifests/i);
  assert.doesNotMatch(explorer, /rhel9-hardening-environment|proj-rhel|Math\.random/i);

  assert.match(inspector, /systemd|Services/i);
  assert.match(inspector, /SELinux/);
  assert.match(inspector, /fstab/);
  assert.match(inspector, /No JOURNAL_EXTRACT\/log snapshot is attached/i);
  assert.doesNotMatch(inspector, /rhel9-hardening-environment|proj-rhel|Math\.random/i);

  assert.match(route, /linuxService/);
  assert.match(route, /\/labs\/\:identifier\/hosts\/\:hostKey/);
  assert.doesNotMatch(route, /PrismaClient|prisma\.|MockDatabaseService|dbService/);

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

  assert.match(seed, /schemaVersion:\s*'linux\.v1'/);
  assert.match(seed, /reconcileLinuxHosts/);
  assert.match(seed, /inputType:\s*'FSTAB'/);
  assert.match(seed, /inputType:\s*'SYSTEMD_UNIT'/);
  assert.match(seed, /inputType:\s*'SELINUX_AUDIT'/);
  assert.match(seed, /Red Hat Enterprise Linux 9\.4/);
  assert.match(seed, /not live host telemetry/i);

  assert.match(serverEntry, /\/api\/linux/);

  const packageJson = JSON.parse(packageJsonText) as { scripts?: Record<string, string> };
  assert.ok(packageJson.scripts?.['test:linux:static']);
  assert.ok(packageJson.scripts?.['test:linux']);
  assert.ok(packageJson.scripts?.['test:linux:http']);

  const architecture = await text('docs/LINUX_ENGINE_ARCHITECTURE.md');
  assert.match(architecture, /multi-project/i);
  assert.match(architecture, /RHEL 9\.4/i);
  assert.match(architecture, /recorded state/i);
  assert.match(architecture, /Phase 4B/i);

  console.log('Linux engine static audit: PASS');
}

main().catch((error: unknown) => {
  console.error(`Linux engine static audit: FAIL (${error instanceof Error ? `${error.name}: ${error.message}` : String(error)})`);
  process.exitCode = 1;
});
