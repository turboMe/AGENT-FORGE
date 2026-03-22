import type { ISkill } from '@agentforge/shared';
import type { EmbeddingConfig } from './types.js';

// ── Constants ───────────────────────────────────────

const DEFAULT_EMBEDDING_MODEL = 'voyage-3';
const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';

// ── API Response types ──────────────────────────────

interface VoyageEmbeddingResponse {
  data: { embedding: number[] }[];
}

// ── Service ─────────────────────────────────────────

export class EmbeddingService {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(config: EmbeddingConfig) {
    this.apiKey = config.apiKey;
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
   * Call Voyage AI embeddings API.
   * Voyage AI accepts both Voyage API keys and Anthropic API keys.
   */
  private async callVoyageApi(text: string, inputType: 'document' | 'query'): Promise<number[]> {
    const response = await fetch(VOYAGE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: text,
        input_type: inputType,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Voyage AI API error ${response.status}: ${body}`);
    }

    const data = (await response.json()) as VoyageEmbeddingResponse;
    const embedding = data.data[0]?.embedding;

    if (!embedding) {
      throw new Error('Failed to generate embedding: empty response');
    }

    return embedding;
  }

  /**
   * Generate embedding vector for the given text.
   * Uses Voyage AI embeddings API (document input_type).
   */
  async generateEmbedding(text: string): Promise<number[]> {
    return this.callVoyageApi(text, 'document');
  }

  /**
   * Generate embedding for a query (using 'query' input_type for asymmetric search).
   */
  async generateQueryEmbedding(text: string): Promise<number[]> {
    return this.callVoyageApi(text, 'query');
  }
}
