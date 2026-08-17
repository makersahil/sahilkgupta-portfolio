import { Router } from 'express';

import { ValidationError } from '../lib/errors.js';
import { requireScenarioSession, scenarioSessionFromRequest } from '../lib/scenario-session.js';
import { asyncHandler } from '../middlewares/async-handler.js';
import { createRateLimitMiddleware } from '../middlewares/rate-limit.middleware.js';
import { scenarioEngineService } from '../services/scenarios/index.js';

const router = Router();
const mutationLimiter = createRateLimitMiddleware({
  policy: { scope: 'scenario.mutation', limit: 60, windowMs: 5 * 60 * 1_000 },
  key: (request) => `${request.ip ?? 'unknown'}|${scenarioSessionFromRequest(request) ?? 'missing'}`,
  message: 'Too many scenario mutations. Try again later.',
});

router.get('/labs/:identifier', asyncHandler(async (request, response) => {
  response.json({
    success: true,
    data: await scenarioEngineService.getOverview(request.params.identifier, scenarioSessionFromRequest(request)),
  });
}));

router.post('/labs/:identifier/run', mutationLimiter, asyncHandler(async (request, response) => {
  const scenarioSlug = typeof request.body?.scenarioSlug === 'string' ? request.body.scenarioSlug.trim() : '';
  if (!scenarioSlug) throw new ValidationError('scenarioSlug is required', { field: 'scenarioSlug' });
  response.json({
    success: true,
    data: await scenarioEngineService.run(request.params.identifier, requireScenarioSession(request), scenarioSlug),
  });
}));

router.post('/labs/:identifier/verify', mutationLimiter, asyncHandler(async (request, response) => {
  response.json({
    success: true,
    data: await scenarioEngineService.verify(request.params.identifier, requireScenarioSession(request)),
  });
}));

router.post('/labs/:identifier/remediate', mutationLimiter, asyncHandler(async (request, response) => {
  response.json({
    success: true,
    data: await scenarioEngineService.remediate(request.params.identifier, requireScenarioSession(request)),
  });
}));

router.delete('/labs/:identifier/runtime', mutationLimiter, asyncHandler(async (request, response) => {
  response.json({
    success: true,
    data: await scenarioEngineService.reset(request.params.identifier, requireScenarioSession(request)),
  });
}));

export default router;
