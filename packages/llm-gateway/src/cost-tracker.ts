import type {
  CostRecord,
  CostSummary,
  LLMProviderName,
  ModelConfig,
  ModelId,
} from './types.js';

/**
 * Tracks LLM API costs per request and accumulates session totals.
 */
export class CostTracker {
  private readonly records: CostRecord[] = [];

  /**
   * Calculate the cost for a single request and record it.
   */
  recordUsage(params: {
    model: ModelId;
    provider: LLMProviderName;
    tokensInput: number;
    tokensOutput: number;
    modelConfig: ModelConfig;
  }): CostRecord {
    const cost = this.calculateCost(
      params.tokensInput,
      params.tokensOutput,
      params.modelConfig,
    );

    const record: CostRecord = {
      model: params.model,
      provider: params.provider,
      tokensInput: params.tokensInput,
      tokensOutput: params.tokensOutput,
      cost,
      timestamp: Date.now(),
    };

    this.records.push(record);
    return record;
  }

  /**
   * Calculate cost for given token counts and model config.
   */
  calculateCost(
    tokensInput: number,
    tokensOutput: number,
    modelConfig: ModelConfig,
  ): number {
    const inputCost = (tokensInput / 1000) * modelConfig.costPer1KInput;
    const outputCost = (tokensOutput / 1000) * modelConfig.costPer1KOutput;
    return Number((inputCost + outputCost).toFixed(6));
  }

  /**
   * Get aggregated cost summary for the session.
   */
  getSummary(): CostSummary {
    const summary: CostSummary = {
      totalCost: 0,
      totalTokensInput: 0,
      totalTokensOutput: 0,
      requestCount: this.records.length,
      byProvider: {},
      byModel: {},
    };

    for (const record of this.records) {
      summary.totalCost += record.cost;
      summary.totalTokensInput += record.tokensInput;
      summary.totalTokensOutput += record.tokensOutput;

      // By provider
      if (!summary.byProvider[record.provider]) {
        summary.byProvider[record.provider] = { cost: 0, requests: 0 };
      }
      summary.byProvider[record.provider]!.cost += record.cost;
      summary.byProvider[record.provider]!.requests++;

      // By model
      if (!summary.byModel[record.model]) {
        summary.byModel[record.model] = { cost: 0, requests: 0 };
      }
      summary.byModel[record.model]!.cost += record.cost;
      summary.byModel[record.model]!.requests++;
    }

    summary.totalCost = Number(summary.totalCost.toFixed(6));
    return summary;
  }

  /**
   * Get all raw cost records.
   */
  getRecords(): readonly CostRecord[] {
    return this.records;
  }

  /**
   * Reset all tracked data.
   */
  reset(): void {
    this.records.length = 0;
  }
}
