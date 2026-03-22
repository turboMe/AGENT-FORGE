import { describe, it, expect } from 'vitest';
import { CostTracker } from '../cost-tracker.js';
import type { ModelConfig } from '../types.js';

const GPT_CONFIG: ModelConfig = {
  id: 'gpt-4o-mini',
  provider: 'openai',
  quality: 'fast',
  costPer1KInput: 0.00015,
  costPer1KOutput: 0.0006,
  maxTokens: 16384,
};

const CLAUDE_CONFIG: ModelConfig = {
  id: 'claude-sonnet-4-5',
  provider: 'anthropic',
  quality: 'best',
  costPer1KInput: 0.003,
  costPer1KOutput: 0.015,
  maxTokens: 8192,
};

describe('CostTracker', () => {
  describe('calculateCost', () => {
    it('should calculate GPT-4o-mini cost correctly', () => {
      const tracker = new CostTracker();
      // 1000 input + 500 output
      const cost = tracker.calculateCost(1000, 500, GPT_CONFIG);

      // (1000/1000)*0.00015 + (500/1000)*0.0006 = 0.00015 + 0.0003 = 0.00045
      expect(cost).toBeCloseTo(0.00045, 6);
    });

    it('should calculate Claude cost correctly', () => {
      const tracker = new CostTracker();
      // 2000 input + 1000 output
      const cost = tracker.calculateCost(2000, 1000, CLAUDE_CONFIG);

      // (2000/1000)*0.003 + (1000/1000)*0.015 = 0.006 + 0.015 = 0.021
      expect(cost).toBeCloseTo(0.021, 6);
    });

    it('should return 0 for zero tokens', () => {
      const tracker = new CostTracker();
      const cost = tracker.calculateCost(0, 0, GPT_CONFIG);
      expect(cost).toBe(0);
    });
  });

  describe('recordUsage', () => {
    it('should record and return a cost record', () => {
      const tracker = new CostTracker();
      const record = tracker.recordUsage({
        model: 'gpt-4o-mini',
        provider: 'openai',
        tokensInput: 500,
        tokensOutput: 200,
        modelConfig: GPT_CONFIG,
      });

      expect(record.model).toBe('gpt-4o-mini');
      expect(record.provider).toBe('openai');
      expect(record.tokensInput).toBe(500);
      expect(record.tokensOutput).toBe(200);
      expect(record.cost).toBeGreaterThan(0);
      expect(record.timestamp).toBeGreaterThan(0);
    });

    it('should accumulate records', () => {
      const tracker = new CostTracker();

      tracker.recordUsage({
        model: 'gpt-4o-mini',
        provider: 'openai',
        tokensInput: 100,
        tokensOutput: 50,
        modelConfig: GPT_CONFIG,
      });

      tracker.recordUsage({
        model: 'claude-sonnet-4-5',
        provider: 'anthropic',
        tokensInput: 200,
        tokensOutput: 100,
        modelConfig: CLAUDE_CONFIG,
      });

      expect(tracker.getRecords()).toHaveLength(2);
    });
  });

  describe('getSummary', () => {
    it('should return empty summary when no records', () => {
      const tracker = new CostTracker();
      const summary = tracker.getSummary();

      expect(summary.totalCost).toBe(0);
      expect(summary.requestCount).toBe(0);
      expect(summary.totalTokensInput).toBe(0);
      expect(summary.totalTokensOutput).toBe(0);
    });

    it('should aggregate across multiple records', () => {
      const tracker = new CostTracker();

      tracker.recordUsage({
        model: 'gpt-4o-mini',
        provider: 'openai',
        tokensInput: 1000,
        tokensOutput: 500,
        modelConfig: GPT_CONFIG,
      });

      tracker.recordUsage({
        model: 'claude-sonnet-4-5',
        provider: 'anthropic',
        tokensInput: 2000,
        tokensOutput: 1000,
        modelConfig: CLAUDE_CONFIG,
      });

      const summary = tracker.getSummary();

      expect(summary.requestCount).toBe(2);
      expect(summary.totalTokensInput).toBe(3000);
      expect(summary.totalTokensOutput).toBe(1500);
      expect(summary.totalCost).toBeGreaterThan(0);

      // byProvider
      expect(summary.byProvider['openai']).toBeDefined();
      expect(summary.byProvider['openai']!.requests).toBe(1);
      expect(summary.byProvider['anthropic']).toBeDefined();
      expect(summary.byProvider['anthropic']!.requests).toBe(1);

      // byModel
      expect(summary.byModel['gpt-4o-mini']).toBeDefined();
      expect(summary.byModel['claude-sonnet-4-5']).toBeDefined();
    });
  });

  describe('reset', () => {
    it('should clear all records', () => {
      const tracker = new CostTracker();

      tracker.recordUsage({
        model: 'gpt-4o-mini',
        provider: 'openai',
        tokensInput: 100,
        tokensOutput: 50,
        modelConfig: GPT_CONFIG,
      });

      tracker.reset();

      expect(tracker.getRecords()).toHaveLength(0);
      expect(tracker.getSummary().requestCount).toBe(0);
    });
  });
});
