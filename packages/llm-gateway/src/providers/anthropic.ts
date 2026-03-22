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
    });
  }

  async generate(params: ProviderGenerateParams): Promise<ProviderGenerateResult> {
    try {
      const response = await this.client.messages.create({
        model: params.model,
        max_tokens: params.maxTokens,
        temperature: params.temperature,
        ...(params.systemPrompt ? { system: params.systemPrompt } : {}),
        messages: [
          {
            role: 'user',
            content: params.prompt,
          },
        ],
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
