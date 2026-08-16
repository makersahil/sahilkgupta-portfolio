import { Router } from 'express';

import { ValidationError } from '../lib/errors.js';
import { scenarioSessionFromRequest } from '../lib/scenario-session.js';
import { asyncHandler } from '../middlewares/async-handler.js';
import { unifiedCliService } from '../services/cli/index.js';

const router = Router();

function optionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

router.get('/bootstrap', asyncHandler(async (request, response) => {
  response.json({
    success: true,
    data: await unifiedCliService.bootstrap(
      optionalText(request.query.category) ?? optionalText(request.query.domain),
      scenarioSessionFromRequest(request),
    ),
  });
}));

router.post('/exec', asyncHandler(async (request, response) => {
  if (typeof request.body?.command !== 'string') throw new ValidationError('command is required', { field: 'command' });
  response.json(await unifiedCliService.execute(
    request.body.command,
    optionalText(request.body?.contextId),
    optionalText(request.body?.category),
    scenarioSessionFromRequest(request),
  ));
}));

export default router;
