import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIProvider } from '../../providers/openai.js';

// Mock the OpenAI SDK
vi.mock('openai', () => {
  const APIError = class extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = 'APIError';
    }
  };

  const MockOpenAI = vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  }));

  (MockOpenAI as any).APIError = APIError;

  return {
    default: MockOpenAI,
    APIError,
  };
});

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const OpenAI = (await import('openai')).default;
    provider = new OpenAIProvider({ apiKey: 'test-key' });
    const client = new OpenAI({ apiKey: 'test' });
    mockCreate = client.chat.completions.create as ReturnType<typeof vi.fn>;
    (provider as any).client.chat.completions.create = mockCreate;
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('openai');
  });

  it('should generate successfully', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'Hello from GPT!' } }],
      usage: { prompt_tokens: 80, completion_tokens: 30 },
    });

    const result = await provider.generate({
      prompt: 'Say hello',
      model: 'gpt-4o-mini',
      maxTokens: 1024,
      temperature: 0.7,
    });

    expect(result.content).toBe('Hello from GPT!');
    expect(result.tokensInput).toBe(80);
    expect(result.tokensOutput).toBe(30);
  });

  it('should pass system message when systemPrompt provided', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'Response' } }],
      usage: { prompt_tokens: 50, completion_tokens: 20 },
    });

    await provider.generate({
      prompt: 'Test',
      systemPrompt: 'You are a helpful assistant',
      model: 'gpt-4o-mini',
      maxTokens: 1024,
      temperature: 0.7,
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Test' },
        ],
      }),
    );
  });

  it('should handle missing usage data gracefully', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'Response' } }],
      usage: null,
    });

    const result = await provider.generate({
      prompt: 'Test',
      model: 'gpt-4o-mini',
      maxTokens: 1024,
      temperature: 0.7,
    });

    expect(result.tokensInput).toBe(0);
    expect(result.tokensOutput).toBe(0);
  });

  it('should handle empty choices', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [],
      usage: { prompt_tokens: 10, completion_tokens: 0 },
    });

    const result = await provider.generate({
      prompt: 'Test',
      model: 'gpt-4o-mini',
      maxTokens: 1024,
      temperature: 0.7,
    });

    expect(result.content).toBe('');
  });

  it('should throw LLMError on API error', async () => {
    const { APIError } = await import('openai');
    mockCreate.mockRejectedValueOnce(new APIError(500, 'Internal server error'));

    await expect(
      provider.generate({
        prompt: 'Test',
        model: 'gpt-4o-mini',
        maxTokens: 1024,
        temperature: 0.7,
      }),
    ).rejects.toThrow('OpenAI API error');
  });

  it('should throw LLMError with 429 status on rate limit', async () => {
    const { APIError } = await import('openai');
    mockCreate.mockRejectedValueOnce(new APIError(429, 'Rate limited'));

    try {
      await provider.generate({
        prompt: 'Test',
        model: 'gpt-4o-mini',
        maxTokens: 1024,
        temperature: 0.7,
      });
      expect.fail('Should have thrown');
    } catch (error: any) {
      expect(error.statusCode).toBe(429);
    }
  });

  it('should throw LLMError on unknown errors', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Connection reset'));

    await expect(
      provider.generate({
        prompt: 'Test',
        model: 'gpt-4o-mini',
        maxTokens: 1024,
        temperature: 0.7,
      }),
    ).rejects.toThrow('OpenAI request failed');
  });
});
