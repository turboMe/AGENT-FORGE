// LLM Provider adapters — Claude, GPT, Gemini, Ollama
// Phase 2 implementation

export interface ILLMProvider {
  readonly name: string;
  readonly provider: string;
  generate(params: {
    prompt: string;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<{
    content: string;
    tokensInput: number;
    tokensOutput: number;
  }>;
}
