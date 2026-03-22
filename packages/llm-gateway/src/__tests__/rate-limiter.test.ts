import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter } from '../rate-limiter.js';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('canRequest', () => {
    it('should allow requests within the limit', () => {
      const limiter = new RateLimiter({ anthropic: { requestsPerMinute: 5 } });

      expect(limiter.canRequest('anthropic')).toBe(true);
    });

    it('should reject requests at the limit', () => {
      const limiter = new RateLimiter({ anthropic: { requestsPerMinute: 3 } });

      limiter.recordRequest('anthropic');
      limiter.recordRequest('anthropic');
      limiter.recordRequest('anthropic');

      expect(limiter.canRequest('anthropic')).toBe(false);
    });

    it('should use default limit when not configured', () => {
      const limiter = new RateLimiter();
      // Default is 60 RPM, so first request should be fine
      expect(limiter.canRequest('anthropic')).toBe(true);
    });
  });

  describe('recordRequest', () => {
    it('should return true when request is allowed', () => {
      const limiter = new RateLimiter({ anthropic: { requestsPerMinute: 5 } });
      expect(limiter.recordRequest('anthropic')).toBe(true);
    });

    it('should return false when rate limited', () => {
      const limiter = new RateLimiter({ anthropic: { requestsPerMinute: 2 } });

      limiter.recordRequest('anthropic');
      limiter.recordRequest('anthropic');

      expect(limiter.recordRequest('anthropic')).toBe(false);
    });
  });

  describe('sliding window', () => {
    it('should allow requests after old ones expire', () => {
      const limiter = new RateLimiter({ anthropic: { requestsPerMinute: 2 } });

      limiter.recordRequest('anthropic');
      limiter.recordRequest('anthropic');
      expect(limiter.canRequest('anthropic')).toBe(false);

      // Advance 61 seconds — old requests should be pruned
      vi.advanceTimersByTime(61_000);

      expect(limiter.canRequest('anthropic')).toBe(true);
      expect(limiter.recordRequest('anthropic')).toBe(true);
    });
  });

  describe('getRemainingCapacity', () => {
    it('should return full capacity when no requests made', () => {
      const limiter = new RateLimiter({ openai: { requestsPerMinute: 10 } });
      expect(limiter.getRemainingCapacity('openai')).toBe(10);
    });

    it('should decrease as requests are made', () => {
      const limiter = new RateLimiter({ openai: { requestsPerMinute: 10 } });

      limiter.recordRequest('openai');
      limiter.recordRequest('openai');
      limiter.recordRequest('openai');

      expect(limiter.getRemainingCapacity('openai')).toBe(7);
    });

    it('should return 0 at capacity', () => {
      const limiter = new RateLimiter({ openai: { requestsPerMinute: 2 } });

      limiter.recordRequest('openai');
      limiter.recordRequest('openai');

      expect(limiter.getRemainingCapacity('openai')).toBe(0);
    });
  });

  describe('isolation', () => {
    it('should track providers independently', () => {
      const limiter = new RateLimiter({
        anthropic: { requestsPerMinute: 2 },
        openai: { requestsPerMinute: 3 },
      });

      limiter.recordRequest('anthropic');
      limiter.recordRequest('anthropic');

      expect(limiter.canRequest('anthropic')).toBe(false);
      expect(limiter.canRequest('openai')).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset a specific provider', () => {
      const limiter = new RateLimiter({ anthropic: { requestsPerMinute: 2 } });

      limiter.recordRequest('anthropic');
      limiter.recordRequest('anthropic');
      expect(limiter.canRequest('anthropic')).toBe(false);

      limiter.reset('anthropic');
      expect(limiter.canRequest('anthropic')).toBe(true);
    });

    it('should reset all providers', () => {
      const limiter = new RateLimiter({
        anthropic: { requestsPerMinute: 1 },
        openai: { requestsPerMinute: 1 },
      });

      limiter.recordRequest('anthropic');
      limiter.recordRequest('openai');

      limiter.resetAll();
      expect(limiter.canRequest('anthropic')).toBe(true);
      expect(limiter.canRequest('openai')).toBe(true);
    });
  });
});
