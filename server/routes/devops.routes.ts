import { Router } from 'express';
import { scenarioSessionFromRequest } from '../lib/scenario-session.js';
import { asyncHandler } from '../middlewares/async-handler.js';
import { devOpsOperationsService, devOpsService } from '../services/devops/index.js';

const router = Router();

function optionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

router.get('/labs', asyncHandler(async (request, response) => {
  response.json({ success: true, data: await devOpsService.listPublic(optionalText(request.query.projectSlug)) });
}));

router.get('/labs/:identifier/operations', asyncHandler(async (request, response) => {
  response.json({
    success: true,
    data: await devOpsOperationsService.getOperations(request.params.identifier, scenarioSessionFromRequest(request)),
  });
}));

router.get('/labs/:identifier/context', asyncHandler(async (request, response) => {
  response.json({
    success: true,
    data: await devOpsOperationsService.getContext(
      request.params.identifier,
      optionalText(request.query.pipelineId),
      scenarioSessionFromRequest(request),
    ),
  });
}));

router.get('/labs/:identifier/pipelines/:pipelineId', asyncHandler(async (request, response) => {
  response.json({
    success: true,
    data: await devOpsService.getPipeline(request.params.identifier, request.params.pipelineId, scenarioSessionFromRequest(request)),
  });
}));

router.get('/labs/:identifier', asyncHandler(async (request, response) => {
  response.json({ success: true, data: await devOpsService.getPublic(request.params.identifier, scenarioSessionFromRequest(request)) });
}));

export default router;
