import type { ILLMProvider, LLMProviderName, ProviderConfig } from '../types.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';

export { BaseLLMProvider } from './base.js';
export { AnthropicProvider } from './anthropic.js';
export { OpenAIProvider } from './openai.js';
export { OllamaProvider } from './ollama.js';

type ProviderFactory = new (config: ProviderConfig) => ILLMProvider;

const PROVIDER_FACTORIES = new Map<string, ProviderFactory>([
  ['anthropic', AnthropicProvider],
  ['openai', OpenAIProvider],
]);

/**
 * Register a new provider factory at runtime.
 */
export function registerProvider(name: LLMProviderName, factory: ProviderFactory): void {
  PROVIDER_FACTORIES.set(name, factory);
}

/**
 * Creates a provider instance by name.
 */
export function createProvider(name: LLMProviderName, config: ProviderConfig): ILLMProvider {
  const Factory = PROVIDER_FACTORIES.get(name);
  if (!Factory) {
    throw new Error(`Unknown LLM provider: "${name}". Register it first via registerProvider().`);
  }
  return new Factory(config);
}
