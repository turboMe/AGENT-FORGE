import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicProvider } from '../../providers/anthropic.js';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  const APIError = class extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = 'APIError';
    }
  };

  const MockAnthropic = vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn(),
    },
  }));

  // Attach APIError to the constructor for `instanceof` checks
  (MockAnthropic as any).APIError = APIError;

  return {
    default: MockAnthropic,
    APIError,
  };
});

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    provider = new AnthropicProvider({ apiKey: 'test-key' });
    // Access the mocked client
    const client = new Anthropic({ apiKey: 'test' });
    mockCreate = client.messages.create as ReturnType<typeof vi.fn>;
    // Re-assign mocked create to provider's internal client
    (provider as any).client.messages.create = mockCreate;
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('anthropic');
  });

  it('should generate successfully', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Hello from Claude!' }],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    const result = await provider.generate({
      prompt: 'Say hello',
      model: 'claude-sonnet-4-5',
      maxTokens: 1024,
      temperature: 0.7,
    });

    expect(result.content).toBe('Hello from Claude!');
    expect(result.tokensInput).toBe(100);
    expect(result.tokensOutput).toBe(50);
  });

  it('should pass system prompt when provided', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Response' }],
      usage: { input_tokens: 50, output_tokens: 25 },
    });

    await provider.generate({
      prompt: 'Test',
      systemPrompt: 'You are a helpful assistant',
      model: 'claude-sonnet-4-5',
      maxTokens: 1024,
      temperature: 0.7,
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        system: 'You are a helpful assistant',
        messages: [{ role: 'user', content: 'Test' }],
      }),
    );
  });

  it('should handle empty content blocks', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [],
      usage: { input_tokens: 10, output_tokens: 0 },
    });

    const result = await provider.generate({
      prompt: 'Test',
      model: 'claude-sonnet-4-5',
      maxTokens: 1024,
      temperature: 0.7,
    });

    expect(result.content).toBe('');
  });

  it('should throw LLMError on API error', async () => {
    const { APIError } = await import('@anthropic-ai/sdk');
    mockCreate.mockRejectedValueOnce(new APIError(500, 'Internal server error'));

    await expect(
      provider.generate({
        prompt: 'Test',
        model: 'claude-sonnet-4-5',
        maxTokens: 1024,
        temperature: 0.7,
      }),
    ).rejects.toThrow('Anthropic API error');
  });

  it('should throw LLMError with 429 status on rate limit', async () => {
    const { APIError } = await import('@anthropic-ai/sdk');
    mockCreate.mockRejectedValueOnce(new APIError(429, 'Rate limited'));

    try {
      await provider.generate({
        prompt: 'Test',
        model: 'claude-sonnet-4-5',
        maxTokens: 1024,
        temperature: 0.7,
      });
      expect.fail('Should have thrown');
    } catch (error: any) {
      expect(error.statusCode).toBe(429);
    }
  });

  it('should throw LLMError on unknown errors', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Network timeout'));

    await expect(
      provider.generate({
        prompt: 'Test',
        model: 'claude-sonnet-4-5',
        maxTokens: 1024,
        temperature: 0.7,
      }),
    ).rejects.toThrow('Anthropic request failed');
  });
});
