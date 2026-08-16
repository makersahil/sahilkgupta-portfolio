import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function main(): Promise<void> {
  const [routes, service, terminal, api, docs] = await Promise.all([
    readFile('server/routes/terminal.routes.ts', 'utf8'),
    readFile('server/services/cli/unified-cli.service.ts', 'utf8'),
    readFile('src/components/TerminalEmulator.tsx', 'utf8'),
    readFile('src/lib/api.ts', 'utf8'),
    readFile('docs/UNIFIED_CLI_ARCHITECTURE.md', 'utf8'),
  ]);

  assert.match(routes, /unifiedCliService/);
  assert.match(routes, /\/bootstrap/);
  assert.match(routes, /\/exec/);
  assert.doesNotMatch(routes, /184 days|ping statistics|nexus-k8s|DEPLOYMENT SUCCESSFUL|OSPF TOPOLOGY VERIFIED/);

  assert.match(service, /executionMode: 'RECORDED_STATE'/);
  assert.match(service, /`NETOPS\/\$\{contextSegment\(context\.lab\.slug\)\}\/\$\{contextSegment\(context\.device\.key\)\}`/);
  assert.match(service, /`RHEL\/\$\{contextSegment\(context\.lab\.slug\)\}\/\$\{contextSegment\(context\.host\.key\)\}`/);
  assert.match(service, /`GITOPS\/\$\{contextSegment\(context\.lab\.slug\)\}\/\$\{contextSegment\(context\.pipeline\.id\)\}`/);
  assert.match(service, /Scenario mutation is not available in Phase 6/);
  assert.match(service, /Live ICMP\/traceroute execution is disabled/);
  assert.doesNotMatch(service, /child_process|spawn\(|exec\(|execFile\(|ssh2|node-ssh/);
  assert.doesNotMatch(service, /cisco-wan-topology|rhel9-hardening-environment|gitops-k8s-cluster/i);

  assert.match(terminal, /Unified Recorded-State CLI/);
  assert.match(terminal, /shell\/provider execution: disabled/);
  assert.doesNotMatch(terminal, /deploy_k8s\.sh|configure_ospf\.sh|benchmark_storage\.sh|Interactive Linux WebTTY|sahil@rhel9-infra-node01/);

  assert.match(api, /getCliBootstrap/);
  assert.match(api, /execCli/);
  assert.match(docs, /recorded-state/i);
  assert.match(docs, /Phase 7/i);

  console.log('Unified CLI static audit: PASS');
}

main().catch((error: unknown) => {
  console.error(`Unified CLI static audit: FAIL (${error instanceof Error ? error.stack ?? error.message : String(error)})`);
  process.exitCode = 1;
});
