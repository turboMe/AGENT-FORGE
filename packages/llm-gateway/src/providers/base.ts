import type {
  ILLMProvider,
  LLMProviderName,
  ProviderConfig,
  ProviderGenerateParams,
  ProviderGenerateResult,
} from '../types.js';

export abstract class BaseLLMProvider implements ILLMProvider {
  abstract readonly name: LLMProviderName;

  protected readonly apiKey: string;
  protected readonly baseUrl?: string;
  protected readonly timeoutMs: number;
  protected readonly defaultMaxTokens: number;
  protected readonly defaultTemperature: number;

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.defaultMaxTokens = config.defaultMaxTokens ?? 4096;
    this.defaultTemperature = config.defaultTemperature ?? 0.7;
  }

  abstract generate(params: ProviderGenerateParams): Promise<ProviderGenerateResult>;
}
