import { Router } from 'express';
import { scenarioSessionFromRequest } from '../lib/scenario-session.js';
import { asyncHandler } from '../middlewares/async-handler.js';
import { linuxOperationsService, linuxService } from '../services/linux/index.js';

const router = Router();

function optionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

router.get('/labs', asyncHandler(async (request, response) => {
  response.json({ success: true, data: await linuxService.listPublic(optionalText(request.query.projectSlug)) });
}));

router.get('/labs/:identifier/hosts/:hostKey', asyncHandler(async (request, response) => {
  response.json({
    success: true,
    data: await linuxService.getHost(request.params.identifier, request.params.hostKey, scenarioSessionFromRequest(request)),
  });
}));

router.get('/labs/:identifier/operations', asyncHandler(async (request, response) => {
  response.json({
    success: true,
    data: await linuxOperationsService.getOperations(
      request.params.identifier,
      optionalText(request.query.hostKey),
      scenarioSessionFromRequest(request),
    ),
  });
}));

router.get('/labs/:identifier/context', asyncHandler(async (request, response) => {
  response.json({
    success: true,
    data: await linuxOperationsService.getContext(
      request.params.identifier,
      optionalText(request.query.hostKey),
      scenarioSessionFromRequest(request),
    ),
  });
}));

router.get('/labs/:identifier', asyncHandler(async (request, response) => {
  response.json({ success: true, data: await linuxService.getPublic(request.params.identifier, scenarioSessionFromRequest(request)) });
}));

export default router;
