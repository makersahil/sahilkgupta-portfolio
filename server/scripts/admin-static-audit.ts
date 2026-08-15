import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function text(path: string): Promise<string> {
  return readFile(path, 'utf8');
}

async function main(): Promise<void> {
  const [apiClient, adminModal, labBuilder, adminRoutes, auditRepository, projectsMapper, projectTypes, verifyRunner] = await Promise.all([
    text('src/lib/api.ts'),
    text('src/components/AdminCMS/AdminModal.tsx'),
    text('src/components/AdminCMS/AdminLabBuilder.tsx'),
    text('server/routes/admin.routes.ts'),
    text('server/repositories/prisma/audit.repository.ts'),
    text('server/repositories/prisma/mappers.ts'),
    text('src/types.ts'),
    text('server/scripts/verify.ts'),
  ]);

  assert.match(apiClient, /\/api\/admin\/audit/);
  assert.doesNotMatch(apiClient, /auditLogsSample/);
  assert.doesNotMatch(apiClient, /log-1.*CREATE_PROJECT/s);
  assert.match(adminModal, /AdminLabBuilder/);
  assert.match(adminModal, /AdminCertificationManager/);
  assert.match(adminModal, /AdminSkillManager/);
  assert.match(adminModal, /AdminAuditPanel/);
  assert.match(labBuilder, /getLabManifestPreview/);
  assert.match(labBuilder, /replaceLabTopology/);
  assert.match(labBuilder, /createLabInput/);
  assert.match(labBuilder, /createLabScenario/);
  assert.match(labBuilder, /createLabRunbookStep/);
  assert.match(labBuilder, /createLabEvidence/);
  assert.match(adminRoutes, /auditService\.list/);
  assert.match(auditRepository, /prisma\.auditLog/);
  assert.match(projectsMapper, /mission: row\.mission/);
  assert.match(projectTypes, /mission\?: string/);
  assert.match(projectTypes, /architectureSummary\?: string/);
  assert.match(projectTypes, /whatIBuilt\?: string/);
  assert.match(verifyRunner, /Verification PASS/);

  console.log('Admin orchestration static audit: PASS');
}

main().catch((error) => {
  console.error(`Admin orchestration static audit: FAIL (${error instanceof Error ? error.stack ?? error.message : String(error)})`);
  process.exitCode = 1;
});
