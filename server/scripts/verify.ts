import 'dotenv/config';
import { spawnSync } from 'node:child_process';

interface Step {
  label: string;
  command: 'npm' | 'npx';
  args: string[];
  requiresDatabase?: boolean;
  cleanupOnFailure?: Step;
}

type Mode = 'quick' | 'tests' | 'full';

const mode = (process.argv[2] ?? 'full') as Mode;
if (!['quick', 'tests', 'full'].includes(mode)) {
  console.error('Usage: npm run verify -- [quick|tests|full]');
  process.exit(2);
}

const restartCleanup: Step = {
  label: 'Content restart cleanup',
  command: 'npm',
  args: ['run', 'test:content:restart', '--', 'cleanup'],
  requiresDatabase: true,
};

const staticTests: Step[] = [
  { label: 'Auth static audit', command: 'npm', args: ['run', 'test:auth:static'] },
  { label: 'Content static audit', command: 'npm', args: ['run', 'test:content:static'] },
  { label: 'Lab platform static audit', command: 'npm', args: ['run', 'test:labs:static'] },
  { label: 'Admin orchestration static audit', command: 'npm', args: ['run', 'test:admin:static'] },
  { label: 'Persistent runtime static audit', command: 'npm', args: ['run', 'test:runtime:static'] },
  { label: 'Networking engine static audit', command: 'npm', args: ['run', 'test:networking:static'] },
  { label: 'Linux engine static audit', command: 'npm', args: ['run', 'test:linux:static'] },
  { label: 'DevOps engine static audit', command: 'npm', args: ['run', 'test:devops:static'] },
  { label: 'Unified CLI static audit', command: 'npm', args: ['run', 'test:cli:static'] },
  { label: 'Scenario engine static audit', command: 'npm', args: ['run', 'test:scenarios:static'] },
  { label: 'API client regression', command: 'npm', args: ['run', 'test:api-client'] },
];

const databaseTests: Step[] = [
  { label: 'Database check', command: 'npm', args: ['run', 'db:check'], requiresDatabase: true },
  { label: 'Authentication regression', command: 'npm', args: ['run', 'test:auth'], requiresDatabase: true },
  { label: 'Content persistence smoke', command: 'npm', args: ['run', 'test:content:smoke'], requiresDatabase: true },
  { label: 'Content Prisma regression', command: 'npm', args: ['run', 'test:content:prisma'], requiresDatabase: true },
  {
    label: 'Content restart create',
    command: 'npm',
    args: ['run', 'test:content:restart', '--', 'create'],
    requiresDatabase: true,
    cleanupOnFailure: restartCleanup,
  },
  {
    label: 'Content restart verify',
    command: 'npm',
    args: ['run', 'test:content:restart', '--', 'verify'],
    requiresDatabase: true,
    cleanupOnFailure: restartCleanup,
  },
  restartCleanup,
  { label: 'Content HTTP regression', command: 'npm', args: ['run', 'test:content:http'], requiresDatabase: true },
  { label: 'Lab platform regression', command: 'npm', args: ['run', 'test:labs'], requiresDatabase: true },
  { label: 'Lab manifest regression', command: 'npm', args: ['run', 'test:labs:manifest'], requiresDatabase: true },
  { label: 'Lab HTTP regression', command: 'npm', args: ['run', 'test:labs:http'], requiresDatabase: true },
  { label: 'Admin orchestration HTTP regression', command: 'npm', args: ['run', 'test:admin:http'], requiresDatabase: true },
  { label: 'Persistent runtime HTTP regression', command: 'npm', args: ['run', 'test:runtime:http'], requiresDatabase: true },
  { label: 'Networking engine regression', command: 'npm', args: ['run', 'test:networking'], requiresDatabase: true },
  { label: 'Networking engine HTTP regression', command: 'npm', args: ['run', 'test:networking:http'], requiresDatabase: true },
  { label: 'Networking operations regression', command: 'npm', args: ['run', 'test:networking:operations'], requiresDatabase: true },
  { label: 'Networking operations HTTP regression', command: 'npm', args: ['run', 'test:networking:operations:http'], requiresDatabase: true },
  { label: 'Linux engine regression', command: 'npm', args: ['run', 'test:linux'], requiresDatabase: true },
  { label: 'Linux engine HTTP regression', command: 'npm', args: ['run', 'test:linux:http'], requiresDatabase: true },
  { label: 'Linux operations regression', command: 'npm', args: ['run', 'test:linux:operations'], requiresDatabase: true },
  { label: 'Linux operations HTTP regression', command: 'npm', args: ['run', 'test:linux:operations:http'], requiresDatabase: true },
  { label: 'DevOps engine regression', command: 'npm', args: ['run', 'test:devops'], requiresDatabase: true },
  { label: 'DevOps engine HTTP regression', command: 'npm', args: ['run', 'test:devops:http'], requiresDatabase: true },
  { label: 'DevOps operations regression', command: 'npm', args: ['run', 'test:devops:operations'], requiresDatabase: true },
  { label: 'DevOps operations HTTP regression', command: 'npm', args: ['run', 'test:devops:operations:http'], requiresDatabase: true },
  { label: 'Unified CLI regression', command: 'npm', args: ['run', 'test:cli'], requiresDatabase: true },
  { label: 'Unified CLI HTTP regression', command: 'npm', args: ['run', 'test:cli:http'], requiresDatabase: true },
  { label: 'Scenario engine regression', command: 'npm', args: ['run', 'test:scenarios'], requiresDatabase: true },
  { label: 'Scenario engine HTTP regression', command: 'npm', args: ['run', 'test:scenarios:http'], requiresDatabase: true },
];

const buildSteps: Step[] = [
  { label: 'Prisma schema validation', command: 'npx', args: ['prisma', 'validate'] },
  { label: 'Prisma client generation', command: 'npx', args: ['prisma', 'generate'] },
  { label: 'TypeScript lint/typecheck', command: 'npm', args: ['run', 'lint'] },
  { label: 'Production build', command: 'npm', args: ['run', 'build'] },
];

const migrationStatus: Step = {
  label: 'Migration status',
  command: 'npx',
  args: ['prisma', 'migrate', 'status'],
  requiresDatabase: true,
};

let steps: Step[];
if (mode === 'quick') steps = [...buildSteps, ...staticTests];
else if (mode === 'tests') steps = [...staticTests, ...databaseTests];
else steps = [...buildSteps, migrationStatus, ...staticTests, ...databaseTests];

if (steps.some((step) => step.requiresDatabase) && !process.env.DATABASE_URL?.trim()) {
  console.error('Verification requires DATABASE_URL. Use `npm run verify:quick` for DB-free checks.');
  process.exit(2);
}

const startedAt = Date.now();

interface SpawnCommand {
  executable: string;
  args: string[];
  shell: boolean;
}

function resolveCommand(step: Step): SpawnCommand {
  // When this script is launched via `npm run`, npm exposes the exact npm CLI
  // entrypoint. Calling it through Node avoids Windows .cmd spawning issues
  // (including spawnSync EINVAL on newer Node/Windows combinations).
  const npmExecPath = process.env.npm_execpath?.trim();
  if (npmExecPath) {
    if (step.command === 'npm') {
      return {
        executable: process.execPath,
        args: [npmExecPath, ...step.args],
        shell: false,
      };
    }

    // Use `npm exec` instead of spawning npx.cmd directly.
    return {
      executable: process.execPath,
      args: [npmExecPath, 'exec', '--', ...step.args],
      shell: false,
    };
  }

  // Fallback for direct execution outside `npm run`.
  // On Windows, command shims such as npm/npx are shell commands.
  return {
    executable: step.command,
    args: step.args,
    shell: process.platform === 'win32',
  };
}

function execute(step: Step, prefix = 'VERIFY'): number {
  console.log(`\n[${prefix}] ${step.label}`);

  const command = resolveCommand(step);
  const result = spawnSync(command.executable, command.args, {
    stdio: 'inherit',
    env: process.env,
    shell: command.shell,
  });

  if (result.error) {
    console.error(`Unable to start ${step.label}: ${result.error.message}`);
    return 1;
  }

  if (typeof result.status === 'number') return result.status;

  if (result.signal) {
    console.error(`${step.label} terminated by signal ${result.signal}`);
  }

  return 1;
}

for (const [index, step] of steps.entries()) {
  const status = execute(step, `VERIFY ${index + 1}/${steps.length}`);
  if (status !== 0) {
    if (step.cleanupOnFailure) {
      console.error(`\nVerification failed at ${step.label}; attempting fixture cleanup before exit.`);
      execute(step.cleanupOnFailure, 'CLEANUP');
    }

    console.error(`\nVerification FAIL at: ${step.label}`);
    process.exit(status);
  }
}

const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
console.log(`\nVerification PASS (${mode}) in ${seconds}s`);
