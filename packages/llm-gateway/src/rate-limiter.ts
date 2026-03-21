import type { LLMProviderName, RateLimiterConfig } from './types.js';

const DEFAULT_CONFIG: RateLimiterConfig = {
  requestsPerMinute: 60,
};

const WINDOW_MS = 60_000; // 1 minute

interface SlidingWindowEntry {
  timestamps: number[];
}

/**
 * In-memory sliding-window rate limiter (per provider).
 */
export class RateLimiter {
  private readonly limits: Map<LLMProviderName, RateLimiterConfig> = new Map();
  private readonly windows: Map<LLMProviderName, SlidingWindowEntry> = new Map();

  constructor(limits?: Partial<Record<LLMProviderName, RateLimiterConfig>>) {
    if (limits) {
      for (const [provider, config] of Object.entries(limits)) {
        if (config) {
          this.limits.set(provider as LLMProviderName, config);
        }
      }
    }
  }

  /**
   * Check if a request to this provider is allowed.
   */
  canRequest(provider: LLMProviderName): boolean {
    const limit = this.getLimit(provider);
    const window = this.getOrCreateWindow(provider);
    this.pruneOldEntries(window);
    return window.timestamps.length < limit.requestsPerMinute;
  }

  /**
   * Record a request to this provider.
   * Returns true if the request was allowed, false if rate limited.
   */
  recordRequest(provider: LLMProviderName): boolean {
    if (!this.canRequest(provider)) {
      return false;
    }
    const window = this.getOrCreateWindow(provider);
    window.timestamps.push(Date.now());
    return true;
  }

  /**
   * Get remaining capacity for a provider.
   */
  getRemainingCapacity(provider: LLMProviderName): number {
    const limit = this.getLimit(provider);
    const window = this.getOrCreateWindow(provider);
    this.pruneOldEntries(window);
    return Math.max(0, limit.requestsPerMinute - window.timestamps.length);
  }

  /**
   * Reset rate limit state for a provider.
   */
  reset(provider: LLMProviderName): void {
    this.windows.delete(provider);
  }

  /**
   * Reset all rate limit state.
   */
  resetAll(): void {
    this.windows.clear();
  }

  private getLimit(provider: LLMProviderName): RateLimiterConfig {
    return this.limits.get(provider) ?? DEFAULT_CONFIG;
  }

  private getOrCreateWindow(provider: LLMProviderName): SlidingWindowEntry {
    let window = this.windows.get(provider);
    if (!window) {
      window = { timestamps: [] };
      this.windows.set(provider, window);
    }
    return window;
  }

  private pruneOldEntries(window: SlidingWindowEntry): void {
    const cutoff = Date.now() - WINDOW_MS;
    window.timestamps = window.timestamps.filter((t) => t > cutoff);
  }
}
