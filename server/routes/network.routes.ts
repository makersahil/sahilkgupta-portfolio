import { Router } from 'express';

import { ValidationError } from '../lib/errors.js';
import { asyncHandler } from '../middlewares/async-handler.js';
import { networkingService } from '../services/networking/index.js';

const router = Router();

function optionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function requiredText(value: unknown, field: string): string {
  const normalized = optionalText(value);
  if (!normalized) throw new ValidationError(`${field} is required`, { field });
  return normalized;
}

// Public, data-driven Networking Lab endpoints.
router.get('/labs', asyncHandler(async (request, response) => {
  response.json({
    success: true,
    data: await networkingService.listPublic(optionalText(request.query.projectSlug)),
  });
}));

router.get('/labs/:identifier/devices/:nodeKey', asyncHandler(async (request, response) => {
  response.json({
    success: true,
    data: await networkingService.getDevice(request.params.identifier, request.params.nodeKey),
  });
}));

router.post('/labs/:identifier/trace', asyncHandler(async (request, response) => {
  response.json({
    success: true,
    data: await networkingService.tracePath(
      request.params.identifier,
      requiredText(request.body?.sourceDeviceKey ?? request.body?.sourceId, 'sourceDeviceKey'),
      requiredText(request.body?.targetDeviceKey ?? request.body?.targetId, 'targetDeviceKey'),
      optionalText(request.body?.protocol) ?? 'ICMP',
    ),
  });
}));

router.get('/labs/:identifier', asyncHandler(async (request, response) => {
  response.json({ success: true, data: await networkingService.getPublic(request.params.identifier) });
}));

// Durable compatibility endpoints for older UI/integrations. Both resolve from
// persisted canonical Lab state; no route-local topology or random output remains.
router.get('/topology', asyncHandler(async (request, response) => {
  const identifier =
    optionalText(request.query.lab) ??
    optionalText(request.query.labId) ??
    optionalText(request.query.labSlug);
  response.json({ success: true, data: await networkingService.getCompatibilityTopology(identifier) });
}));

router.post('/simulate-packet', asyncHandler(async (request, response) => {
  const identifier =
    optionalText(request.body?.labIdentifier) ??
    optionalText(request.body?.labId) ??
    optionalText(request.body?.labSlug);

  response.json({
    success: true,
    data: await networkingService.tracePath(
      identifier,
      requiredText(request.body?.sourceDeviceKey ?? request.body?.sourceId, 'sourceDeviceKey'),
      requiredText(request.body?.targetDeviceKey ?? request.body?.targetId, 'targetDeviceKey'),
      optionalText(request.body?.protocol) ?? 'ICMP',
    ),
  });
}));

export default router;
