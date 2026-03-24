import Anthropic from '@anthropic-ai/sdk';
import { LLMError } from '@agentforge/shared';
import type {
  LLMProviderName,
  ProviderConfig,
  ProviderGenerateParams,
  ProviderGenerateResult,
} from '../types.js';
import { BaseLLMProvider } from './base.js';

export class AnthropicProvider extends BaseLLMProvider {
  readonly name: LLMProviderName = 'anthropic';
  private readonly client: Anthropic;

  constructor(config: ProviderConfig) {
    super(config);
    this.client = new Anthropic({
      apiKey: this.apiKey,
      ...(this.baseUrl ? { baseURL: this.baseUrl } : {}),
      timeout: this.timeoutMs,
      maxRetries: 0, // Gateway handles retries — disable SDK-level retries
    });
  }

  async generate(params: ProviderGenerateParams): Promise<ProviderGenerateResult> {
    try {
      // Build messages: use explicit messages[] if provided, otherwise wrap prompt
      const messages: Anthropic.MessageParam[] = params.messages?.length
        ? params.messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
        : [{ role: 'user' as const, content: params.prompt }];

      // Extract system prompt: explicit param OR from messages array
      const systemPrompt =
        params.systemPrompt ??
        params.messages?.find((m) => m.role === 'system')?.content;

      const response = await this.client.messages.create({
        model: params.model,
        max_tokens: params.maxTokens,
        temperature: params.temperature,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages,
      });

      const textContent = response.content.find((block) => block.type === 'text');
      const content = textContent && 'text' in textContent ? textContent.text : '';

      return {
        content,
        tokensInput: response.usage.input_tokens,
        tokensOutput: response.usage.output_tokens,
      };
    } catch (error: unknown) {
      if (error instanceof Anthropic.APIError) {
        const statusCode = error.status === 429 ? 429 : 502;
        throw new LLMError(
          'anthropic',
          `Anthropic API error (${error.status}): ${error.message}`,
          statusCode,
        );
      }
      throw new LLMError('anthropic', `Anthropic request failed: ${String(error)}`);
    }
  }
}
