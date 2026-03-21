import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMGateway } from '../gateway.js';
import type { GatewayConfig, ILLMProvider, ProviderGenerateParams, ProviderGenerateResult } from '../types.js';
import { LLMError } from '@agentforge/shared';

// Mock the providers module to inject controllable mocks
vi.mock('../providers/index.js', () => ({
  createProvider: vi.fn(),
  AnthropicProvider: vi.fn(),
  OpenAIProvider: vi.fn(),
  BaseLLMProvider: vi.fn(),
}));

function createMockProvider(
  name: 'anthropic' | 'openai',
  result?: Partial<ProviderGenerateResult>,
  shouldFail = false,
  failError?: Error,
): ILLMProvider {
  return {
    name,
    generate: vi.fn().mockImplementation(async (_params: ProviderGenerateParams) => {
      if (shouldFail) {
        throw failError ?? new LLMError(name, `${name} failed`, 502);
      }
      return {
        content: `Response from ${name}`,
        tokensInput: 100,
        tokensOutput: 50,
        ...result,
      };
    }),
  };
}

describe('LLMGateway', () => {
  const baseConfig: GatewayConfig = {
    providers: {
      anthropic: { apiKey: 'test-anthropic-key' },
      openai: { apiKey: 'test-openai-key' },
    },
    retry: { maxRetries: 1, baseDelayMs: 10, maxDelayMs: 50, backoffMultiplier: 2 },
  };

  let mockAnthropicProvider: ILLMProvider;
  let mockOpenAIProvider: ILLMProvider;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockAnthropicProvider = createMockProvider('anthropic', {
      content: 'Claude response',
      tokensInput: 200,
      tokensOutput: 100,
    });

    mockOpenAIProvider = createMockProvider('openai', {
      content: 'GPT response',
      tokensInput: 80,
      tokensOutput: 30,
    });

    const { createProvider } = await import('../providers/index.js');
    (createProvider as ReturnType<typeof vi.fn>).mockImplementation((name: string) => {
      if (name === 'anthropic') return mockAnthropicProvider;
      if (name === 'openai') return mockOpenAIProvider;
      throw new Error(`Unknown provider: ${name}`);
    });
  });

  it('should generate using router-selected model', async () => {
    const gateway = new LLMGateway(baseConfig);

    const result = await gateway.generate({
      prompt: 'Say hello',
      quality: 'best',
    });

    expect(result.content).toBe('Claude response');
    expect(result.provider).toBe('anthropic');
    expect(result.model).toBe('claude-sonnet-4-5');
    expect(result.tokensInput).toBe(200);
    expect(result.tokensOutput).toBe(100);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.costEstimate).toBeGreaterThan(0);
  });

  it('should select cheap model for fast quality', async () => {
    const gateway = new LLMGateway(baseConfig);

    const result = await gateway.generate({
      prompt: 'Quick task',
      quality: 'fast',
    });

    expect(result.content).toBe('GPT response');
    expect(result.provider).toBe('openai');
    expect(result.model).toBe('gpt-4o-mini');
  });

  it('should select model based on complexity', async () => {
    const gateway = new LLMGateway(baseConfig);

    const simpleResult = await gateway.generate({
      prompt: 'Simple task',
      complexity: 'simple',
    });
    expect(simpleResult.provider).toBe('openai');

    const complexResult = await gateway.generate({
      prompt: 'Complex task',
      complexity: 'complex',
    });
    expect(complexResult.provider).toBe('anthropic');
  });

  it('should fallback to alternative provider on failure', async () => {
    // Make anthropic fail
    mockAnthropicProvider = createMockProvider('anthropic', {}, true);

    const { createProvider } = await import('../providers/index.js');
    (createProvider as ReturnType<typeof vi.fn>).mockImplementation((name: string) => {
      if (name === 'anthropic') return mockAnthropicProvider;
      if (name === 'openai') return mockOpenAIProvider;
      throw new Error(`Unknown: ${name}`);
    });

    const gateway = new LLMGateway(baseConfig);

    const result = await gateway.generate({
      prompt: 'Task',
      quality: 'best', // Would normally select Claude
    });

    // Should fall back to OpenAI
    expect(result.content).toBe('GPT response');
    expect(result.provider).toBe('openai');
  });

  it('should throw when all providers fail', async () => {
    mockAnthropicProvider = createMockProvider('anthropic', {}, true);
    mockOpenAIProvider = createMockProvider('openai', {}, true);

    const { createProvider } = await import('../providers/index.js');
    (createProvider as ReturnType<typeof vi.fn>).mockImplementation((name: string) => {
      if (name === 'anthropic') return mockAnthropicProvider;
      if (name === 'openai') return mockOpenAIProvider;
      throw new Error(`Unknown: ${name}`);
    });

    const gateway = new LLMGateway(baseConfig);

    await expect(
      gateway.generate({ prompt: 'Task', quality: 'best' }),
    ).rejects.toThrow('All providers failed');
  });

  it('should not retry on 429 rate limit errors', async () => {
    const rateLimitError = new LLMError('anthropic', 'Rate limited', 429);
    mockAnthropicProvider = createMockProvider('anthropic', {}, true, rateLimitError);

    const { createProvider } = await import('../providers/index.js');
    (createProvider as ReturnType<typeof vi.fn>).mockImplementation((name: string) => {
      if (name === 'anthropic') return mockAnthropicProvider;
      if (name === 'openai') return mockOpenAIProvider;
      throw new Error(`Unknown: ${name}`);
    });

    const gateway = new LLMGateway(baseConfig);

    // Should fall back to OpenAI (not retry anthropic)
    const result = await gateway.generate({
      prompt: 'Task',
      quality: 'best',
    });

    // Anthropic generate called only once (no retry on 429)
    expect(mockAnthropicProvider.generate).toHaveBeenCalledTimes(1);
    expect(result.provider).toBe('openai');
  });

  it('should track costs across requests', async () => {
    const gateway = new LLMGateway(baseConfig);

    await gateway.generate({ prompt: 'Task 1', quality: 'fast' });
    await gateway.generate({ prompt: 'Task 2', quality: 'best' });

    const summary = gateway.getCostSummary();
    expect(summary.requestCount).toBe(2);
    expect(summary.totalCost).toBeGreaterThan(0);
    expect(summary.totalTokensInput).toBeGreaterThan(0);
  });
});
