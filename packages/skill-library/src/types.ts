import type { ISkill } from '@agentforge/shared';

// ── Embedding Config ────────────────────────────────

export interface EmbeddingConfig {
  apiKey: string;
  model?: string;
}

// ── Search Types ────────────────────────────────────

export interface SearchOptions {
  /** Max results to return. Default: 10 */
  limit?: number;
  /** Minimum hybrid score threshold. Default: 0 */
  minScore?: number;
  /** Filter by domains */
  domains?: string[];
}

export interface SkillSearchResult {
  skill: ISkill;
  matchScore: number;
  recommendation: 'use' | 'adapt' | 'create';
}

// ── Skill Filters ───────────────────────────────────

export interface SkillFilter {
  /** Regex search across name, description, tags */
  search?: string;
  /** Filter by domain (matches any element in the domain array) */
  domain?: string;
  /** Filter by pattern (exact match) */
  pattern?: string;
}

// ── Pagination ──────────────────────────────────────

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filter?: SkillFilter;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Skill Library Config ────────────────────────────

export interface SkillLibraryConfig {
  mongoUri: string;
  embedding: EmbeddingConfig;
  search?: {
    keywordWeight?: number;
    vectorWeight?: number;
  };
}

// ── ISkillLibrary interface ─────────────────────────

export interface ISkillLibrary {
  search(
    tenantId: string,
    query: string,
    options?: SearchOptions,
  ): Promise<SkillSearchResult[]>;

  save(
    skill: Omit<ISkill, '_id' | 'version' | 'stats' | 'createdAt' | 'updatedAt'>,
  ): Promise<ISkill>;

  updateStats(
    skillId: string,
    usage: { incrementUseCount?: boolean; rating?: number },
  ): Promise<void>;

  findById(skillId: string): Promise<ISkill | null>;

  findByTenant(
    tenantId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ISkill>>;
}
