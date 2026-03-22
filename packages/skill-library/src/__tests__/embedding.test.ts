import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmbeddingService } from '../embedding.js';

// ── Mock Anthropic SDK ──────────────────────────────

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      post: vi.fn(),
    })),
  };
});

describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let mockPost: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    service = new EmbeddingService({ apiKey: 'test-api-key' });

    // Access the mocked post method
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const instance = new Anthropic({ apiKey: 'test' });
    mockPost = instance.post as ReturnType<typeof vi.fn>;

    // Replace the service's client.post with our mock
    // @ts-expect-error - accessing private property for test
    service.client = { post: mockPost };
  });

  describe('buildEmbeddingText', () => {
    it('should concatenate relevant skill fields', () => {
      const skill = {
        name: 'cold-outreach-writer',
        description: 'Writes cold outreach emails for sales',
        domain: ['sales', 'email'],
        tags: ['cold', 'outreach'],
        template: {
          persona: 'Expert sales copywriter',
          process: ['Analyze target', 'Draft email'],
          outputFormat: 'Email format',
          constraints: ['No spam'],
          systemPrompt: 'You are...',
        },
      };

      const text = service.buildEmbeddingText(skill);

      expect(text).toContain('cold-outreach-writer');
      expect(text).toContain('Writes cold outreach emails for sales');
      expect(text).toContain('sales');
      expect(text).toContain('email');
      expect(text).toContain('cold');
      expect(text).toContain('outreach');
      expect(text).toContain('Expert sales copywriter');
      expect(text).toContain('Analyze target');
      expect(text).toContain('Draft email');
    });

    it('should filter out empty/falsy values', () => {
      const skill = {
        name: 'test-skill',
        description: 'Test',
        domain: ['test', ''],
        tags: [],
        template: {
          persona: 'A persona',
          process: [],
          outputFormat: 'Text',
          constraints: [],
          systemPrompt: 'Prompt',
        },
      };

      const text = service.buildEmbeddingText(skill);
      expect(text).not.toContain('  '); // no double spaces from empty fields
    });
  });

  describe('generateEmbedding', () => {
    it('should call Voyage API with document input_type', async () => {
      const fakeEmbedding = Array.from({ length: 1024 }, (_, i) => i * 0.001);
      mockPost.mockResolvedValue({
        data: [{ embedding: fakeEmbedding }],
      });

      const result = await service.generateEmbedding('test text');

      expect(mockPost).toHaveBeenCalledWith('/v1/embeddings', {
        body: {
          model: 'voyage-3',
          input: 'test text',
          input_type: 'document',
        },
      });
      expect(result).toEqual(fakeEmbedding);
      expect(result).toHaveLength(1024);
    });

    it('should throw on empty response', async () => {
      mockPost.mockResolvedValue({ data: [] });

      await expect(service.generateEmbedding('test')).rejects.toThrow(
        'Failed to generate embedding: empty response',
      );
    });
  });

  describe('generateQueryEmbedding', () => {
    it('should call Voyage API with query input_type', async () => {
      const fakeEmbedding = Array.from({ length: 1024 }, (_, i) => i * 0.001);
      mockPost.mockResolvedValue({
        data: [{ embedding: fakeEmbedding }],
      });

      const result = await service.generateQueryEmbedding('search query');

      expect(mockPost).toHaveBeenCalledWith('/v1/embeddings', {
        body: {
          model: 'voyage-3',
          input: 'search query',
          input_type: 'query',
        },
      });
      expect(result).toEqual(fakeEmbedding);
    });

    it('should throw on empty response', async () => {
      mockPost.mockResolvedValue({ data: [] });

      await expect(service.generateQueryEmbedding('test')).rejects.toThrow(
        'Failed to generate query embedding: empty response',
      );
    });
  });

  describe('custom model', () => {
    it('should use custom model when provided', async () => {
      const customService = new EmbeddingService({
        apiKey: 'test-key',
        model: 'voyage-code-3',
      });

      const fakeEmbedding = [0.1, 0.2, 0.3];
      const customMockPost = vi.fn().mockResolvedValue({
        data: [{ embedding: fakeEmbedding }],
      });

      // @ts-expect-error - accessing private property for test
      customService.client = { post: customMockPost };

      await customService.generateEmbedding('code snippet');

      expect(customMockPost).toHaveBeenCalledWith('/v1/embeddings', {
        body: expect.objectContaining({
          model: 'voyage-code-3',
        }),
      });
    });
  });
});
