import type { ISkill } from '@agentforge/shared';
import { ROUTING_THRESHOLDS } from '@agentforge/shared';
import { SkillModel } from './skill.model.js';
import { EmbeddingService } from './embedding.js';
import type { SkillSearchResult, SearchOptions, EmbeddingConfig } from './types.js';

// ── Cosine similarity ───────────────────────────────

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const ai = a[i]!;
    const bi = b[i]!;
    dotProduct += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

// ── Score → recommendation ──────────────────────────

export function scoreToRecommendation(score: number): 'use' | 'adapt' | 'create' {
  if (score >= ROUTING_THRESHOLDS.USE_EXISTING) return 'use';
  if (score >= ROUTING_THRESHOLDS.ADAPT_EXISTING) return 'adapt';
  return 'create';
}

// ── Normalize text score ────────────────────────────

function normalizeTextScore(score: number): number {
  // MongoDB text search scores vary widely; normalize to 0-1 range
  // Typical scores range from 0.5 to 5+, we cap at 5 and scale
  return Math.min(score / 5, 1);
}

// ── Lean document type for search results ───────────

interface LeanSkillDoc {
  _id: unknown;
  tenantId: string;
  name: string;
  slug: string;
  description: string;
  domain: string[];
  pattern: string;
  tags: string[];
  template: ISkill['template'];
  version: number;
  parentSkillId?: string;
  isSystem: boolean;
  isPublic: boolean;
  stats: ISkill['stats'];
  searchVector?: string;
  embedding?: number[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  score?: number; // MongoDB $meta textScore
}

// ── Convert lean doc → ISkill ───────────────────────

function leanToSkill(doc: LeanSkillDoc): ISkill {
  return {
    _id: String(doc._id),
    tenantId: doc.tenantId,
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    domain: doc.domain,
    pattern: doc.pattern,
    tags: doc.tags,
    template: doc.template,
    version: doc.version,
    parentSkillId: doc.parentSkillId,
    isSystem: doc.isSystem,
    isPublic: doc.isPublic,
    stats: doc.stats,
    searchVector: doc.searchVector,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    deletedAt: doc.deletedAt,
  };
}

// ── Search class ────────────────────────────────────

export class SkillSearch {
  private readonly embeddingService: EmbeddingService;

  /** Weight for keyword (text) search component */
  private readonly keywordWeight: number;

  /** Weight for vector (embedding) search component */
  private readonly vectorWeight: number;

  constructor(
    embeddingConfig: EmbeddingConfig,
    options?: { keywordWeight?: number; vectorWeight?: number },
  ) {
    this.embeddingService = new EmbeddingService(embeddingConfig);
    this.keywordWeight = options?.keywordWeight ?? 0.4;
    this.vectorWeight = options?.vectorWeight ?? 0.6;
  }

  /**
   * Hybrid search combining keyword (MongoDB $text) and vector (cosine similarity).
   */
  async search(
    tenantId: string,
    query: string,
    options: SearchOptions = {},
  ): Promise<SkillSearchResult[]> {
    const { limit = 10, minScore = 0, domains } = options;

    // Run keyword and vector search in parallel
    const [keywordResults, queryEmbedding] = await Promise.all([
      this.keywordSearch(tenantId, query, domains),
      this.embeddingService.generateQueryEmbedding(query),
    ]);

    // Get all candidate skills (from keyword search + by domain if specified)
    const candidateIds = new Set(keywordResults.map((r) => r.id));

    // Also fetch skills with embeddings for vector search
    const vectorCandidates = await this.fetchVectorCandidates(tenantId, domains);
    for (const vc of vectorCandidates) {
      candidateIds.add(String(vc._id));
    }

    // Merge keyword scores and vector scores
    const keywordScoreMap = new Map(
      keywordResults.map((r) => [r.id, normalizeTextScore(r.textScore)]),
    );

    const vectorScoreMap = new Map<string, number>();
    for (const candidate of vectorCandidates) {
      if (candidate.embedding && candidate.embedding.length > 0) {
        const similarity = cosineSimilarity(queryEmbedding, candidate.embedding);
        vectorScoreMap.set(String(candidate._id), similarity);
      }
    }

    // Build a map of all skill documents for lookup
    const docMap = new Map<string, LeanSkillDoc>();
    for (const kr of keywordResults) {
      docMap.set(kr.id, kr.doc);
    }
    for (const vc of vectorCandidates) {
      const vcId = String(vc._id);
      if (!docMap.has(vcId)) {
        docMap.set(vcId, vc);
      }
    }

    // Compute hybrid scores for all candidates
    const results: SkillSearchResult[] = [];

    for (const id of candidateIds) {
      const kScore = keywordScoreMap.get(id) ?? 0;
      const vScore = vectorScoreMap.get(id) ?? 0;
      const hybridScore = this.keywordWeight * kScore + this.vectorWeight * vScore;

      if (hybridScore >= minScore) {
        const skillDoc = docMap.get(id);
        if (skillDoc) {
          results.push({
            skill: leanToSkill(skillDoc),
            matchScore: Math.round(hybridScore * 1000) / 1000,
            recommendation: scoreToRecommendation(hybridScore),
          });
        }
      }
    }

    // Sort by score descending and limit
    results.sort((a, b) => b.matchScore - a.matchScore);
    return results.slice(0, limit);
  }

  /**
   * Keyword-only search using MongoDB $text index.
   */
  async keywordSearch(
    tenantId: string,
    query: string,
    domains?: string[],
  ): Promise<{ id: string; textScore: number; doc: LeanSkillDoc }[]> {
    const filter: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
      $text: { $search: query },
    };

    if (domains && domains.length > 0) {
      filter['domain'] = { $in: domains };
    }

    const docs = await SkillModel.find(filter, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(50)
      .lean() as unknown as LeanSkillDoc[];

    return docs.map((doc) => ({
      id: String(doc._id),
      textScore: doc.score ?? 0,
      doc,
    }));
  }

  /**
   * Fetch skills with embeddings for vector comparison.
   */
  private async fetchVectorCandidates(
    tenantId: string,
    domains?: string[],
  ): Promise<LeanSkillDoc[]> {
    const filter: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
      embedding: { $exists: true, $ne: [] },
    };

    if (domains && domains.length > 0) {
      filter['domain'] = { $in: domains };
    }

    return SkillModel.find(filter)
      .select('+embedding')
      .limit(200)
      .lean() as unknown as Promise<LeanSkillDoc[]>;
  }
}
