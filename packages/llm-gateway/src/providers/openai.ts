import OpenAI from 'openai';
import { LLMError } from '@agentforge/shared';
import type {
  LLMProviderName,
  ProviderConfig,
  ProviderGenerateParams,
  ProviderGenerateResult,
} from '../types.js';
import { BaseLLMProvider } from './base.js';

export class OpenAIProvider extends BaseLLMProvider {
  readonly name: LLMProviderName = 'openai';
  private readonly client: OpenAI;

  constructor(config: ProviderConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: this.apiKey,
      ...(this.baseUrl ? { baseURL: this.baseUrl } : {}),
      timeout: this.timeoutMs,
      maxRetries: 0, // Gateway handles retries — disable SDK-level retries
    });
  }

  async generate(params: ProviderGenerateParams): Promise<ProviderGenerateResult> {
    try {
      // Build messages: use explicit messages[] if provided, otherwise build from prompt
      let messages: OpenAI.ChatCompletionMessageParam[];
      if (params.messages?.length) {
        messages = params.messages.map((m) => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        }));
      } else {
        messages = [];
        if (params.systemPrompt) {
          messages.push({ role: 'system', content: params.systemPrompt });
        }
        messages.push({ role: 'user', content: params.prompt });
      }

      const response = await this.client.chat.completions.create({
        model: params.model,
        max_tokens: params.maxTokens,
        temperature: params.temperature,
        messages,
      });

      const choice = response.choices[0];
      const content = choice?.message?.content ?? '';

      return {
        content,
        tokensInput: response.usage?.prompt_tokens ?? 0,
        tokensOutput: response.usage?.completion_tokens ?? 0,
      };
    } catch (error: unknown) {
      if (error instanceof OpenAI.APIError) {
        const statusCode = error.status === 429 ? 429 : 502;
        throw new LLMError(
          'openai',
          `OpenAI API error (${error.status}): ${error.message}`,
          statusCode,
        );
      }
      throw new LLMError('openai', `OpenAI request failed: ${String(error)}`);
    }
  }
}
