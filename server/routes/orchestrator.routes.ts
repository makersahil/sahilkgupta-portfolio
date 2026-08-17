import { Router } from 'express';

import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../middlewares/async-handler.js';
import { createRateLimitMiddleware } from '../middlewares/rate-limit.middleware.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { portfolioOrchestratorService } from '../services/orchestrator/index.js';
import {
  parseArtifactQuery,
  parseArtifactUpdate,
  parseDeleteConfirmation,
  parseExpectedRevision,
  parseImport,
  parseLabDuplicate,
  parseOrchestratorLabCreate,
  parseOrchestratorLabUpdate,
  parseOrchestratorProjectCreate,
  parseOrchestratorProjectUpdate,
  parseProjectDuplicate,
  parsePublish,
  parseReorder,
  parseRestoreDraft,
} from '../services/orchestrator/orchestrator-input.js';
import { recordAdminAudit } from './admin-audit.js';

const router = Router();
const importLimiter = createRateLimitMiddleware({
  policy: { scope: 'orchestrator.import', limit: 20, windowMs: 60 * 60 * 1_000 },
  key: (request) => `${(request as AuthenticatedRequest).user?.id ?? 'anonymous'}|${request.ip ?? 'unknown'}`,
  message: 'Too many portfolio import attempts',
});

router.use(authenticateToken, requireRole('SUPER_ADMIN', 'ADMIN'));

function attachmentName(slug: string, suffix: string): string {
  const safe = slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'portfolio';
  return `${safe}-${suffix}.json`;
}

function validationMetadata(report: { errors: number; warnings: number; projectRevision: number; labRevisions: Record<string, number> }) {
  return {
    errors: report.errors,
    warnings: report.warnings,
    projectRevision: report.projectRevision,
    labCount: Object.keys(report.labRevisions).length,
  };
}

router.get('/dashboard', asyncHandler(async (_request, response) => {
  response.json({ success: true, data: await portfolioOrchestratorService.dashboard() });
}));

router.get('/projects', asyncHandler(async (_request, response) => {
  response.json({ success: true, data: await portfolioOrchestratorService.listProjects() });
}));

router.get('/projects/:projectId', asyncHandler(async (request, response) => {
  response.json({ success: true, data: await portfolioOrchestratorService.getProject(request.params.projectId) });
}));

router.post('/projects', asyncHandler(async (request, response) => {
  const data = await portfolioOrchestratorService.createProject(parseOrchestratorProjectCreate(request.body));
  await recordAdminAudit(request, {
    action: 'ORCHESTRATOR_PROJECT_CREATE',
    entityType: 'Project',
    entityId: data.project.id,
    metadata: { revision: data.project.revision, domain: data.project.domain, publicationStatus: data.project.publicationStatus },
  });
  response.status(201).json({ success: true, data, message: 'Draft Project created successfully' });
}));

router.patch('/projects/:projectId', asyncHandler(async (request, response) => {
  const data = await portfolioOrchestratorService.updateProject(request.params.projectId, parseOrchestratorProjectUpdate(request.body));
  await recordAdminAudit(request, {
    action: 'ORCHESTRATOR_PROJECT_UPDATE',
    entityType: 'Project',
    entityId: data.project.id,
    metadata: { revision: data.project.revision, publicationStatus: data.project.publicationStatus },
  });
  response.json({ success: true, data, message: 'Project updated successfully' });
}));

router.post('/projects/:projectId/duplicate', asyncHandler(async (request, response) => {
  const data = await portfolioOrchestratorService.duplicateProject(request.params.projectId, parseProjectDuplicate(request.body));
  await recordAdminAudit(request, {
    action: 'ORCHESTRATOR_PROJECT_DUPLICATE',
    entityType: 'Project',
    entityId: data.project.id,
    metadata: { sourceProjectId: request.params.projectId, labCount: data.labs.length, revision: data.project.revision },
  });
  response.status(201).json({ success: true, data, message: 'Project duplicated as DRAFT' });
}));

router.put('/projects/reorder', asyncHandler(async (request, response) => {
  const data = await portfolioOrchestratorService.reorderProjects(parseReorder(request.body));
  await recordAdminAudit(request, {
    action: 'ORCHESTRATOR_PROJECT_REORDER',
    entityType: 'Project',
    metadata: { count: data.length },
  });
  response.json({ success: true, data, message: 'Projects reordered successfully' });
}));

router.post('/projects/:projectId/validate', asyncHandler(async (request, response) => {
  const data = await portfolioOrchestratorService.validateProject(request.params.projectId);
  await recordAdminAudit(request, {
    action: 'ORCHESTRATOR_PROJECT_VALIDATE',
    entityType: 'Project',
    entityId: request.params.projectId,
    metadata: validationMetadata(data),
  });
  response.json({ success: true, data });
}));

router.get('/projects/:projectId/preview', asyncHandler(async (request, response) => {
  response.json({ success: true, data: await portfolioOrchestratorService.previewProject(request.params.projectId) });
}));

router.post('/projects/:projectId/publish', asyncHandler(async (request, response) => {
  const data = await portfolioOrchestratorService.publishProject(request.params.projectId, parsePublish(request.body));
  await recordAdminAudit(request, {
    action: 'ORCHESTRATOR_PROJECT_PUBLISH',
    entityType: 'Project',
    entityId: request.params.projectId,
    metadata: {
      revision: data.project.revision,
      readyLabCount: data.labs.filter((entry) => entry.status === 'READY').length,
      errors: data.validation.errors,
      warnings: data.validation.warnings,
    },
  });
  response.json({ success: true, data, message: 'Project published successfully' });
}));

router.post('/projects/:projectId/archive', asyncHandler(async (request, response) => {
  const data = await portfolioOrchestratorService.archiveProject(request.params.projectId, parseExpectedRevision(request.body));
  await recordAdminAudit(request, {
    action: 'ORCHESTRATOR_PROJECT_ARCHIVE',
    entityType: 'Project',
    entityId: request.params.projectId,
    metadata: { revision: data.project.revision },
  });
  response.json({ success: true, data, message: 'Project archived successfully' });
}));

router.post('/projects/:projectId/restore-draft', asyncHandler(async (request, response) => {
  const parsed = parseRestoreDraft(request.body);
  const data = await portfolioOrchestratorService.restoreProject(request.params.projectId, parsed.expectedRevision, parsed.lifecycleStatus);
  await recordAdminAudit(request, {
    action: 'ORCHESTRATOR_PROJECT_RESTORE_DRAFT',
    entityType: 'Project',
    entityId: request.params.projectId,
    metadata: { revision: data.project.revision, lifecycleStatus: data.project.lifecycleStatus },
  });
  response.json({ success: true, data, message: 'Project restored to DRAFT successfully' });
}));

router.get('/projects/:projectId/export', asyncHandler(async (request, response) => {
  const data = await portfolioOrchestratorService.exportProject(request.params.projectId);
  await recordAdminAudit(request, {
    action: 'ORCHESTRATOR_EXPORT',
    entityType: 'Project',
    entityId: request.params.projectId,
    metadata: { schemaVersion: data.schemaVersion, labCount: data.labs.length },
  });
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Content-Disposition', `attachment; filename="${attachmentName(data.project.slug, 'project-bundle')}"`);
  response.json(data);
}));

router.delete('/projects/:projectId', requireRole('SUPER_ADMIN'), asyncHandler(async (request, response) => {
  await portfolioOrchestratorService.deleteProjectPermanent(request.params.projectId, parseDeleteConfirmation(request.body));
  await recordAdminAudit(request, {
    action: 'ORCHESTRATOR_PROJECT_DELETE_PERMANENT',
    entityType: 'Project',
    entityId: request.params.projectId,
  });
  response.json({ success: true, message: 'Project permanently deleted' });
}));

router.post('/projects/:projectId/labs', asyncHandler(async (request, response) => {
  const data = await portfolioOrchestratorService.createLab(request.params.projectId, parseOrchestratorLabCreate(request.body));
  const lab = data.labs.find((entry) => entry.slug === request.body?.slug) ?? data.labs.at(-1);
  await recordAdminAudit(request, {
    action: 'ORCHESTRATOR_LAB_CREATE',
    entityType: 'Lab',
    entityId: lab?.id,
    metadata: { projectId: request.params.projectId, revision: lab?.revision ?? 1 },
  });
  response.status(201).json({ success: true, data, message: 'Draft Lab created successfully' });
}));

router.patch('/labs/:labId', asyncHandler(async (request, response) => {
  const data = await portfolioOrchestratorService.updateLab(request.params.labId, parseOrchestratorLabUpdate(request.body));
  await recordAdminAudit(request, {
    action: 'ORCHESTRATOR_LAB_UPDATE',
    entityType: 'Lab',
    entityId: data.id,
    metadata: { revision: data.revision, status: data.status },
  });
  response.json({ success: true, data, message: 'Lab updated successfully' });
}));

router.post('/labs/:labId/duplicate', asyncHandler(async (request, response) => {
  const data = await portfolioOrchestratorService.duplicateLab(request.params.labId, parseLabDuplicate(request.body));
  await recordAdminAudit(request, {
    action: 'ORCHESTRATOR_LAB_DUPLICATE',
    entityType: 'Lab',
    entityId: data.id,
    metadata: { sourceLabId: request.params.labId, projectId: data.projectId, revision: data.revision },
  });
  response.status(201).json({ success: true, data, message: 'Lab duplicated as DRAFT' });
}));

router.put('/projects/:projectId/labs/reorder', asyncHandler(async (request, response) => {
  const data = await portfolioOrchestratorService.reorderLabs(request.params.projectId, parseReorder(request.body));
  await recordAdminAudit(request, {
    action: 'ORCHESTRATOR_LAB_REORDER',
    entityType: 'Lab',
    entityId: request.params.projectId,
    metadata: { count: data.length, projectId: request.params.projectId },
  });
  response.json({ success: true, data, message: 'Labs reordered successfully' });
}));

router.post('/labs/:labId/validate', asyncHandler(async (request, response) => {
  const data = await portfolioOrchestratorService.validateLab(request.params.labId);
  await recordAdminAudit(request, {
    action: 'ORCHESTRATOR_LAB_VALIDATE',
    entityType: 'Lab',
    entityId: request.params.labId,
    metadata: validationMetadata(data),
  });
  response.json({ success: true, data });
}));

router.get('/labs/:labId/preview', asyncHandler(async (request, response) => {
  response.json({ success: true, data: await portfolioOrchestratorService.previewLab(request.params.labId) });
}));

router.post('/labs/:labId/mark-ready', asyncHandler(async (request, response) => {
  const data = await portfolioOrchestratorService.markLabReady(request.params.labId, parseExpectedRevision(request.body));
  await recordAdminAudit(request, {
    action: 'ORCHESTRATOR_LAB_READY',
    entityType: 'Lab',
    entityId: request.params.labId,
    metadata: { revision: data.lab.revision, errors: data.validation.errors, warnings: data.validation.warnings },
  });
  response.json({ success: true, data, message: 'Lab marked READY successfully' });
}));

router.post('/labs/:labId/archive', asyncHandler(async (request, response) => {
  const data = await portfolioOrchestratorService.archiveLab(request.params.labId, parseExpectedRevision(request.body));
  await recordAdminAudit(request, {
    action: 'ORCHESTRATOR_LAB_ARCHIVE',
    entityType: 'Lab',
    entityId: request.params.labId,
    metadata: { revision: data.lab.revision, deletedRuntimeCount: data.deletedRuntimes },
  });
  response.json({ success: true, data, message: 'Lab archived successfully' });
}));

router.post('/labs/:labId/reset-runtimes', asyncHandler(async (request, response) => {
  const data = await portfolioOrchestratorService.resetLabRuntimes(request.params.labId);
  await recordAdminAudit(request, {
    action: 'ORCHESTRATOR_LAB_RUNTIME_RESET',
    entityType: 'Lab',
    entityId: request.params.labId,
    metadata: { deletedRuntimeCount: data.deletedRuntimes },
  });
  response.json({ success: true, data, message: 'Scenario runtimes reset successfully' });
}));

router.get('/labs/:labId/export', asyncHandler(async (request, response) => {
  const networkingCompanion = request.query.format === 'networking-companion';
  const data = networkingCompanion
    ? await portfolioOrchestratorService.exportNetworkingCompanion(request.params.labId)
    : await portfolioOrchestratorService.exportLab(request.params.labId);
  await recordAdminAudit(request, {
    action: 'ORCHESTRATOR_EXPORT',
    entityType: 'Lab',
    entityId: request.params.labId,
    metadata: { schemaVersion: data.schemaVersion, format: networkingCompanion ? 'networking-companion' : 'lab-bundle' },
  });
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Content-Disposition', `attachment; filename="${attachmentName(data.lab.slug, networkingCompanion ? 'networking-companion' : 'lab-bundle')}"`);
  response.json(data);
}));

router.delete('/labs/:labId', requireRole('SUPER_ADMIN'), asyncHandler(async (request, response) => {
  await portfolioOrchestratorService.deleteLabPermanent(request.params.labId, parseDeleteConfirmation(request.body));
  await recordAdminAudit(request, {
    action: 'ORCHESTRATOR_LAB_DELETE_PERMANENT',
    entityType: 'Lab',
    entityId: request.params.labId,
  });
  response.json({ success: true, message: 'Lab permanently deleted' });
}));

router.post('/import/dry-run', importLimiter, asyncHandler(async (request, response) => {
  const parsed = parseImport(request.body);
  const data = await portfolioOrchestratorService.importDryRun(parsed);
  await recordAdminAudit(request, {
    action: 'ORCHESTRATOR_IMPORT_DRY_RUN',
    entityType: 'PortfolioBundle',
    metadata: {
      schemaVersion: data.schemaVersion,
      conflictMode: data.conflictMode,
      errors: data.errors.length,
      warnings: data.warnings.length,
      counts: data.counts,
    },
  });
  response.json({ success: true, data });
}));

router.post('/import', importLimiter, asyncHandler(async (request, response) => {
  const parsed = parseImport(request.body);
  const data = await portfolioOrchestratorService.importBundle(parsed);
  await recordAdminAudit(request, {
    action: 'ORCHESTRATOR_IMPORT',
    entityType: 'PortfolioBundle',
    entityId: data.projectId,
    metadata: {
      schemaVersion: data.dryRun.schemaVersion,
      conflictMode: data.dryRun.conflictMode,
      labCount: data.labIds.length,
      importedAsDraft: true,
    },
  });
  response.status(201).json({ success: true, data, message: 'Bundle imported as DRAFT' });
}));

router.get('/artifacts', asyncHandler(async (request, response) => {
  response.json({ success: true, data: await portfolioOrchestratorService.listArtifacts(parseArtifactQuery(request.query as Record<string, unknown>)) });
}));

router.get('/artifacts/:artifactId', asyncHandler(async (request, response) => {
  response.json({ success: true, data: await portfolioOrchestratorService.getArtifact(request.params.artifactId) });
}));

router.patch('/artifacts/:artifactId', asyncHandler(async (request, response) => {
  const data = await portfolioOrchestratorService.updateArtifact(request.params.artifactId, parseArtifactUpdate(request.body));
  await recordAdminAudit(request, {
    action: 'ORCHESTRATOR_ARTIFACT_UPDATE',
    entityType: 'Artifact',
    entityId: request.params.artifactId,
    metadata: { projectId: data.projectId, labId: data.labId, isPublic: data.isPublic },
  });
  response.json({ success: true, data, message: 'Artifact reference updated successfully' });
}));

router.delete('/artifacts/:artifactId', asyncHandler(async (request, response) => {
  await portfolioOrchestratorService.deleteArtifact(request.params.artifactId);
  await recordAdminAudit(request, {
    action: 'ORCHESTRATOR_ARTIFACT_DELETE',
    entityType: 'Artifact',
    entityId: request.params.artifactId,
  });
  response.json({ success: true, message: 'Artifact reference deleted successfully' });
}));

export default router;
