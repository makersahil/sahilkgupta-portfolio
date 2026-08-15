import { ValidationError } from '../../lib/errors.js';

export function requireNonBlank(value: string, field: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${field} is required`);
  }
}

export function validateOptionalNonBlank(value: string | undefined, field: string): void {
  if (value !== undefined) requireNonBlank(value, field);
}

export function validateFiniteNumber(value: number, field: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ValidationError(`${field} must be a finite number`);
  }
}

export function validateOptionalFiniteNumber(value: number | undefined, field: string): void {
  if (value !== undefined) validateFiniteNumber(value, field);
}

export function validateInteger(value: number, field: string): void {
  validateFiniteNumber(value, field);
  if (!Number.isInteger(value)) {
    throw new ValidationError(`${field} must be an integer`);
  }
}

export function validateOptionalInteger(value: number | undefined, field: string): void {
  if (value !== undefined) validateInteger(value, field);
}

export function validateBoolean(value: boolean, field: string): void {
  if (typeof value !== 'boolean') {
    throw new ValidationError(`${field} must be a boolean`);
  }
}

export function validateOptionalBoolean(value: boolean | undefined, field: string): void {
  if (value !== undefined) validateBoolean(value, field);
}

export function validateStringArray(value: string[], field: string): void {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new ValidationError(`${field} must be an array of strings`);
  }
}

export function validateOptionalStringArray(value: string[] | undefined, field: string): void {
  if (value !== undefined) validateStringArray(value, field);
}

export function validateIsoDate(value: string, field: string): void {
  requireNonBlank(value, field);
  if (Number.isNaN(Date.parse(value))) {
    throw new ValidationError(`${field} must be a valid date`);
  }
}

export function validateOptionalIsoDate(value: string | undefined, field: string): void {
  if (value !== undefined) validateIsoDate(value, field);
}

export function validateEnum<T extends string>(
  value: T,
  allowed: ReadonlySet<string>,
  field: string,
): void {
  if (typeof value !== 'string' || !allowed.has(value)) {
    throw new ValidationError(`${field} has an unsupported value`);
  }
}

export function validateOptionalEnum<T extends string>(
  value: T | undefined,
  allowed: ReadonlySet<string>,
  field: string,
): void {
  if (value !== undefined) validateEnum(value, allowed, field);
}
