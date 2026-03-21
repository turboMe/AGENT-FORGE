import { describe, it, expect } from 'vitest';
import { ModelRouter } from '../router.js';
import type { CircuitState, LLMProviderName } from '../types.js';
import type { ProviderHealth } from '../router.js';

describe('ModelRouter', () => {
  describe('selectModel', () => {
    it('should select gpt-4o-mini for "fast" quality', () => {
      const router = new ModelRouter();
      const selection = router.selectModel({ quality: 'fast' });

      expect(selection.model).toBe('gpt-4o-mini');
      expect(selection.provider).toBe('openai');
      expect(selection.reason).toBe('quality:fast');
    });

    it('should select gpt-4o-mini for "balanced" quality', () => {
      const router = new ModelRouter();
      const selection = router.selectModel({ quality: 'balanced' });

      expect(selection.model).toBe('gpt-4o-mini');
      expect(selection.provider).toBe('openai');
    });

    it('should select claude-sonnet-4-5 for "best" quality', () => {
      const router = new ModelRouter();
      const selection = router.selectModel({ quality: 'best' });

      expect(selection.model).toBe('claude-sonnet-4-5');
      expect(selection.provider).toBe('anthropic');
      expect(selection.reason).toBe('quality:best');
    });

    it('should select gpt-4o-mini for "simple" complexity', () => {
      const router = new ModelRouter();
      const selection = router.selectModel({ complexity: 'simple' });

      expect(selection.model).toBe('gpt-4o-mini');
      expect(selection.reason).toBe('complexity:simple');
    });

    it('should select claude-sonnet-4-5 for "complex" complexity', () => {
      const router = new ModelRouter();
      const selection = router.selectModel({ complexity: 'complex' });

      expect(selection.model).toBe('claude-sonnet-4-5');
      expect(selection.reason).toBe('complexity:complex');
    });

    it('should prioritize complexity over quality', () => {
      const router = new ModelRouter();
      // complexity=complex → claude, quality=fast → gpt → complexity wins
      const selection = router.selectModel({ complexity: 'complex', quality: 'fast' });

      expect(selection.model).toBe('claude-sonnet-4-5');
      expect(selection.reason).toBe('complexity:complex');
    });

    it('should resolve explicit model shorthand "claude"', () => {
      const router = new ModelRouter();
      const selection = router.selectModel({ model: 'claude' });

      expect(selection.model).toBe('claude-sonnet-4-5');
      expect(selection.reason).toBe('explicit:claude');
    });

    it('should resolve explicit model shorthand "gpt"', () => {
      const router = new ModelRouter();
      const selection = router.selectModel({ model: 'gpt' });

      expect(selection.model).toBe('gpt-4o-mini');
      expect(selection.reason).toBe('explicit:gpt');
    });

    it('should resolve explicit full model id', () => {
      const router = new ModelRouter();
      const selection = router.selectModel({ model: 'claude-sonnet-4-5' });

      expect(selection.model).toBe('claude-sonnet-4-5');
      expect(selection.reason).toBe('explicit:claude-sonnet-4-5');
    });

    it('should treat "auto" as no-preference', () => {
      const router = new ModelRouter();
      const selection = router.selectModel({ model: 'auto', quality: 'best' });

      expect(selection.model).toBe('claude-sonnet-4-5');
      expect(selection.reason).toBe('quality:best');
    });

    it('should fallback when no params specified', () => {
      const router = new ModelRouter();
      const selection = router.selectModel({});

      expect(selection.model).toBeDefined();
      expect(selection.reason).toContain('fallback');
    });

    it('should skip unavailable provider and fall through', () => {
      const health: ProviderHealth = {
        getState(provider: LLMProviderName): CircuitState {
          return provider === 'anthropic' ? 'OPEN' : 'CLOSED';
        },
      };
      const router = new ModelRouter(health);

      // Requesting claude explicitly, but anthropic is OPEN → should fallback
      const selection = router.selectModel({ model: 'claude' });

      expect(selection.model).toBe('gpt-4o-mini');
      expect(selection.provider).toBe('openai');
    });
  });

  describe('getFallback', () => {
    it('should return OpenAI as fallback for Anthropic', () => {
      const router = new ModelRouter();
      const fallback = router.getFallback('anthropic');

      expect(fallback).not.toBeNull();
      expect(fallback!.provider).toBe('openai');
      expect(fallback!.model).toBe('gpt-4o-mini');
    });

    it('should return Anthropic as fallback for OpenAI', () => {
      const router = new ModelRouter();
      const fallback = router.getFallback('openai');

      expect(fallback).not.toBeNull();
      expect(fallback!.provider).toBe('anthropic');
      expect(fallback!.model).toBe('claude-sonnet-4-5');
    });

    it('should return null if fallback provider is OPEN', () => {
      const health: ProviderHealth = {
        getState(): CircuitState {
          return 'OPEN';
        },
      };
      const router = new ModelRouter(health);

      const fallback = router.getFallback('anthropic');
      expect(fallback).toBeNull();
    });
  });

  describe('getModelConfig', () => {
    it('should return config for a known model', () => {
      const router = new ModelRouter();
      const config = router.getModelConfig('gpt-4o-mini');

      expect(config).toBeDefined();
      expect(config!.provider).toBe('openai');
      expect(config!.costPer1KInput).toBe(0.00015);
    });

    it('should return undefined for unknown model', () => {
      const router = new ModelRouter();
      const config = router.getModelConfig('nonexistent' as any);

      expect(config).toBeUndefined();
    });
  });
});
