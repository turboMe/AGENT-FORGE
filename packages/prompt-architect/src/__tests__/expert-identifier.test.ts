import { describe, it, expect, vi } from 'vitest';
import { ExpertIdentifier } from '../expert-identifier.js';
import type { PromptRequest } from '../types.js';

// ── Shared test data ────────────────────────────────

function makeRequest(overrides?: Partial<PromptRequest>): PromptRequest {
  return {
    goal: 'Write a TypeScript function that sorts arrays',
    targetFormat: 'system_prompt',
    complexity: 'medium',
    ...overrides,
  };
}

// ── Heuristic Identification ────────────────────────

describe('ExpertIdentifier — heuristic', () => {
  const identifier = new ExpertIdentifier();

  it('should identify coding domain from code-related goal', () => {
    const profile = identifier.identify(makeRequest({
      goal: 'Refactor this TypeScript module and fix the bug',
    }));

    expect(profile.domain).toContain('software');
    expect(profile.primaryPattern).toBeDefined();
    expect(profile.persona).toBeTruthy();
  });

  it('should identify writing domain from content-related goal', () => {
    const profile = identifier.identify(makeRequest({
      goal: 'Create and compose a blog article about AI trends for content production',
    }));

    expect(profile.domain).toContain('writing');
    expect(profile.primaryPattern).toBe('creator');
  });

  it('should identify analysis domain', () => {
    const profile = identifier.identify(makeRequest({
      goal: 'Analyze this data and create a detailed report with metrics',
    }));

    expect(profile.domain).toContain('analysis');
    expect(profile.primaryPattern).toBe('analyst');
  });

  it('should use explicit domain hints when provided', () => {
    const profile = identifier.identify(makeRequest({
      goal: 'Do something complex',
      domain: ['finance'],
    }));

    expect(profile.domain).toContain('financial');
  });

  it('should derive unique traits based on pattern', () => {
    const profile = identifier.identify(makeRequest({
      goal: 'Analyze and evaluate this code',
    }));

    expect(profile.uniqueTraits.length).toBeGreaterThan(0);
  });

  it('should add complexity trait for complex tasks', () => {
    const profile = identifier.identify(makeRequest({
      goal: 'Build a multi-step workflow pipeline',
      complexity: 'complex',
    }));

    expect(profile.uniqueTraits).toContain('Thrives in high-ambiguity, multi-constraint environments');
  });

  it('should add constraint trait when constraints exist', () => {
    const profile = identifier.identify(makeRequest({
      goal: 'Create a report',
      constraints: ['Must be under 500 words', 'No jargon'],
    }));

    expect(profile.uniqueTraits).toContain('Operates within strict boundaries without sacrificing quality');
  });

  it('should compile a coherent persona string', () => {
    const profile = identifier.identify(makeRequest({
      goal: 'Teach beginners how to code in Python',
    }));

    expect(profile.persona).toContain('You are a');
    expect(profile.persona).toContain('specializing in');
    expect(profile.persona.length).toBeGreaterThan(50);
  });

  it('should detect secondary pattern when applicable', () => {
    const profile = identifier.identify(makeRequest({
      goal: 'Analyze and evaluate this data then teach the results to beginners',
    }));

    // Should have a primary and potentially secondary
    expect(profile.primaryPattern).toBeDefined();
    // The secondary is optional — just check no crash
  });

  it('should handle empty goal gracefully', () => {
    const profile = identifier.identify(makeRequest({ goal: '' }));
    expect(profile.primaryPattern).toBeDefined();
    expect(profile.persona).toBeTruthy();
  });

  it('should fall back to general domain for unknown topics', () => {
    const profile = identifier.identify(makeRequest({
      goal: 'do something vague',
      domain: undefined,
    }));

    expect(profile.domain).toBeTruthy();
    expect(profile.persona).toBeTruthy();
  });
});

// ── LLM-based Identification ────────────────────────

describe('ExpertIdentifier — LLM-based', () => {
  const identifier = new ExpertIdentifier();

  it('should use LLM gateway when provided', async () => {
    const mockGateway = {
      generate: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          domain: 'machine learning engineering',
          experience: 'ML engineer with 8 years of production model deployment',
          perspective: 'pragmatic, production-first approach',
          workStyle: 'data-driven, iterative',
          uniqueTraits: ['Skilled at bridging research and production'],
          primaryPattern: 'processor',
          secondaryPattern: 'analyst',
        }),
        model: 'gpt-4o-mini',
        provider: 'openai',
        tokensInput: 100,
        tokensOutput: 150,
        latencyMs: 300,
        costEstimate: 0.002,
      }),
    };

    const profile = await identifier.identifyWithLLM(
      makeRequest({ goal: 'Build a data processing pipeline for ML features' }),
      mockGateway as any,
    );

    expect(mockGateway.generate).toHaveBeenCalledOnce();
    expect(profile.domain).toBe('machine learning engineering');
    expect(profile.primaryPattern).toBe('processor');
    expect(profile.secondaryPattern).toBe('analyst');
    expect(profile.persona).toContain('You are a');
  });

  it('should fall back to heuristic when LLM fails', async () => {
    const mockGateway = {
      generate: vi.fn().mockRejectedValue(new Error('API unavailable')),
    };

    const profile = await identifier.identifyWithLLM(
      makeRequest({ goal: 'Write a blog article about cooking' }),
      mockGateway as any,
    );

    expect(mockGateway.generate).toHaveBeenCalledOnce();
    expect(profile.primaryPattern).toBeDefined();
    expect(profile.persona).toBeTruthy();
  });

  it('should fall back to heuristic when LLM returns invalid JSON', async () => {
    const mockGateway = {
      generate: vi.fn().mockResolvedValue({
        content: 'This is not valid JSON',
        model: 'gpt-4o-mini',
        provider: 'openai',
        tokensInput: 50,
        tokensOutput: 30,
        latencyMs: 200,
        costEstimate: 0.001,
      }),
    };

    const profile = await identifier.identifyWithLLM(
      makeRequest({ goal: 'Analyze something' }),
      mockGateway as any,
    );

    expect(profile.primaryPattern).toBeDefined();
    expect(profile.persona).toBeTruthy();
  });

  it('should handle markdown-wrapped JSON from LLM', async () => {
    const mockGateway = {
      generate: vi.fn().mockResolvedValue({
        content: '```json\n{"domain":"cybersecurity","experience":"security engineer","perspective":"threat-first","workStyle":"methodical","uniqueTraits":["Red team mindset"],"primaryPattern":"guardian","secondaryPattern":null}\n```',
        model: 'gpt-4o-mini',
        provider: 'openai',
        tokensInput: 100,
        tokensOutput: 100,
        latencyMs: 250,
        costEstimate: 0.001,
      }),
    };

    const profile = await identifier.identifyWithLLM(
      makeRequest({ goal: 'Audit the security of this API' }),
      mockGateway as any,
    );

    expect(profile.domain).toBe('cybersecurity');
    expect(profile.primaryPattern).toBe('guardian');
  });
});
