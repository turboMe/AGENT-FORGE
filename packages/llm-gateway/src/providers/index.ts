import type { ILLMProvider, LLMProviderName, ProviderConfig } from '../types.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';

export { BaseLLMProvider } from './base.js';
export { AnthropicProvider } from './anthropic.js';
export { OpenAIProvider } from './openai.js';

const PROVIDER_FACTORIES: Record<LLMProviderName, new (config: ProviderConfig) => ILLMProvider> = {
  anthropic: AnthropicProvider,
  openai: OpenAIProvider,
};

/**
 * Creates a provider instance by name.
 */
export function createProvider(name: LLMProviderName, config: ProviderConfig): ILLMProvider {
  const Factory = PROVIDER_FACTORIES[name];
  return new Factory(config);
}
