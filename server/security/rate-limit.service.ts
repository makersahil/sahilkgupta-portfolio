import { createHmac } from 'node:crypto';

import type { PrismaClient } from '@prisma/client';

import { env } from '../config/env.js';
import { TooManyRequestsError } from '../lib/errors.js';
import { getJwtSecret } from '../lib/auth-token.js';
import { prisma } from '../lib/prisma.js';

export interface RateLimitPolicy {
  scope: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  retryAfterSeconds: number;
  resetAt: Date;
}

function policyValue(value: number, field: string, minimum: number): number {
  if (!Number.isInteger(value) || value < minimum) throw new Error(`${field} is invalid`);
  return value;
}

function windowStart(now: Date, windowMs: number): Date {
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
}

function keyHash(scope: string, key: string): string {
  const secret = env.RATE_LIMIT_HASH_SECRET || getJwtSecret();
  return createHmac('sha256', secret).update(`${scope}|${key}`).digest('hex');
}

export class DatabaseRateLimitService {
  constructor(private readonly client: PrismaClient = prisma) {}

  async inspect(policy: RateLimitPolicy, key: string, now = new Date()): Promise<RateLimitResult> {
    const limit = policyValue(policy.limit, 'limit', 1);
    const duration = policyValue(policy.windowMs, 'windowMs', 1_000);
    const start = windowStart(now, duration);
    const resetAt = new Date(start.getTime() + duration);
    if (!env.RATE_LIMIT_ENABLED) {
      return { allowed: true, count: 0, limit, retryAfterSeconds: 0, resetAt };
    }
    const row = await this.client.rateLimitBucket.findUnique({
      where: { scope_keyHash_windowStart: { scope: policy.scope, keyHash: keyHash(policy.scope, key), windowStart: start } },
      select: { count: true },
    });
    const count = row?.count ?? 0;
    return {
      allowed: count < limit,
      count,
      limit,
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1_000)),
      resetAt,
    };
  }

  async consume(policy: RateLimitPolicy, key: string, now = new Date()): Promise<RateLimitResult> {
    const limit = policyValue(policy.limit, 'limit', 1);
    const duration = policyValue(policy.windowMs, 'windowMs', 1_000);
    const start = windowStart(now, duration);
    const resetAt = new Date(start.getTime() + duration);
    if (!env.RATE_LIMIT_ENABLED) {
      return { allowed: true, count: 1, limit, retryAfterSeconds: 0, resetAt };
    }
    const hash = keyHash(policy.scope, key);
    let row;
    try {
      row = await this.client.rateLimitBucket.upsert({
        where: { scope_keyHash_windowStart: { scope: policy.scope, keyHash: hash, windowStart: start } },
        create: { scope: policy.scope, keyHash: hash, windowStart: start, count: 1, expiresAt: new Date(resetAt.getTime() + duration) },
        update: { count: { increment: 1 }, expiresAt: new Date(resetAt.getTime() + duration) },
        select: { count: true },
      });
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? (error as { code?: unknown }).code : undefined;
      if (code !== 'P2002') throw error;
      row = await this.client.rateLimitBucket.update({
        where: { scope_keyHash_windowStart: { scope: policy.scope, keyHash: hash, windowStart: start } },
        data: { count: { increment: 1 } },
        select: { count: true },
      });
    }
    const retryAfterSeconds = Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1_000));
    return { allowed: row.count <= limit, count: row.count, limit, retryAfterSeconds, resetAt };
  }

  async assertAllowed(policy: RateLimitPolicy, key: string, message = 'Too many requests'): Promise<RateLimitResult> {
    const result = await this.consume(policy, key);
    if (!result.allowed) {
      throw new TooManyRequestsError(message, { retryAfterSeconds: result.retryAfterSeconds, scope: policy.scope });
    }
    return result;
  }

  async clear(policy: Pick<RateLimitPolicy, 'scope'>, key: string): Promise<void> {
    if (!env.RATE_LIMIT_ENABLED) return;
    await this.client.rateLimitBucket.deleteMany({ where: { scope: policy.scope, keyHash: keyHash(policy.scope, key) } });
  }

  async prune(now = new Date()): Promise<number> {
    const result = await this.client.rateLimitBucket.deleteMany({ where: { expiresAt: { lte: now } } });
    return result.count;
  }
}

export const databaseRateLimitService = new DatabaseRateLimitService();
