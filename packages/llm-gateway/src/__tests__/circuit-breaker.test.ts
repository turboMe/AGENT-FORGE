import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CircuitBreaker } from '../circuit-breaker.js';

describe('CircuitBreaker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should start in CLOSED state', () => {
      const cb = new CircuitBreaker();
      expect(cb.getState('anthropic')).toBe('CLOSED');
    });

    it('should allow requests in CLOSED state', () => {
      const cb = new CircuitBreaker();
      expect(cb.canRequest('anthropic')).toBe(true);
    });
  });

  describe('failure tracking', () => {
    it('should remain CLOSED below failure threshold', () => {
      const cb = new CircuitBreaker({ failureThreshold: 5 });

      for (let i = 0; i < 4; i++) {
        cb.recordFailure('anthropic');
      }

      expect(cb.getState('anthropic')).toBe('CLOSED');
      expect(cb.canRequest('anthropic')).toBe(true);
    });

    it('should transition to OPEN at failure threshold', () => {
      const cb = new CircuitBreaker({ failureThreshold: 3 });

      cb.recordFailure('anthropic');
      cb.recordFailure('anthropic');
      cb.recordFailure('anthropic');

      expect(cb.getState('anthropic')).toBe('OPEN');
      expect(cb.canRequest('anthropic')).toBe(false);
    });

    it('should isolate circuits per provider', () => {
      const cb = new CircuitBreaker({ failureThreshold: 2 });

      cb.recordFailure('anthropic');
      cb.recordFailure('anthropic');

      expect(cb.getState('anthropic')).toBe('OPEN');
      expect(cb.getState('openai')).toBe('CLOSED');
    });
  });

  describe('HALF_OPEN transition', () => {
    it('should transition to HALF_OPEN after reset timeout', () => {
      const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 5000 });

      cb.recordFailure('anthropic');
      cb.recordFailure('anthropic');
      expect(cb.getState('anthropic')).toBe('OPEN');

      // Advance time past reset timeout
      vi.advanceTimersByTime(5001);

      expect(cb.getState('anthropic')).toBe('HALF_OPEN');
      expect(cb.canRequest('anthropic')).toBe(true);
    });

    it('should NOT transition to HALF_OPEN before reset timeout', () => {
      const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 5000 });

      cb.recordFailure('anthropic');
      cb.recordFailure('anthropic');

      vi.advanceTimersByTime(3000);

      expect(cb.getState('anthropic')).toBe('OPEN');
    });
  });

  describe('success recovery', () => {
    it('should reset to CLOSED on success', () => {
      const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 1000 });

      cb.recordFailure('anthropic');
      cb.recordFailure('anthropic');
      expect(cb.getState('anthropic')).toBe('OPEN');

      vi.advanceTimersByTime(1001);
      expect(cb.getState('anthropic')).toBe('HALF_OPEN');

      cb.recordSuccess('anthropic');
      expect(cb.getState('anthropic')).toBe('CLOSED');
      expect(cb.canRequest('anthropic')).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset a specific provider', () => {
      const cb = new CircuitBreaker({ failureThreshold: 2 });

      cb.recordFailure('anthropic');
      cb.recordFailure('anthropic');
      expect(cb.getState('anthropic')).toBe('OPEN');

      cb.reset('anthropic');
      expect(cb.getState('anthropic')).toBe('CLOSED');
    });

    it('should reset all providers', () => {
      const cb = new CircuitBreaker({ failureThreshold: 2 });

      cb.recordFailure('anthropic');
      cb.recordFailure('anthropic');
      cb.recordFailure('openai');
      cb.recordFailure('openai');

      cb.resetAll();
      expect(cb.getState('anthropic')).toBe('CLOSED');
      expect(cb.getState('openai')).toBe('CLOSED');
    });
  });
});
