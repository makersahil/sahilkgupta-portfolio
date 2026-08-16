import type { Request } from 'express';

import { ValidationError } from './errors.js';

const SESSION_HEADER = 'x-lab-session';
const SESSION_PATTERN = /^[A-Za-z0-9_-]{16,96}$/;

export function scenarioSessionFromRequest(request: Request): string | undefined {
  const raw = request.get(SESSION_HEADER)?.trim();
  if (!raw) return undefined;
  if (!SESSION_PATTERN.test(raw)) {
    throw new ValidationError('Invalid X-Lab-Session identifier', { field: SESSION_HEADER });
  }
  return raw;
}

export function requireScenarioSession(request: Request): string {
  const session = scenarioSessionFromRequest(request);
  if (!session) {
    throw new ValidationError('X-Lab-Session header is required for scenario mutations', {
      field: SESSION_HEADER,
    });
  }
  return session;
}
