// ── Repository ──────────────────────────────────────
export { SkillRepository } from './repository.js';

// ── Search ──────────────────────────────────────────
export { SkillSearch, cosineSimilarity, scoreToRecommendation } from './search.js';

// ── Indexer ─────────────────────────────────────────
export { SkillIndexer } from './indexer.js';

// ── Embedding ───────────────────────────────────────
export { EmbeddingService } from './embedding.js';

// ── Model ───────────────────────────────────────────
export { SkillModel } from './skill.model.js';
export type { ISkillDocument } from './skill.model.js';

// ── Types ───────────────────────────────────────────
export type {
  ISkillLibrary,
  SkillSearchResult,
  SearchOptions,
  SkillFilter,
  PaginationOptions,
  PaginatedResult,
  EmbeddingConfig,
  SkillLibraryConfig,
} from './types.js';
