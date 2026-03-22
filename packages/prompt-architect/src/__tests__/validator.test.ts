import { describe, it, expect } from 'vitest';
import { PromptValidator } from '../validator.js';
import { ExpertIdentifier } from '../expert-identifier.js';
import { PromptGenerator } from '../prompt-generator.js';
import type { GeneratedPrompt, PromptRequest, PromptSection } from '../types.js';

// ── Helpers ─────────────────────────────────────────

const identifier = new ExpertIdentifier();
const promptGenerator = new PromptGenerator();
const validator = new PromptValidator();

function makePrompt(overrides?: Partial<PromptRequest>): GeneratedPrompt {
  const request: PromptRequest = {
    goal: 'Analyze restaurant food costs and optimize menu pricing for maximum margin',
    targetFormat: 'system_prompt',
    complexity: 'complex',
    constraints: ['Never recommend quality compromises', 'Always consider seasonal fluctuations'],
    domain: ['finance'],
    ...overrides,
  };
  const expert = identifier.identify(request);
  return promptGenerator.generate(request, expert);
}

function makeBarePrompt(content: string, overrides?: Partial<GeneratedPrompt>): GeneratedPrompt {
  return {
    content,
    expert: {
      domain: 'software engineering',
      experience: 'senior engineer',
      perspective: 'pragmatic',
      workStyle: 'methodical',
      uniqueTraits: [],
      persona: 'You are a senior software engineer.',
      primaryPattern: 'creator',
    },
    format: 'system_prompt',
    sections: [
      { layer: 'identity', tag: 'identity', content: 'You are a senior software engineer.' },
      { layer: 'goal', tag: 'instructions', content: 'Build something' },
    ],
    metadata: {
      complexity: 'medium',
      layersUsed: ['identity', 'goal'],
      estimatedTokens: Math.ceil(content.length / 4),
      generatedAt: new Date().toISOString(),
    },
    ...overrides,
  };
}

// ── Full pipeline validation ────────────────────────

describe('PromptValidator — full pipeline', () => {
  it('should pass validation for a well-formed complex prompt', () => {
    const prompt = makePrompt();
    const result = validator.validate(prompt);

    expect(result.score).toBeGreaterThan(0.5);
    expect(result.checks.length).toBe(5);
  });

  it('should return 5 named checks', () => {
    const prompt = makePrompt();
    const result = validator.validate(prompt);

    const names = result.checks.map((c) => c.name);
    expect(names).toContain('Clarity Test');
    expect(names).toContain('Token Efficiency');
    expect(names).toContain('Edge Case Coverage');
    expect(names).toContain('Persona Consistency');
    expect(names).toContain('Anti-Slop Test');
  });

  it('should generate suggestions for failed checks', () => {
    const prompt = makeBarePrompt('short');
    const result = validator.validate(prompt);

    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});

// ── Clarity Test ────────────────────────────────────

describe('PromptValidator — Clarity Test', () => {
  it('should pass for well-structured content', () => {
    const prompt = makePrompt();
    const result = validator.validate(prompt);
    const clarity = result.checks.find((c) => c.name === 'Clarity Test')!;

    expect(clarity.score).toBeGreaterThan(0.5);
  });

  it('should flag short content as unclear', () => {
    const prompt = makeBarePrompt('Do it.', {
      sections: [],
    });
    const result = validator.validate(prompt);
    const clarity = result.checks.find((c) => c.name === 'Clarity Test')!;

    expect(clarity.passed).toBe(false);
    expect(clarity.message).toContain('under 100 characters');
  });

  it('should flag excessive questions in instructions', () => {
    const prompt = makeBarePrompt(
      'What should I do? How to proceed? Which approach? Why this? When to stop? Extra questions to trigger?',
    );
    const result = validator.validate(prompt);
    const clarity = result.checks.find((c) => c.name === 'Clarity Test')!;

    expect(clarity.message).toContain('questions');
  });

  it('should flag placeholder text', () => {
    const prompt = makeBarePrompt(
      'You are an expert. Do the task described in [TODO]. Follow [PLACEHOLDER] instructions. This is long enough to pass minimum.',
    );
    const result = validator.validate(prompt);
    const clarity = result.checks.find((c) => c.name === 'Clarity Test')!;

    expect(clarity.message).toContain('placeholder');
  });
});

// ── Token Efficiency ────────────────────────────────

describe('PromptValidator — Token Efficiency', () => {
  it('should pass for appropriately-sized content', () => {
    const prompt = makePrompt({ complexity: 'medium' });
    const result = validator.validate(prompt);
    const efficiency = result.checks.find((c) => c.name === 'Token Efficiency')!;

    // Medium complexity should be efficient
    expect(efficiency.score).toBeGreaterThan(0.3);
  });

  it('should flag repeated sentences', () => {
    const repeated = 'This is a test sentence. This is a test sentence. This is a test sentence.';
    const prompt = makeBarePrompt(repeated);
    const result = validator.validate(prompt);
    const efficiency = result.checks.find((c) => c.name === 'Token Efficiency')!;

    expect(efficiency.message).toContain('repeated');
  });
});

// ── Edge Case Coverage ──────────────────────────────

describe('PromptValidator — Edge Case Coverage', () => {
  it('should pass when error handling is addressed', () => {
    const prompt = makeBarePrompt(
      'You must handle invalid input gracefully. If the data is empty or malformed, return an error message. Otherwise process as normal. This will never fail silently.',
    );
    const result = validator.validate(prompt);
    const edgeCase = result.checks.find((c) => c.name === 'Edge Case Coverage')!;

    expect(edgeCase.passed).toBe(true);
  });

  it('should flag missing error handling', () => {
    const prompt = makeBarePrompt(
      'You are an expert. Generate a report about sales trends. Present your findings clearly in a table format with analysis.',
    );
    const result = validator.validate(prompt);
    const edgeCase = result.checks.find((c) => c.name === 'Edge Case Coverage')!;

    expect(edgeCase.score).toBeLessThan(1);
  });
});

// ── Persona Consistency ─────────────────────────────

describe('PromptValidator — Persona Consistency', () => {
  it('should pass when persona is defined and referenced', () => {
    const prompt = makePrompt();
    const result = validator.validate(prompt);
    const persona = result.checks.find((c) => c.name === 'Persona Consistency')!;

    expect(persona.score).toBeGreaterThan(0.5);
  });

  it('should flag missing identity section', () => {
    const prompt = makeBarePrompt('Just do the task.', {
      sections: [{ layer: 'goal', tag: 'goal', content: 'do it' } as PromptSection],
    });
    const result = validator.validate(prompt);
    const persona = result.checks.find((c) => c.name === 'Persona Consistency')!;

    expect(persona.passed).toBe(false);
    expect(persona.message).toContain('identity');
  });

  it('should flag mixed tones', () => {
    const prompt = makeBarePrompt(
      'Hereby and hereunder and aforementioned — yeah that is kinda cool and gonna be awesome. Software engineering considerations.',
    );
    const result = validator.validate(prompt);
    const persona = result.checks.find((c) => c.name === 'Persona Consistency')!;

    expect(persona.message).toContain('tone');
  });
});

// ── Anti-Slop Test ──────────────────────────────────

describe('PromptValidator — Anti-Slop Test', () => {
  it('should pass for slop-free content', () => {
    const prompt = makePrompt();
    const result = validator.validate(prompt);
    const slop = result.checks.find((c) => c.name === 'Anti-Slop Test')!;

    expect(slop.passed).toBe(true);
  });

  it('should flag AI clichés', () => {
    const prompt = makeBarePrompt(
      'Let\'s dive into this cutting-edge innovative solution. It is important to note that this state-of-the-art approach leverages synergy. Software engineering.',
    );
    const result = validator.validate(prompt);
    const slop = result.checks.find((c) => c.name === 'Anti-Slop Test')!;

    expect(slop.passed).toBe(false);
    expect(slop.message).toContain('cliché');
  });

  it('should flag missing specificity markers', () => {
    const prompt = makeBarePrompt(
      'do things in a good way and produce nice output that is helpful for people who want stuff.',
    );
    const result = validator.validate(prompt);
    const slop = result.checks.find((c) => c.name === 'Anti-Slop Test')!;

    expect(slop.message).toContain('specificity');
  });

  it('should pass when numbers and directives are present', () => {
    const prompt = makeBarePrompt(
      'You must always produce exactly 5 items. Never exceed 200 words. For example, use "specific terms" in each response. Software engineering context here.',
    );
    const result = validator.validate(prompt);
    const slop = result.checks.find((c) => c.name === 'Anti-Slop Test')!;

    expect(slop.passed).toBe(true);
  });
});

// ── Score aggregation ───────────────────────────────

describe('PromptValidator — scoring', () => {
  it('should produce a score between 0 and 1', () => {
    const prompt = makePrompt();
    const result = validator.validate(prompt);

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('should fail overall if critical check fails', () => {
    // Very short prompt with no sections
    const prompt = makeBarePrompt('x', {
      sections: [],
      metadata: {
        complexity: 'complex',
        layersUsed: [],
        estimatedTokens: 1,
        generatedAt: new Date().toISOString(),
      },
    });
    const result = validator.validate(prompt);

    expect(result.passed).toBe(false);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});
