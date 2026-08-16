import { Router } from 'express';

import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../middlewares/async-handler.js';
import { labManifestService, labService } from '../services/labs/index.js';
import { portfolioOrchestratorService, parseDeleteConfirmation } from '../services/orchestrator/index.js';
import { recordAdminAudit } from './admin-audit.js';
import {
  optionalLabQuery,
  parseEvidenceCreate,
  parseEvidenceUpdate,
  parseLabCreate,
  parseLabDomain,
  parseLabSourceCreate,
  parseLabSourceUpdate,
  parseLabUpdate,
  parseOptionalLabDomain,
  parseOptionalLabKind,
  parseOptionalLabStatus,
  parseRunbookCreate,
  parseRunbookUpdate,
  parseScenarioCreate,
  parseScenarioUpdate,
  parseTopology,
} from './lab-platform-input.js';

const router = Router();
const adminOnly = [authenticateToken, requireRole('SUPER_ADMIN', 'ADMIN')] as const;

router.get('/registry/:domain', (request, response, next) => {
  try {
    const domain = parseLabDomain(request.params.domain);
    response.json({ success: true, data: labService.listInputRegistry(domain) });
  } catch (error) { next(error); }
});

router.get('/admin', ...adminOnly, asyncHandler(async (request, response) => {
  const labs = await labService.listAdmin({
    projectId: optionalLabQuery(request.query.projectId, 'projectId'),
    projectSlug: optionalLabQuery(request.query.projectSlug, 'projectSlug'),
    domain: parseOptionalLabDomain(request.query.domain),
    kind: parseOptionalLabKind(request.query.kind),
    status: parseOptionalLabStatus(request.query.status),
  });
  response.json({ success: true, data: labs });
}));

router.get('/admin/:identifier/manifest', ...adminOnly, asyncHandler(async (request, response) => {
  response.json({ success: true, data: await labManifestService.preview(request.params.identifier) });
}));

router.get('/admin/:identifier', ...adminOnly, asyncHandler(async (request, response) => {
  response.json({ success: true, data: await labService.getAdmin(request.params.identifier) });
}));

router.get('/', asyncHandler(async (request, response) => {
  const labs = await labService.listPublic({
    projectId: optionalLabQuery(request.query.projectId, 'projectId'),
    projectSlug: optionalLabQuery(request.query.projectSlug, 'projectSlug'),
    domain: parseOptionalLabDomain(request.query.domain),
    kind: parseOptionalLabKind(request.query.kind),
  });
  response.json({ success: true, data: labs });
}));

router.get('/:identifier/manifest', asyncHandler(async (request, response) => {
  response.json({ success: true, data: await labManifestService.getPublic(request.params.identifier) });
}));

router.get('/:identifier', asyncHandler(async (request, response) => {
  response.json({ success: true, data: await labService.getPublic(request.params.identifier) });
}));

router.post('/', ...adminOnly, asyncHandler(async (request, response) => {
  const data = await labService.create(parseLabCreate(request.body));
  await recordAdminAudit(request, { action: 'LAB_CREATE', entityType: 'Lab', entityId: data.id, metadata: { projectId: data.projectId, status: data.status } });
  response.status(201).json({ success: true, data, message: 'Lab created successfully' });
}));

router.put('/:id', ...adminOnly, asyncHandler(async (request, response) => {
  const data = await labService.update(request.params.id, parseLabUpdate(request.body));
  await recordAdminAudit(request, { action: 'LAB_UPDATE', entityType: 'Lab', entityId: data.id, metadata: { status: data.status } });
  response.json({ success: true, data, message: 'Lab updated successfully' });
}));

router.delete('/:id', authenticateToken, requireRole('SUPER_ADMIN'), asyncHandler(async (request, response) => {
  await portfolioOrchestratorService.deleteLabPermanent(request.params.id, parseDeleteConfirmation(request.body));
  await recordAdminAudit(request, { action: 'LAB_DELETE', entityType: 'Lab', entityId: request.params.id });
  response.json({ success: true, message: 'Lab deleted successfully' });
}));

router.post('/:labId/inputs', ...adminOnly, asyncHandler(async (request, response) => {
  const data = await labService.createInput(request.params.labId, parseLabSourceCreate(request.body));
  await recordAdminAudit(request, { action: 'LAB_INPUT_CREATE', entityType: 'LabInput', entityId: data.id, metadata: { labId: request.params.labId, inputType: data.inputType } });
  response.status(201).json({ success: true, data });
}));

router.put('/:labId/inputs/:inputId', ...adminOnly, asyncHandler(async (request, response) => {
  const data = await labService.updateInput(request.params.labId, request.params.inputId, parseLabSourceUpdate(request.body));
  await recordAdminAudit(request, { action: 'LAB_INPUT_UPDATE', entityType: 'LabInput', entityId: data.id, metadata: { labId: request.params.labId } });
  response.json({ success: true, data });
}));

router.delete('/:labId/inputs/:inputId', ...adminOnly, asyncHandler(async (request, response) => {
  await labService.deleteInput(request.params.labId, request.params.inputId);
  await recordAdminAudit(request, { action: 'LAB_INPUT_DELETE', entityType: 'LabInput', entityId: request.params.inputId, metadata: { labId: request.params.labId } });
  response.json({ success: true });
}));

router.put('/:labId/topology', ...adminOnly, asyncHandler(async (request, response) => {
  const topology = parseTopology(request.body);
  const data = await labService.replaceTopology(request.params.labId, topology.nodes, topology.links);
  await recordAdminAudit(request, { action: 'LAB_TOPOLOGY_REPLACE', entityType: 'Lab', entityId: request.params.labId, metadata: { nodeCount: data.nodes.length, linkCount: data.links.length } });
  response.json({ success: true, data });
}));

router.post('/:labId/scenarios', ...adminOnly, asyncHandler(async (request, response) => {
  const data = await labService.createScenario(request.params.labId, parseScenarioCreate(request.body));
  await recordAdminAudit(request, { action: 'LAB_SCENARIO_CREATE', entityType: 'LabScenario', entityId: data.id, metadata: { labId: request.params.labId } });
  response.status(201).json({ success: true, data });
}));

router.put('/:labId/scenarios/:scenarioId', ...adminOnly, asyncHandler(async (request, response) => {
  const data = await labService.updateScenario(request.params.labId, request.params.scenarioId, parseScenarioUpdate(request.body));
  await recordAdminAudit(request, { action: 'LAB_SCENARIO_UPDATE', entityType: 'LabScenario', entityId: data.id, metadata: { labId: request.params.labId } });
  response.json({ success: true, data });
}));

router.delete('/:labId/scenarios/:scenarioId', ...adminOnly, asyncHandler(async (request, response) => {
  await labService.deleteScenario(request.params.labId, request.params.scenarioId);
  await recordAdminAudit(request, { action: 'LAB_SCENARIO_DELETE', entityType: 'LabScenario', entityId: request.params.scenarioId, metadata: { labId: request.params.labId } });
  response.json({ success: true });
}));

router.post('/:labId/runbook', ...adminOnly, asyncHandler(async (request, response) => {
  const data = await labService.createRunbookStep(request.params.labId, parseRunbookCreate(request.body));
  await recordAdminAudit(request, { action: 'LAB_RUNBOOK_CREATE', entityType: 'LabRunbookStep', entityId: data.id, metadata: { labId: request.params.labId } });
  response.status(201).json({ success: true, data });
}));

router.put('/:labId/runbook/:stepId', ...adminOnly, asyncHandler(async (request, response) => {
  const data = await labService.updateRunbookStep(request.params.labId, request.params.stepId, parseRunbookUpdate(request.body));
  await recordAdminAudit(request, { action: 'LAB_RUNBOOK_UPDATE', entityType: 'LabRunbookStep', entityId: data.id, metadata: { labId: request.params.labId } });
  response.json({ success: true, data });
}));

router.delete('/:labId/runbook/:stepId', ...adminOnly, asyncHandler(async (request, response) => {
  await labService.deleteRunbookStep(request.params.labId, request.params.stepId);
  await recordAdminAudit(request, { action: 'LAB_RUNBOOK_DELETE', entityType: 'LabRunbookStep', entityId: request.params.stepId, metadata: { labId: request.params.labId } });
  response.json({ success: true });
}));

router.post('/:labId/evidence', ...adminOnly, asyncHandler(async (request, response) => {
  const data = await labService.createEvidence(request.params.labId, parseEvidenceCreate(request.body));
  await recordAdminAudit(request, { action: 'LAB_EVIDENCE_CREATE', entityType: 'Evidence', entityId: data.id, metadata: { labId: request.params.labId, isPublic: data.isPublic } });
  response.status(201).json({ success: true, data });
}));

router.put('/:labId/evidence/:evidenceId', ...adminOnly, asyncHandler(async (request, response) => {
  const data = await labService.updateEvidence(request.params.labId, request.params.evidenceId, parseEvidenceUpdate(request.body));
  await recordAdminAudit(request, { action: 'LAB_EVIDENCE_UPDATE', entityType: 'Evidence', entityId: data.id, metadata: { labId: request.params.labId, isPublic: data.isPublic } });
  response.json({ success: true, data });
}));

router.delete('/:labId/evidence/:evidenceId', ...adminOnly, asyncHandler(async (request, response) => {
  await labService.deleteEvidence(request.params.labId, request.params.evidenceId);
  await recordAdminAudit(request, { action: 'LAB_EVIDENCE_DELETE', entityType: 'Evidence', entityId: request.params.evidenceId, metadata: { labId: request.params.labId } });
  response.json({ success: true });
}));

export default router;
