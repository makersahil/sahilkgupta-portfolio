export type ApplicationErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PERSISTENCE_UNAVAILABLE'
  | 'CONFIGURATION_ERROR'
  | 'RATE_LIMITED'
  | 'PAYLOAD_TOO_LARGE'
  | 'INTEGRITY_ERROR'
  | 'SERVER_ERROR';

export class ApplicationError extends Error {
  public readonly statusCode: number;
  public readonly code: ApplicationErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code: ApplicationErrorCode,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, new.target);
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class PersistenceUnavailableError extends ApplicationError {
  constructor(message = 'Persistent storage is currently unavailable') {
    super(message, 503, 'PERSISTENCE_UNAVAILABLE');
  }
}


export class TooManyRequestsError extends ApplicationError {
  constructor(message = 'Too many requests', details?: Record<string, unknown>) {
    super(message, 429, 'RATE_LIMITED', details);
  }
}

export class PayloadTooLargeError extends ApplicationError {
  constructor(message = 'Request payload is too large', details?: Record<string, unknown>) {
    super(message, 413, 'PAYLOAD_TOO_LARGE', details);
  }
}

export class IntegrityError extends ApplicationError {
  constructor(message = 'Stored artifact failed integrity verification', details?: Record<string, unknown>) {
    super(message, 409, 'INTEGRITY_ERROR', details);
  }
}

export class ConfigurationError extends ApplicationError {
  constructor(message: string) {
    super(message, 500, 'CONFIGURATION_ERROR');
  }
}

interface ErrorLike {
  name?: unknown;
  code?: unknown;
  message?: unknown;
  status?: unknown;
  statusCode?: unknown;
}

const PRISMA_UNAVAILABLE_CODES = new Set([
  'P1000',
  'P1001',
  'P1002',
  'P1003',
  'P1008',
  'P1011',
  'P1017',
  'P2022',
  'P2024',
  'P2034',
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENOTFOUND',
  'ETIMEDOUT',
  '57P01',
  '57P02',
  '57P03',
]);

export function normalizeApplicationError(error: unknown): ApplicationError {
  if (error instanceof ApplicationError) {
    return error;
  }

  const candidate = error as ErrorLike | null;
  const errorCode = typeof candidate?.code === 'string' ? candidate.code : undefined;
  const errorName = typeof candidate?.name === 'string' ? candidate.name : undefined;

  if (errorCode === 'P2002') {
    return new ConflictError('A record with the same unique value already exists');
  }

  if (errorCode === 'P2003') {
    return new ConflictError('The record is still referenced by related content');
  }

  if (errorCode === 'P2025') {
    return new NotFoundError('The requested record was not found');
  }

  if (errorName === 'PayloadTooLargeError' || errorCode === 'LIMIT_FILE_SIZE' || errorCode === 'entity.too.large') {
    return new PayloadTooLargeError();
  }

  if (errorName === 'SyntaxError' && typeof candidate?.message === 'string' && candidate.message.includes('JSON')) {
    return new ValidationError('Request body contains invalid JSON');
  }

  if (
    (errorCode && PRISMA_UNAVAILABLE_CODES.has(errorCode)) ||
    errorName === 'PrismaClientInitializationError' ||
    errorName === 'PrismaClientRustPanicError'
  ) {
    return new PersistenceUnavailableError();
  }

  const httpStatus =
    typeof candidate?.statusCode === 'number'
      ? candidate.statusCode
      : typeof candidate?.status === 'number'
        ? candidate.status
        : undefined;

  if (httpStatus && httpStatus >= 400 && httpStatus <= 599) {
    const message = httpStatus >= 500
      ? 'Internal Server Error'
      : typeof candidate?.message === 'string' ? candidate.message : 'Request failed';
    return new ApplicationError(message, httpStatus, 'SERVER_ERROR');
  }

  return new ApplicationError('Internal Server Error', 500, 'SERVER_ERROR');
}
