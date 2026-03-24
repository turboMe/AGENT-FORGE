// ── Tier Limits ─────────────────────────────────────
export const TIER_LIMITS = {
  free: {
    requestsPerMinute: 10,
    tasksPerDay: 20,
    tokensPerDay: 50_000,
    maxSkills: 10,
    maxApiKeys: 0,
  },
  pro: {
    requestsPerMinute: 30,
    tasksPerDay: 100,
    tokensPerDay: 250_000,
    maxSkills: 50,
    maxApiKeys: 3,
  },
  team: {
    requestsPerMinute: 60,
    tasksPerDay: 500,
    tokensPerDay: 1_000_000,
    maxSkills: 200,
    maxApiKeys: 10,
  },
  agency: {
    requestsPerMinute: 120,
    tasksPerDay: Infinity,
    tokensPerDay: Infinity,
    maxSkills: Infinity,
    maxApiKeys: 25,
  },
} as const;

export type Tier = keyof typeof TIER_LIMITS;

// ── Model Configuration ─────────────────────────────
export const MODEL_CONFIG = {
  'claude-opus-4-6': {
    provider: 'anthropic',
    quality: 'best',
    costPer1KInput: 0.015,           // TODO: Verify current Anthropic pricing before deploy
    costPer1KOutput: 0.075,          // TODO: Verify current Anthropic pricing before deploy
    maxTokens: 16384,
  },
  'claude-sonnet-4-5': {
    provider: 'anthropic',
    quality: 'best',
    costPer1KInput: 0.003,
    costPer1KOutput: 0.015,
    maxTokens: 8192,
  },
  'gpt-4o-mini': {
    provider: 'openai',
    quality: 'fast',
    costPer1KInput: 0.00015,
    costPer1KOutput: 0.0006,
    maxTokens: 16384,
  },
  'gemini-2.0-flash': {
    provider: 'google',
    quality: 'balanced',
    costPer1KInput: 0.0001,
    costPer1KOutput: 0.0004,
    maxTokens: 8192,
  },
} as const;

// ── Prompt Architect V2 Configuration ───────────────
export const ARCHITECT_CONFIG = {
  model: 'claude-opus-4-6' as string,
  temperature: 0.3,
  maxTokens: 8192,
  markers: {
    start: '===PROMPT_START===',
    end: '===PROMPT_END===',
  },
} as const;

// ── Defaults ────────────────────────────────────────
export const DEFAULT_SETTINGS = {
  model: 'auto',
  quality: 'balanced',
  language: 'en',
  maxTokens: 4096,
  temperature: 0.7,
} as const;

// ── Skill Routing Thresholds ────────────────────────
export const ROUTING_THRESHOLDS = {
  /** Score >= this → use existing skill as-is */
  USE_EXISTING: 0.9,
  /** Score >= this → adapt existing skill */
  ADAPT_EXISTING: 0.65,
  /** Score < ADAPT_EXISTING → create new skill */
} as const;

// ── Quality ─────────────────────────────────────────
export const QUALITY_THRESHOLDS = {
  /** Minimum auto-score to accept result (0-1) */
  MIN_ACCEPTABLE: 0.7,
  /** Maximum retries on quality failure */
  MAX_RETRIES: 2,
} as const;
