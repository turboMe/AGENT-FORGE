import Anthropic from '@anthropic-ai/sdk';
import { LLMError } from '@agentforge/shared';
import type {
  LLMProviderName,
  ProviderConfig,
  ProviderGenerateParams,
  ProviderGenerateResult,
  ContentBlock,
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

  /** Convert our ContentBlock[] to Anthropic's content format */
  private toAnthropicContent(content: string | ContentBlock[]): string | Anthropic.ContentBlockParam[] {
    if (typeof content === 'string') return content;
    return content.map((block): Anthropic.ContentBlockParam => {
      if (block.type === 'text') {
        return { type: 'text', text: block.text };
      }
      // image block → Anthropic vision format
      return {
        type: 'image',
        source: {
          type: 'base64',
          media_type: block.mediaType as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif',
          data: block.base64Data,
        },
      };
    });
  }

  async generate(params: ProviderGenerateParams): Promise<ProviderGenerateResult> {
    try {
      // Build messages: use explicit messages[] if provided, otherwise wrap prompt
      const messages: Anthropic.MessageParam[] = params.messages?.length
        ? params.messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({ role: m.role as 'user' | 'assistant', content: this.toAnthropicContent(m.content) }))
        : [{ role: 'user' as const, content: params.prompt }];

      // Extract system prompt: explicit param OR from messages array
      const systemFromMessages = params.messages?.find((m) => m.role === 'system');
      const systemPrompt =
        params.systemPrompt ??
        (systemFromMessages && typeof systemFromMessages.content === 'string' ? systemFromMessages.content : undefined);

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
