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
  assert.fail(`${path} must be removed after the dynamic Networking Engine replaces the project-specific visualizer`);
}

async function main(): Promise<void> {
  await assertMissing('src/components/CiscoTopologyVisualizer.tsx');
  await assertMissing('src/components/NetworkingLabExplorer.tsx');
  await assertMissing('server/services/networking/networking-state.ts');

  const [domainWorkspace, explorer, operationsPanel, route, service, operationsService, adapter, seed, packageJsonText] = await Promise.all([
    text('src/components/DomainWorkspace.tsx'),
    text('src/components/networking/NetworkingLabExplorer.tsx'),
    text('src/components/networking/NetworkOperationsPanel.tsx'),
    text('server/routes/network.routes.ts'),
    text('server/services/networking/networking.service.ts'),
    text('server/services/networking/networking-operations.service.ts'),
    text('server/services/networking/networking-lab-adapter.ts'),
    text('prisma/seed.ts'),
    text('package.json'),
  ]);

  assert.match(domainWorkspace, /NetworkingLabExplorer/);
  assert.doesNotMatch(domainWorkspace, /CiscoTopologyVisualizer/);
  assert.match(explorer, /getNetworkingLabs/);
  assert.match(explorer, /NetworkTopologyCanvas/);
  assert.match(explorer, /NetworkDeviceInspector/);
  assert.match(explorer, /NetworkOperationsPanel/);
  assert.doesNotMatch(explorer, /cisco-wan-topology|proj-cisco|if\s*\([^)]*project.*slug/i);

  assert.match(operationsPanel, /getNetworkingOperations/);
  assert.match(operationsPanel, /lookupNetworkingRoute/);
  assert.match(operationsPanel, /analyzeNetworkingPath/);
  assert.match(operationsPanel, /getNetworkingContext/);
  assert.match(operationsPanel, /Scenario-Ready Definitions/);
  assert.match(operationsPanel, /does not execute arbitrary device commands/i);
  assert.doesNotMatch(operationsPanel, /cisco-wan-topology|proj-cisco|Math\.random/);

  assert.match(route, /networkingService/);
  assert.match(route, /networkingOperationsService/);
  assert.match(route, /\/labs\/\:identifier\/trace/);
  assert.match(route, /\/labs\/\:identifier\/operations/);
  assert.match(route, /\/labs\/\:identifier\/route-lookup/);
  assert.match(route, /\/labs\/\:identifier\/analyze-path/);
  assert.match(route, /\/labs\/\:identifier\/context/);
  assert.doesNotMatch(route, /Math\.random|defaultTopologyData|PrismaClient|prisma\.|dbService/);

  assert.match(service, /LabManifestService/);
  assert.match(service, /NetworkingLabAdapter/);
  assert.match(service, /PATH_FOUND/);
  assert.doesNotMatch(service, /cisco-wan-topology|proj-cisco|Math\.random/);

  assert.match(operationsService, /RECORDED_ROUTE_TABLE_LONGEST_PREFIX_MATCH/);
  assert.match(operationsService, /RECORDED_STATE_FORWARDING_ANALYSIS/);
  assert.match(operationsService, /NOT_EVALUATED/);
  assert.match(operationsService, /NETOPS\//);
  assert.match(operationsService, /executionAvailable:\s*false/);
  assert.doesNotMatch(operationsService, /Math\.random|cisco-wan-topology|proj-cisco|latency|roundTrip/i);

  assert.match(adapter, /manifest\.topology\.nodes/);
  assert.match(adapter, /manifest\.topology\.links/);
  assert.match(adapter, /bgpNeighbors/);
  assert.match(adapter, /ospfNeighbors/);
  assert.match(adapter, /gatewayRedundancy/);
  assert.match(adapter, /arbitrary \.pkt binary parsing is not performed/i);
  assert.doesNotMatch(adapter, /cisco-wan-topology|proj-cisco/);

  assert.match(seed, /schemaVersion:\s*'networking\.v1'/);
  assert.match(seed, /reconcileNetworkingTopology/);
  assert.match(seed, /inputType:\s*'PACKET_TRACER'/);
  assert.match(seed, /bgpNeighbors/);
  assert.match(seed, /ospfNeighbors/);
  assert.match(seed, /gatewayRedundancy/);
  assert.match(seed, /networkingScenarioDefinitions/);
  assert.match(seed, /reference metadata.*does not claim arbitrary \.pkt binary parsing/is);
  assert.doesNotMatch(seed, /real-time XML topology parser/i);
  assert.doesNotMatch(seed, /Production Kubernetes & Linux Servers|Production_Servers/);

  const networkingArchitecture = await text('docs/NETWORKING_ENGINE_ARCHITECTURE.md');
  assert.match(networkingArchitecture, /Multi-project requirement/i);
  assert.match(networkingArchitecture, /recorded-state/i);
  assert.match(networkingArchitecture, /scenario-ready/i);
  assert.match(networkingArchitecture, /arbitrary `?\.pkt`? binary parsing/i);

  const packageJson = JSON.parse(packageJsonText) as { scripts?: Record<string, string> };
  assert.ok(packageJson.scripts?.['test:networking:static']);
  assert.ok(packageJson.scripts?.['test:networking']);
  assert.ok(packageJson.scripts?.['test:networking:http']);
  assert.ok(packageJson.scripts?.['test:networking:operations']);
  assert.ok(packageJson.scripts?.['test:networking:operations:http']);

  console.log('Networking engine static audit: PASS');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error(`Networking engine static audit: FAIL (${message})`);
  process.exitCode = 1;
});
