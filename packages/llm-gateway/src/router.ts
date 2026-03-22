import type {
  LLMProviderName,
  ModelConfig,
  ModelId,
  QualityTier,
  TaskComplexity,
  CircuitState,
} from './types.js';

// ── Model Registry ──────────────────────────────────

const MODEL_REGISTRY: ModelConfig[] = [
  {
    id: 'claude-sonnet-4-5',
    provider: 'anthropic',
    quality: 'best',
    costPer1KInput: 0.003,
    costPer1KOutput: 0.015,
    maxTokens: 8192,
  },
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    quality: 'fast',
    costPer1KInput: 0.00015,
    costPer1KOutput: 0.0006,
    maxTokens: 16384,
  },
];

// ── Quality → Model Mapping ─────────────────────────

const QUALITY_TO_MODEL: Record<QualityTier, ModelId> = {
  fast: 'gpt-4o-mini',
  balanced: 'gpt-4o-mini',
  best: 'claude-sonnet-4-5',
};

// ── Complexity → Model Mapping ──────────────────────

const COMPLEXITY_TO_MODEL: Record<TaskComplexity, ModelId> = {
  simple: 'gpt-4o-mini',
  medium: 'gpt-4o-mini',
  complex: 'claude-sonnet-4-5',
};

// ── Explicit Model Shorthand → ModelId ──────────────

const MODEL_SHORTHAND: Record<string, ModelId> = {
  claude: 'claude-sonnet-4-5',
  gpt: 'gpt-4o-mini',
};

// ── Fallback Chain ──────────────────────────────────

const FALLBACK_ORDER: ModelId[] = ['claude-sonnet-4-5', 'gpt-4o-mini'];

export interface ModelSelection {
  model: ModelId;
  provider: LLMProviderName;
  config: ModelConfig;
  reason: string;
}

export interface ProviderHealth {
  getState(provider: LLMProviderName): CircuitState;
}

export class ModelRouter {
  private readonly providerHealth?: ProviderHealth;

  constructor(providerHealth?: ProviderHealth) {
    this.providerHealth = providerHealth;
  }

  /**
   * Select the optimal model based on params and provider availability.
   */
  selectModel(params: {
    model?: ModelId | 'auto' | string;
    quality?: QualityTier;
    complexity?: TaskComplexity;
  }): ModelSelection {
    // 1. Explicit model specified
    if (params.model && params.model !== 'auto') {
      const resolvedId = MODEL_SHORTHAND[params.model] ?? params.model;
      const config = this.findModel(resolvedId as ModelId);
      if (config && this.isProviderAvailable(config.provider)) {
        return {
          model: config.id,
          provider: config.provider,
          config,
          reason: `explicit:${params.model}`,
        };
      }
      // Explicit model's provider is down → fall through to fallback
    }

    // 2. Complexity-based selection (takes priority over quality)
    if (params.complexity) {
      const modelId = COMPLEXITY_TO_MODEL[params.complexity];
      const config = this.findModel(modelId);
      if (config && this.isProviderAvailable(config.provider)) {
        return {
          model: config.id,
          provider: config.provider,
          config,
          reason: `complexity:${params.complexity}`,
        };
      }
    }

    // 3. Quality-based selection
    if (params.quality) {
      const modelId = QUALITY_TO_MODEL[params.quality];
      const config = this.findModel(modelId);
      if (config && this.isProviderAvailable(config.provider)) {
        return {
          model: config.id,
          provider: config.provider,
          config,
          reason: `quality:${params.quality}`,
        };
      }
    }

    // 4. Fallback: pick first available model
    return this.selectFallback();
  }

  /**
   * Get the fallback model for a given provider (used after failures).
   */
  getFallback(currentProvider: LLMProviderName): ModelSelection | null {
    for (const modelId of FALLBACK_ORDER) {
      const config = this.findModel(modelId);
      if (config && config.provider !== currentProvider && this.isProviderAvailable(config.provider)) {
        return {
          model: config.id,
          provider: config.provider,
          config,
          reason: `fallback:from-${currentProvider}`,
        };
      }
    }
    return null;
  }

  getModelConfig(modelId: ModelId): ModelConfig | undefined {
    return this.findModel(modelId);
  }

  private findModel(modelId: ModelId): ModelConfig | undefined {
    return MODEL_REGISTRY.find((m) => m.id === modelId);
  }

  private isProviderAvailable(provider: LLMProviderName): boolean {
    if (!this.providerHealth) return true;
    return this.providerHealth.getState(provider) !== 'OPEN';
  }

  private selectFallback(): ModelSelection {
    for (const modelId of FALLBACK_ORDER) {
      const config = this.findModel(modelId);
      if (config && this.isProviderAvailable(config.provider)) {
        return {
          model: config.id,
          provider: config.provider,
          config,
          reason: 'fallback:default',
        };
      }
    }

    // Last resort: return first model regardless of availability
    const config = MODEL_REGISTRY[0]!;
    return {
      model: config.id,
      provider: config.provider,
      config,
      reason: 'fallback:force',
    };
  }
}
