import { LLMError } from '@agentforge/shared';
import type {
  GatewayConfig,
  ILLMGateway,
  ILLMProvider,
  LLMGenerateParams,
  LLMGenerateResult,
  LLMProviderName,
  RetryConfig,
} from './types.js';
import { createProvider } from './providers/index.js';
import { ModelRouter } from './router.js';
import { CircuitBreaker } from './circuit-breaker.js';
import { RateLimiter } from './rate-limiter.js';
import { CostTracker } from './cost-tracker.js';

const DEFAULT_RETRY: RetryConfig = {
  maxRetries: 2,
  baseDelayMs: 1000,
  maxDelayMs: 10_000,
  backoffMultiplier: 2,
};

/**
 * Main LLM Gateway — unified multi-provider interface.
 *
 * Orchestrates: ModelRouter → RateLimiter → CircuitBreaker → Provider → CostTracker
 */
export class LLMGateway implements ILLMGateway {
  private readonly providers: Map<LLMProviderName, ILLMProvider> = new Map();
  private readonly router: ModelRouter;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly rateLimiter: RateLimiter;
  private readonly costTracker: CostTracker;
  private readonly retryConfig: RetryConfig;

  constructor(config: GatewayConfig) {
    // Initialize circuit breaker first (router needs it)
    this.circuitBreaker = new CircuitBreaker(config.circuitBreaker);

    // Initialize router with circuit breaker health
    this.router = new ModelRouter(this.circuitBreaker);

    // Initialize rate limiter
    this.rateLimiter = new RateLimiter(config.rateLimits);

    // Initialize cost tracker
    this.costTracker = new CostTracker();

    // Initialize retry config
    this.retryConfig = { ...DEFAULT_RETRY, ...config.retry };

    // Create provider instances
    for (const [name, providerConfig] of Object.entries(config.providers)) {
      if (providerConfig) {
        const provider = createProvider(name as LLMProviderName, providerConfig);
        this.providers.set(name as LLMProviderName, provider);
      }
    }
  }

  /**
   * Generate text via the optimal LLM provider.
   */
  async generate(params: LLMGenerateParams): Promise<LLMGenerateResult> {
    // 1. Select model via router
    const selection = this.router.selectModel({
      model: params.model,
      quality: params.quality,
      complexity: params.complexity,
      purpose: params.purpose,
    });

    // 2. Try primary provider with retries
    const startTime = Date.now();
    try {
      const result = await this.executeWithRetry(
        selection.provider,
        selection.model,
        params,
        selection.config.maxTokens,
      );

      // 3. Track cost
      const costRecord = this.costTracker.recordUsage({
        model: selection.model,
        provider: selection.provider,
        tokensInput: result.tokensInput,
        tokensOutput: result.tokensOutput,
        modelConfig: selection.config,
      });

      return {
        content: result.content,
        model: selection.model,
        provider: selection.provider,
        tokensInput: result.tokensInput,
        tokensOutput: result.tokensOutput,
        latencyMs: Date.now() - startTime,
        costEstimate: costRecord.cost,
      };
    } catch (primaryError) {
      // 4. Primary failed — try fallback provider
      const fallback = this.router.getFallback(selection.provider);
      if (!fallback) {
        throw primaryError;
      }

      try {
        const result = await this.executeWithRetry(
          fallback.provider,
          fallback.model,
          params,
          fallback.config.maxTokens,
        );

        const costRecord = this.costTracker.recordUsage({
          model: fallback.model,
          provider: fallback.provider,
          tokensInput: result.tokensInput,
          tokensOutput: result.tokensOutput,
          modelConfig: fallback.config,
        });

        return {
          content: result.content,
          model: fallback.model,
          provider: fallback.provider,
          tokensInput: result.tokensInput,
          tokensOutput: result.tokensOutput,
          latencyMs: Date.now() - startTime,
          costEstimate: costRecord.cost,
        };
      } catch {
        // Both providers failed
        throw new LLMError(
          selection.provider,
          `All providers failed. Primary (${selection.provider}): ${String(primaryError)}`,
          502,
        );
      }
    }
  }

  /**
   * Get cost tracking summary.
   */
  getCostSummary() {
    return this.costTracker.getSummary();
  }

  /**
   * Get cost tracker instance (for external use).
   */
  getCostTracker() {
    return this.costTracker;
  }

  /**
   * Get circuit breaker instance (for health checks).
   */
  getCircuitBreaker() {
    return this.circuitBreaker;
  }

  private async executeWithRetry(
    providerName: LLMProviderName,
    model: string,
    params: LLMGenerateParams,
    modelMaxTokens: number,
  ) {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new LLMError(providerName, `Provider "${providerName}" not configured`);
    }

    // Check rate limit
    if (!this.rateLimiter.canRequest(providerName)) {
      throw new LLMError(providerName, `Rate limit exceeded for ${providerName}`, 429);
    }

    // Check circuit breaker
    if (!this.circuitBreaker.canRequest(providerName)) {
      throw new LLMError(providerName, `Circuit breaker OPEN for ${providerName}`, 502);
    }

    let lastError: unknown;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        // Record the rate-limited request
        this.rateLimiter.recordRequest(providerName);

        const result = await provider.generate({
          prompt: params.prompt ?? '',
          systemPrompt: params.systemPrompt,
          messages: params.messages,
          model,
          maxTokens: params.maxTokens ?? modelMaxTokens,
          temperature: params.temperature ?? 0.7,
        });

        // Success — reset circuit breaker
        this.circuitBreaker.recordSuccess(providerName);
        return result;
      } catch (error) {
        lastError = error;
        this.circuitBreaker.recordFailure(providerName);

        // Don't retry on rate limit (429) errors
        if (error instanceof LLMError && error.statusCode === 429) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.retryConfig.maxRetries) {
          const delay = Math.min(
            this.retryConfig.baseDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt),
            this.retryConfig.maxDelayMs,
          );
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
