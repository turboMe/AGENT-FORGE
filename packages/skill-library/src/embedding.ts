import Anthropic from '@anthropic-ai/sdk';
import type { ISkill } from '@agentforge/shared';
import type { EmbeddingConfig } from './types.js';

// ── Constants ───────────────────────────────────────

const DEFAULT_EMBEDDING_MODEL = 'voyage-3';

// ── API Response types ──────────────────────────────

interface VoyageEmbeddingResponse {
  data: { embedding: number[] }[];
}

// ── Service ─────────────────────────────────────────

export class EmbeddingService {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(config: EmbeddingConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model ?? DEFAULT_EMBEDDING_MODEL;
  }

  /**
   * Build text representation of a skill for embedding.
   * Concatenates the most semantically relevant fields.
   */
  buildEmbeddingText(skill: Pick<ISkill, 'name' | 'description' | 'domain' | 'tags' | 'template'>): string {
    const parts = [
      skill.name,
      skill.description,
      ...skill.domain,
      ...skill.tags,
      skill.template.persona,
      ...(skill.template.process ?? []),
    ];

    return parts.filter(Boolean).join(' ');
  }

  /**
   * Generate embedding vector for the given text.
   * Uses Voyage AI via Anthropic SDK.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Voyage AI embeddings are accessed through Anthropic's API
    const response = await (this.client as unknown as { post: (path: string, options: { body: unknown }) => Promise<unknown> }).post(
      '/v1/embeddings',
      {
        body: {
          model: this.model,
          input: text,
          input_type: 'document',
        },
      },
    ) as VoyageEmbeddingResponse;

    const embedding = response.data[0]?.embedding;

    if (!embedding) {
      throw new Error('Failed to generate embedding: empty response');
    }

    return embedding;
  }

  /**
   * Generate embedding for a query (using 'query' input_type for asymmetric search).
   */
  async generateQueryEmbedding(text: string): Promise<number[]> {
    const response = await (this.client as unknown as { post: (path: string, options: { body: unknown }) => Promise<unknown> }).post(
      '/v1/embeddings',
      {
        body: {
          model: this.model,
          input: text,
          input_type: 'query',
        },
      },
    ) as VoyageEmbeddingResponse;

    const embedding = response.data[0]?.embedding;

    if (!embedding) {
      throw new Error('Failed to generate query embedding: empty response');
    }

    return embedding;
  }
}
