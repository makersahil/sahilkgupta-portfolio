import path from 'node:path';

import dotenv from 'dotenv';

import { ConfigurationError } from '../lib/errors.js';

dotenv.config();

export type RuntimeEnvironment = 'development' | 'test' | 'production';
export type TrustProxySetting = boolean | number | string;

function text(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function parseEnvironment(value = process.env.NODE_ENV): RuntimeEnvironment {
  const normalized = (value?.trim().toLowerCase() || 'development') as RuntimeEnvironment;
  if (!['development', 'test', 'production'].includes(normalized)) {
    throw new ConfigurationError('NODE_ENV must be development, test, or production');
  }
  return normalized;
}

function parseInteger(
  value: string | undefined,
  fallback: number,
  field: string,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new ConfigurationError(`${field} must be an integer between ${minimum} and ${maximum}`);
  }
  return parsed;
}

function parseBoolean(value: string | undefined, fallback: boolean, field: string): boolean {
  if (value === undefined || value.trim() === '') return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  throw new ConfigurationError(`${field} must be true or false`);
}

function parseCsv(value: string | undefined): string[] {
  return [...new Set((value ?? '').split(',').map((entry) => entry.trim()).filter(Boolean))];
}

function parseTrustProxy(value: string | undefined, environment: RuntimeEnvironment): TrustProxySetting {
  if (!value?.trim()) return environment === 'production' ? 1 : false;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  if (/^\d+$/.test(normalized)) return Number(normalized);
  return value.trim();
}

function validateRetiredPersistenceMode(value = process.env.PERSISTENCE_MODE): void {
  const normalized = value?.trim().toLowerCase();
  if (normalized && normalized !== 'prisma') {
    throw new ConfigurationError('Legacy persistence has been retired. Remove PERSISTENCE_MODE or set it to "prisma".');
  }
}

function absoluteHttpOrigin(value: string, field: string, environment: RuntimeEnvironment): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ConfigurationError(`${field} must be a valid absolute URL`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new ConfigurationError(`${field} must use http or https`);
  }
  if (environment === 'production' && parsed.protocol !== 'https:') {
    throw new ConfigurationError(`${field} must use https in production`);
  }
  if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new ConfigurationError(`${field} must contain only an origin without credentials, path, query, or fragment`);
  }
  return parsed.origin;
}

function httpsOrigin(value: string | undefined, environment: RuntimeEnvironment): string | undefined {
  const normalized = text(value);
  return normalized ? absoluteHttpOrigin(normalized, 'PUBLIC_ORIGIN', environment) : undefined;
}

function allowedOriginList(value: string | undefined, environment: RuntimeEnvironment): string[] {
  return parseCsv(value).map((entry) => absoluteHttpOrigin(entry, 'ALLOWED_ORIGINS entry', environment));
}

function allowedHostList(value: string | undefined): string[] {
  return parseCsv(value).map((entry) => {
    const candidate = entry.toLowerCase().replace(/\.$/, '');
    let parsed: URL;
    try {
      parsed = new URL(`http://${candidate}`);
    } catch {
      throw new ConfigurationError(`Invalid ALLOWED_HOSTS entry: ${entry}`);
    }
    if (parsed.host !== candidate || parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.username || parsed.password) {
      throw new ConfigurationError(`Invalid ALLOWED_HOSTS entry: ${entry}`);
    }
    return parsed.host;
  });
}

function requireVerifyFullDatabaseUrl(value: string, field: string): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ConfigurationError(`${field} must be a valid PostgreSQL URL`);
  }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new ConfigurationError(`${field} must use the postgresql protocol`);
  }
  if (parsed.searchParams.get('sslmode') !== 'verify-full') {
    throw new ConfigurationError(`${field} must explicitly use sslmode=verify-full in production`);
  }
}

function validateStorageDirectory(value: string | undefined, environment: RuntimeEnvironment): string {
  const resolved = path.resolve(value?.trim() || '.runtime/artifacts');
  const dist = path.resolve('dist');
  const publicDirectory = path.resolve('public');
  if (resolved === dist || resolved.startsWith(`${dist}${path.sep}`)) {
    throw new ConfigurationError('ARTIFACT_STORAGE_DIR must not be inside dist');
  }
  if (resolved === publicDirectory || resolved.startsWith(`${publicDirectory}${path.sep}`)) {
    throw new ConfigurationError('ARTIFACT_STORAGE_DIR must not be inside public');
  }
  if (environment === 'production' && !path.isAbsolute(value?.trim() || '')) {
    throw new ConfigurationError('ARTIFACT_STORAGE_DIR must be an absolute private path in production');
  }
  return resolved;
}

export interface EnvironmentSnapshot {
  NODE_ENV: RuntimeEnvironment;
  PORT: number;
  DATABASE_URL?: string;
  DIRECT_URL?: string;
  JWT_SECRET?: string;
  CSRF_SECRET?: string;
  RATE_LIMIT_HASH_SECRET?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_DISPLAY_NAME?: string;
  PUBLIC_ORIGIN?: string;
  ALLOWED_HOSTS: string[];
  ALLOWED_ORIGINS: string[];
  TRUST_PROXY: TrustProxySetting;
  REQUIRE_HTTPS: boolean;
  SECURITY_ENFORCEMENT: boolean;
  CSRF_ENFORCEMENT: boolean;
  RATE_LIMIT_ENABLED: boolean;
  REQUEST_BODY_LIMIT_BYTES: number;
  ARTIFACT_STORAGE_ENABLED: boolean;
  ARTIFACT_STORAGE_DIR: string;
  ARTIFACT_MAX_BYTES: number;
  ARTIFACT_VERIFY_ON_READ: boolean;
  SHUTDOWN_TIMEOUT_MS: number;
  READINESS_TIMEOUT_MS: number;
  HTTP_REQUEST_TIMEOUT_MS: number;
  HTTP_HEADERS_TIMEOUT_MS: number;
  HTTP_KEEP_ALIVE_TIMEOUT_MS: number;
}

export function loadEnvironment(source: NodeJS.ProcessEnv = process.env): EnvironmentSnapshot {
  const NODE_ENV = parseEnvironment(source.NODE_ENV);
  const PUBLIC_ORIGIN = httpsOrigin(source.PUBLIC_ORIGIN, NODE_ENV);
  const publicHost = PUBLIC_ORIGIN ? new URL(PUBLIC_ORIGIN).host.toLowerCase() : undefined;
  const ALLOWED_HOSTS = allowedHostList(source.ALLOWED_HOSTS);
  if (publicHost && !ALLOWED_HOSTS.includes(publicHost)) ALLOWED_HOSTS.push(publicHost);
  const ALLOWED_ORIGINS = allowedOriginList(source.ALLOWED_ORIGINS, NODE_ENV);
  if (PUBLIC_ORIGIN && !ALLOWED_ORIGINS.includes(PUBLIC_ORIGIN)) ALLOWED_ORIGINS.push(PUBLIC_ORIGIN);

  const snapshot: EnvironmentSnapshot = {
    NODE_ENV,
    PORT: parseInteger(source.PORT, 3000, 'PORT', 1, 65_535),
    DATABASE_URL: text(source.DATABASE_URL),
    DIRECT_URL: text(source.DIRECT_URL),
    JWT_SECRET: text(source.JWT_SECRET),
    CSRF_SECRET: text(source.CSRF_SECRET),
    RATE_LIMIT_HASH_SECRET: text(source.RATE_LIMIT_HASH_SECRET),
    ADMIN_EMAIL: text(source.ADMIN_EMAIL),
    ADMIN_PASSWORD: source.ADMIN_PASSWORD,
    ADMIN_DISPLAY_NAME: text(source.ADMIN_DISPLAY_NAME),
    PUBLIC_ORIGIN,
    ALLOWED_HOSTS,
    ALLOWED_ORIGINS,
    TRUST_PROXY: parseTrustProxy(source.TRUST_PROXY, NODE_ENV),
    REQUIRE_HTTPS: parseBoolean(source.REQUIRE_HTTPS, NODE_ENV === 'production', 'REQUIRE_HTTPS'),
    SECURITY_ENFORCEMENT: parseBoolean(source.SECURITY_ENFORCEMENT, NODE_ENV === 'production', 'SECURITY_ENFORCEMENT'),
    CSRF_ENFORCEMENT: parseBoolean(source.CSRF_ENFORCEMENT, NODE_ENV === 'production', 'CSRF_ENFORCEMENT'),
    RATE_LIMIT_ENABLED: parseBoolean(source.RATE_LIMIT_ENABLED, NODE_ENV === 'production', 'RATE_LIMIT_ENABLED'),
    REQUEST_BODY_LIMIT_BYTES: parseInteger(source.REQUEST_BODY_LIMIT_BYTES, 2 * 1024 * 1024, 'REQUEST_BODY_LIMIT_BYTES', 32 * 1024, 20 * 1024 * 1024),
    ARTIFACT_STORAGE_ENABLED: parseBoolean(source.ARTIFACT_STORAGE_ENABLED, true, 'ARTIFACT_STORAGE_ENABLED'),
    ARTIFACT_STORAGE_DIR: validateStorageDirectory(source.ARTIFACT_STORAGE_DIR, NODE_ENV),
    ARTIFACT_MAX_BYTES: parseInteger(source.ARTIFACT_MAX_BYTES, 10 * 1024 * 1024, 'ARTIFACT_MAX_BYTES', 1, 100 * 1024 * 1024),
    ARTIFACT_VERIFY_ON_READ: parseBoolean(source.ARTIFACT_VERIFY_ON_READ, NODE_ENV === 'production', 'ARTIFACT_VERIFY_ON_READ'),
    SHUTDOWN_TIMEOUT_MS: parseInteger(source.SHUTDOWN_TIMEOUT_MS, 15_000, 'SHUTDOWN_TIMEOUT_MS', 1_000, 120_000),
    READINESS_TIMEOUT_MS: parseInteger(source.READINESS_TIMEOUT_MS, 5_000, 'READINESS_TIMEOUT_MS', 500, 30_000),
    HTTP_REQUEST_TIMEOUT_MS: parseInteger(source.HTTP_REQUEST_TIMEOUT_MS, 30_000, 'HTTP_REQUEST_TIMEOUT_MS', 1_000, 120_000),
    HTTP_HEADERS_TIMEOUT_MS: parseInteger(source.HTTP_HEADERS_TIMEOUT_MS, 15_000, 'HTTP_HEADERS_TIMEOUT_MS', 2_000, 120_000),
    HTTP_KEEP_ALIVE_TIMEOUT_MS: parseInteger(source.HTTP_KEEP_ALIVE_TIMEOUT_MS, 5_000, 'HTTP_KEEP_ALIVE_TIMEOUT_MS', 1_000, 60_000),
  };

  if (snapshot.HTTP_HEADERS_TIMEOUT_MS > snapshot.HTTP_REQUEST_TIMEOUT_MS) {
    throw new ConfigurationError('HTTP_HEADERS_TIMEOUT_MS must not exceed HTTP_REQUEST_TIMEOUT_MS');
  }

  if (NODE_ENV === 'production') {
    if (!snapshot.DATABASE_URL) throw new ConfigurationError('DATABASE_URL is required in production');
    if (!snapshot.JWT_SECRET || snapshot.JWT_SECRET.length < 32) {
      throw new ConfigurationError('JWT_SECRET must contain at least 32 characters in production');
    }
    if (!snapshot.CSRF_SECRET || snapshot.CSRF_SECRET.length < 32) {
      throw new ConfigurationError('CSRF_SECRET must contain at least 32 characters in production');
    }
    if (!snapshot.RATE_LIMIT_HASH_SECRET || snapshot.RATE_LIMIT_HASH_SECRET.length < 32) {
      throw new ConfigurationError('RATE_LIMIT_HASH_SECRET must contain at least 32 characters in production');
    }
    if (!snapshot.PUBLIC_ORIGIN) throw new ConfigurationError('PUBLIC_ORIGIN is required in production');
    if (!source.TRUST_PROXY?.trim()) throw new ConfigurationError('TRUST_PROXY must be explicitly configured in production');
    if (snapshot.TRUST_PROXY === true) throw new ConfigurationError('TRUST_PROXY=true is too broad for production; use an explicit hop count or trusted proxy range');
    if (snapshot.ALLOWED_HOSTS.length === 0) throw new ConfigurationError('ALLOWED_HOSTS is required in production');
    if (snapshot.ALLOWED_ORIGINS.length === 0) throw new ConfigurationError('ALLOWED_ORIGINS is required in production');
    if (!snapshot.REQUIRE_HTTPS || !snapshot.SECURITY_ENFORCEMENT || !snapshot.CSRF_ENFORCEMENT || !snapshot.RATE_LIMIT_ENABLED) {
      throw new ConfigurationError('HTTPS, security, CSRF, and shared rate-limit enforcement must be enabled in production');
    }
    if (!snapshot.ARTIFACT_STORAGE_ENABLED) {
      throw new ConfigurationError('ARTIFACT_STORAGE_ENABLED must be true in production');
    }
    requireVerifyFullDatabaseUrl(snapshot.DATABASE_URL, 'DATABASE_URL');
    if (snapshot.DIRECT_URL) requireVerifyFullDatabaseUrl(snapshot.DIRECT_URL, 'DIRECT_URL');
  }

  return snapshot;
}

validateRetiredPersistenceMode();
export const env = loadEnvironment();
