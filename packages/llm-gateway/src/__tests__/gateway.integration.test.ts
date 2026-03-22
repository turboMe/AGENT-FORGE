import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMGateway } from '../gateway.js';
import type { GatewayConfig, ILLMProvider, ProviderGenerateResult } from '../types.js';
import { LLMError } from '@agentforge/shared';

/**
 * Integration tests — tests the full gateway stack
 * (Router → RateLimiter → CircuitBreaker → Provider → CostTracker)
 * using mocked HTTP (no real API keys needed).
 */

vi.mock('../providers/index.js', () => ({
  createProvider: vi.fn(),
  AnthropicProvider: vi.fn(),
  OpenAIProvider: vi.fn(),
  BaseLLMProvider: vi.fn(),
}));

let callCount: Record<string, number>;

function createControllableProvider(
  name: 'anthropic' | 'openai',
  successAfter = 0,
): ILLMProvider {
  let calls = 0;
  return {
    name,
    generate: vi.fn().mockImplementation(async (): Promise<ProviderGenerateResult> => {
      calls++;
      callCount[name] = (callCount[name] ?? 0) + 1;

      if (calls <= successAfter) {
        throw new LLMError(name, `${name} temporarily unavailable`, 502);
      }

      return {
        content: `Response from ${name} (call #${calls})`,
        tokensInput: 100 * calls,
        tokensOutput: 50 * calls,
      };
    }),
  };
}

describe('LLMGateway Integration', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    callCount = {};
  });

  it('should complete full flow: route → execute → track cost', async () => {
    const anthropic = createControllableProvider('anthropic');
    const openai = createControllableProvider('openai');

    const { createProvider } = await import('../providers/index.js');
    (createProvider as ReturnType<typeof vi.fn>).mockImplementation((name: string) =>
      name === 'anthropic' ? anthropic : openai,
    );

    const config: GatewayConfig = {
      providers: {
        anthropic: { apiKey: 'test' },
        openai: { apiKey: 'test' },
      },
      retry: { maxRetries: 0, baseDelayMs: 10, maxDelayMs: 50, backoffMultiplier: 2 },
    };

    const gateway = new LLMGateway(config);

    // Request with complexity=complex → should route to Claude
    const result = await gateway.generate({
      prompt: 'Write a complex analysis',
      complexity: 'complex',
    });

    expect(result.provider).toBe('anthropic');
    expect(result.content).toContain('anthropic');
    expect(result.costEstimate).toBeGreaterThan(0);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);

    // Cost tracker should have the record
    const summary = gateway.getCostSummary();
    expect(summary.requestCount).toBe(1);
    expect(summary.byProvider['anthropic']).toBeDefined();
  });

  it('should circuit-break and fallback after repeated failures', async () => {
    // Anthropic fails every time
    const anthropic = createControllableProvider('anthropic', Infinity);
    const openai = createControllableProvider('openai');

    const { createProvider } = await import('../providers/index.js');
    (createProvider as ReturnType<typeof vi.fn>).mockImplementation((name: string) =>
      name === 'anthropic' ? anthropic : openai,
    );

    const config: GatewayConfig = {
      providers: {
        anthropic: { apiKey: 'test' },
        openai: { apiKey: 'test' },
      },
      retry: { maxRetries: 1, baseDelayMs: 10, maxDelayMs: 50, backoffMultiplier: 2 },
      circuitBreaker: { failureThreshold: 3, resetTimeoutMs: 60_000 },
    };

    const gateway = new LLMGateway(config);

    // First request: Claude fails (with retries) → falls back to GPT
    const result1 = await gateway.generate({
      prompt: 'Request 1',
      quality: 'best',
    });
    expect(result1.provider).toBe('openai');

    // Second request: Again Claude fails → GPT
    const result2 = await gateway.generate({
      prompt: 'Request 2',
      quality: 'best',
    });
    expect(result2.provider).toBe('openai');

    // Circuit should be OPEN for anthropic now
    const cbState = gateway.getCircuitBreaker().getState('anthropic');
    expect(cbState).toBe('OPEN');
  });

  it('should respect rate limits', async () => {
    const openai = createControllableProvider('openai');
    const anthropic = createControllableProvider('anthropic');

    const { createProvider } = await import('../providers/index.js');
    (createProvider as ReturnType<typeof vi.fn>).mockImplementation((name: string) =>
      name === 'anthropic' ? anthropic : openai,
    );

    const config: GatewayConfig = {
      providers: {
        openai: { apiKey: 'test' },
        anthropic: { apiKey: 'test' },
      },
      rateLimits: {
        openai: { requestsPerMinute: 2 },
      },
      retry: { maxRetries: 0, baseDelayMs: 10, maxDelayMs: 50, backoffMultiplier: 2 },
    };

    const gateway = new LLMGateway(config);

    // Two requests should work
    await gateway.generate({ prompt: 'Request 1', quality: 'fast' });
    await gateway.generate({ prompt: 'Request 2', quality: 'fast' });

    // Third should hit rate limit → throw but fallback to anthropic
    const result3 = await gateway.generate({ prompt: 'Request 3', quality: 'fast' });
    // Rate limit on openai → falls back to anthropic
    expect(result3.provider).toBe('anthropic');
  });

  it('should aggregate costs across multiple providers', async () => {
    const anthropic = createControllableProvider('anthropic');
    const openai = createControllableProvider('openai');

    const { createProvider } = await import('../providers/index.js');
    (createProvider as ReturnType<typeof vi.fn>).mockImplementation((name: string) =>
      name === 'anthropic' ? anthropic : openai,
    );

    const config: GatewayConfig = {
      providers: {
        anthropic: { apiKey: 'test' },
        openai: { apiKey: 'test' },
      },
      retry: { maxRetries: 0, baseDelayMs: 10, maxDelayMs: 50, backoffMultiplier: 2 },
    };

    const gateway = new LLMGateway(config);

    await gateway.generate({ prompt: 'Complex task', complexity: 'complex' }); // → anthropic
    await gateway.generate({ prompt: 'Simple task', complexity: 'simple' }); // → openai
    await gateway.generate({ prompt: 'Another complex', quality: 'best' }); // → anthropic

    const summary = gateway.getCostSummary();
    expect(summary.requestCount).toBe(3);
    expect(summary.byProvider['anthropic']?.requests).toBe(2);
    expect(summary.byProvider['openai']?.requests).toBe(1);
    expect(summary.totalCost).toBeGreaterThan(0);
  });
});
