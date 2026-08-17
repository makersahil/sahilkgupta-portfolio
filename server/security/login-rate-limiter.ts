import { env } from '../config/env.js';
import { TooManyRequestsError } from '../lib/errors.js';
import { databaseRateLimitService, type DatabaseRateLimitService } from './rate-limit.service.js';

const POLICY = { scope: 'auth.failed-login', limit: 5, windowMs: 15 * 60 * 1_000 } as const;

class LoginRateLimiter {
  constructor(private readonly service: DatabaseRateLimitService = databaseRateLimitService) {}

  private key(ipAddress: string | undefined, email: string): string {
    return `${ipAddress || 'unknown'}|${email.trim().toLowerCase()}`;
  }

  async assertAllowed(ipAddress: string | undefined, email: string): Promise<void> {
    if (!env.RATE_LIMIT_ENABLED) return;
    const result = await this.service.inspect(POLICY, this.key(ipAddress, email));
    if (!result.allowed) {
      throw new TooManyRequestsError('Too many failed login attempts. Try again later.', {
        retryAfterSeconds: result.retryAfterSeconds,
      });
    }
  }

  async recordFailure(ipAddress: string | undefined, email: string): Promise<void> {
    if (!env.RATE_LIMIT_ENABLED) return;
    await this.service.consume(POLICY, this.key(ipAddress, email));
  }

  async clear(ipAddress: string | undefined, email: string): Promise<void> {
    await this.service.clear(POLICY, this.key(ipAddress, email));
  }
}

export const loginRateLimiter = new LoginRateLimiter();
