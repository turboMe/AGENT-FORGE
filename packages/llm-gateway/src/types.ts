export interface LLMGenerateParams {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  quality?: 'fast' | 'balanced' | 'best';
  maxTokens?: number;
  temperature?: number;
}

export interface LLMGenerateResult {
  content: string;
  model: string;
  provider: string;
  tokensInput: number;
  tokensOutput: number;
  latencyMs: number;
  costEstimate: number;
}

export interface ILLMGateway {
  generate(params: LLMGenerateParams): Promise<LLMGenerateResult>;
}
