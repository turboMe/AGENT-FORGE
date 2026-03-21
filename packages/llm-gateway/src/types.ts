// ── Provider & Model Identifiers ────────────────────

export type LLMProviderName = 'anthropic' | 'openai';

export type AnthropicModelId = 'claude-sonnet-4-5';
export type OpenAIModelId = 'gpt-4o-mini';
export type ModelId = AnthropicModelId | OpenAIModelId;

export type QualityTier = 'fast' | 'balanced' | 'best';
export type TaskComplexity = 'simple' | 'medium' | 'complex';

// ── Model Configuration ─────────────────────────────

export interface ModelConfig {
  id: ModelId;
  provider: LLMProviderName;
  quality: QualityTier;
  costPer1KInput: number;
  costPer1KOutput: number;
  maxTokens: number;
}

// ── Provider Configuration ──────────────────────────

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  defaultMaxTokens?: number;
  defaultTemperature?: number;
  timeoutMs?: number;
}

// ── Retry Configuration ─────────────────────────────

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

// ── Rate Limiter Configuration ──────────────────────

export interface RateLimiterConfig {
  requestsPerMinute: number;
}

// ── Circuit Breaker Configuration ───────────────────

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

// ── Gateway Configuration ───────────────────────────

export interface GatewayConfig {
  providers: Partial<Record<LLMProviderName, ProviderConfig>>;
  retry?: Partial<RetryConfig>;
  rateLimits?: Partial<Record<LLMProviderName, RateLimiterConfig>>;
  circuitBreaker?: Partial<CircuitBreakerConfig>;
  defaultModel?: ModelId | 'auto';
  defaultQuality?: QualityTier;
}

// ── Generate Params & Result ────────────────────────

export interface LLMGenerateParams {
  prompt: string;
  systemPrompt?: string;
  model?: ModelId | 'auto';
  quality?: QualityTier;
  complexity?: TaskComplexity;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMGenerateResult {
  content: string;
  model: ModelId;
  provider: LLMProviderName;
  tokensInput: number;
  tokensOutput: number;
  latencyMs: number;
  costEstimate: number;
}

// ── Provider Interface ──────────────────────────────

export interface ProviderGenerateParams {
  prompt: string;
  systemPrompt?: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface ProviderGenerateResult {
  content: string;
  tokensInput: number;
  tokensOutput: number;
}

export interface ILLMProvider {
  readonly name: LLMProviderName;
  generate(params: ProviderGenerateParams): Promise<ProviderGenerateResult>;
}

// ── Gateway Interface ───────────────────────────────

export interface ILLMGateway {
  generate(params: LLMGenerateParams): Promise<LLMGenerateResult>;
}

// ── Cost Record ─────────────────────────────────────

export interface CostRecord {
  model: ModelId;
  provider: LLMProviderName;
  tokensInput: number;
  tokensOutput: number;
  cost: number;
  timestamp: number;
}

export interface CostSummary {
  totalCost: number;
  totalTokensInput: number;
  totalTokensOutput: number;
  requestCount: number;
  byProvider: Record<string, { cost: number; requests: number }>;
  byModel: Record<string, { cost: number; requests: number }>;
}
