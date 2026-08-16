import { Router } from 'express';

import { ValidationError } from '../lib/errors.js';
import { requireScenarioSession, scenarioSessionFromRequest } from '../lib/scenario-session.js';
import { asyncHandler } from '../middlewares/async-handler.js';
import { scenarioEngineService } from '../services/scenarios/index.js';

const router = Router();

router.get('/labs/:identifier', asyncHandler(async (request, response) => {
  response.json({
    success: true,
    data: await scenarioEngineService.getOverview(request.params.identifier, scenarioSessionFromRequest(request)),
  });
}));

router.post('/labs/:identifier/run', asyncHandler(async (request, response) => {
  const scenarioSlug = typeof request.body?.scenarioSlug === 'string' ? request.body.scenarioSlug.trim() : '';
  if (!scenarioSlug) throw new ValidationError('scenarioSlug is required', { field: 'scenarioSlug' });
  response.json({
    success: true,
    data: await scenarioEngineService.run(request.params.identifier, requireScenarioSession(request), scenarioSlug),
  });
}));

router.post('/labs/:identifier/verify', asyncHandler(async (request, response) => {
  response.json({
    success: true,
    data: await scenarioEngineService.verify(request.params.identifier, requireScenarioSession(request)),
  });
}));

router.post('/labs/:identifier/remediate', asyncHandler(async (request, response) => {
  response.json({
    success: true,
    data: await scenarioEngineService.remediate(request.params.identifier, requireScenarioSession(request)),
  });
}));

router.delete('/labs/:identifier/runtime', asyncHandler(async (request, response) => {
  response.json({
    success: true,
    data: await scenarioEngineService.reset(request.params.identifier, requireScenarioSession(request)),
  });
}));

export default router;
