import OpenAI from 'openai';
import { LLMError } from '@agentforge/shared';
import type {
  LLMProviderName,
  ProviderConfig,
  ProviderGenerateParams,
  ProviderGenerateResult,
} from '../types.js';
import { BaseLLMProvider } from './base.js';

/**
 * OllamaProvider — connects to any OpenAI-compatible local inference server.
 * Works with: Ollama, vLLM, LM Studio, LocalAI, text-generation-webui.
 *
 * Config:
 *   - apiKey: can be 'ollama' or 'not-needed' for local servers
 *   - baseUrl: required, e.g. 'http://localhost:11434/v1'
 */
export class OllamaProvider extends BaseLLMProvider {
  readonly name: LLMProviderName = 'ollama';
  private readonly client: OpenAI;

  constructor(config: ProviderConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: this.apiKey || 'ollama', // Ollama doesn't require a real key
      baseURL: this.baseUrl || 'http://localhost:11434/v1',
      timeout: this.timeoutMs,
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
          'ollama',
          `Ollama API error (${error.status}): ${error.message}`,
          statusCode,
        );
      }
      throw new LLMError('ollama', `Ollama request failed: ${String(error)}`);
    }
  }
}
