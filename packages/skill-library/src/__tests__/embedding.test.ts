import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmbeddingService } from '../embedding.js';

describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    service = new EmbeddingService({ apiKey: 'test-api-key' });

    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: fakeEmbedding }],
        }),
      });

      const result = await service.generateEmbedding('test text');

      expect(mockFetch).toHaveBeenCalledWith('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key',
        },
        body: JSON.stringify({
          model: 'voyage-3',
          input: 'test text',
          input_type: 'document',
        }),
      });
      expect(result).toEqual(fakeEmbedding);
      expect(result).toHaveLength(1024);
    });

    it('should throw on empty response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await expect(service.generateEmbedding('test')).rejects.toThrow(
        'Failed to generate embedding: empty response',
      );
    });
  });

  describe('generateQueryEmbedding', () => {
    it('should call Voyage API with query input_type', async () => {
      const fakeEmbedding = Array.from({ length: 1024 }, (_, i) => i * 0.001);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: fakeEmbedding }],
        }),
      });

      const result = await service.generateQueryEmbedding('search query');

      expect(mockFetch).toHaveBeenCalledWith('https://api.voyageai.com/v1/embeddings', expect.objectContaining({
        body: expect.stringContaining('"input_type":"query"'),
      }));
      expect(result).toEqual(fakeEmbedding);
    });

    it('should throw on empty response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await expect(service.generateQueryEmbedding('test')).rejects.toThrow(
        'Failed to generate embedding: empty response',
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
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: fakeEmbedding }],
        }),
      });

      await customService.generateEmbedding('code snippet');

      expect(mockFetch).toHaveBeenCalledWith('https://api.voyageai.com/v1/embeddings', expect.objectContaining({
        body: expect.stringContaining('"model":"voyage-code-3"'),
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
        }),
      }));
    });
  });
});
