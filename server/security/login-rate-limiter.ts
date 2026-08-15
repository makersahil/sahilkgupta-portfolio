import { TooManyRequestsError } from '../lib/errors.js';

interface FailureBucket {
  failures: number;
  resetAt: number;
}

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;

class LoginRateLimiter {
  private readonly failures = new Map<string, FailureBucket>();

  private key(ipAddress: string | undefined, email: string): string {
    return `${ipAddress || 'unknown'}|${email.trim().toLowerCase()}`;
  }

  assertAllowed(ipAddress: string | undefined, email: string): void {
    const key = this.key(ipAddress, email);
    const bucket = this.failures.get(key);
    if (!bucket) return;

    const now = Date.now();
    if (bucket.resetAt <= now) {
      this.failures.delete(key);
      return;
    }

    if (bucket.failures >= MAX_FAILURES) {
      throw new TooManyRequestsError('Too many failed login attempts. Try again later.');
    }
  }

  recordFailure(ipAddress: string | undefined, email: string): void {
    const key = this.key(ipAddress, email);
    const now = Date.now();
    const current = this.failures.get(key);

    if (!current || current.resetAt <= now) {
      this.failures.set(key, { failures: 1, resetAt: now + WINDOW_MS });
      return;
    }

    current.failures += 1;
  }

  clear(ipAddress: string | undefined, email: string): void {
    this.failures.delete(this.key(ipAddress, email));
  }
}

export const loginRateLimiter = new LoginRateLimiter();
