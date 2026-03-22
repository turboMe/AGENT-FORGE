import { describe, it, expect, vi } from 'vitest';
import { TaskClassifier } from '../classifier.js';

// ── Heuristic classification tests ──────────────────

describe('TaskClassifier — heuristic fallback', () => {
  const classifier = new TaskClassifier();

  it('should detect coding domain from code-related keywords', () => {
    const result = classifier.classifyHeuristic('Fix the bug in this TypeScript function and refactor it');
    expect(result.domain).toContain('coding');
    expect(result.taskType).toBe('text');
  });

  it('should detect writing domain', () => {
    const result = classifier.classifyHeuristic('Write a blog article about AI trends and edit the draft');
    expect(result.domain).toContain('writing');
    expect(result.taskType).toBe('text');
  });

  it('should detect analysis domain', () => {
    const result = classifier.classifyHeuristic('Analyze this data and create a report with statistics');
    expect(result.domain).toContain('analysis');
    expect(result.taskType).toBe('text');
  });

  it('should detect automation domain and set taskType to automation', () => {
    const result = classifier.classifyHeuristic('Automate the workflow for batch processing scripts');
    expect(result.domain).toContain('automation');
    expect(result.taskType).toBe('automation');
  });

  it('should detect translation domain', () => {
    const result = classifier.classifyHeuristic('Translate this document to multilingual format and localize');
    expect(result.domain).toContain('translation');
  });

  it('should detect summarization domain', () => {
    const result = classifier.classifyHeuristic('Summarize this article and provide a brief overview');
    expect(result.domain).toContain('summarization');
  });

  it('should fall back to "general" for unrecognized domains', () => {
    const result = classifier.classifyHeuristic('do something');
    expect(result.domain).toContain('general');
  });

  it('should estimate simple complexity for short tasks', () => {
    const result = classifier.classifyHeuristic('Fix this bug');
    expect(result.complexity).toBe('simple');
  });

  it('should estimate medium complexity for moderate tasks', () => {
    const result = classifier.classifyHeuristic(
      'Write a function that validates user input. It should check the email format and ensure the password meets all the requirements for the security policy.',
    );
    expect(result.complexity).toBe('medium');
  });

  it('should estimate complex complexity for long tasks with constraints', () => {
    const longTask = Array(30).fill('Write detailed documentation for each module.').join(' ');
    const result = classifier.classifyHeuristic(longTask + ' Require format compliance. Must then validate. Additionally ensure quality.');
    expect(result.complexity).toBe('complex');
  });

  it('should extract keywords without stop words', () => {
    const result = classifier.classifyHeuristic('Write a Python function for sorting arrays efficiently');
    expect(result.keywords).toContain('write');
    expect(result.keywords).toContain('python');
    expect(result.keywords).toContain('function');
    expect(result.keywords).toContain('sorting');
    expect(result.keywords).not.toContain('a');
    expect(result.keywords).not.toContain('for');
  });

  it('should set confidence to 0.6 for heuristic classification', () => {
    const result = classifier.classifyHeuristic('Do something');
    expect(result.confidence).toBe(0.6);
  });

  it('should detect multiple domains when keywords overlap', () => {
    const result = classifier.classifyHeuristic('Analyze the code and write a report on the refactoring results');
    expect(result.domain.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle empty task string gracefully', () => {
    const result = classifier.classifyHeuristic('');
    expect(result.domain).toContain('general');
    expect(result.complexity).toBe('simple');
    expect(result.keywords).toEqual([]);
  });
});

// ── LLM-based classification tests ──────────────────

describe('TaskClassifier — LLM-based', () => {
  it('should use LLM gateway when provided', async () => {
    const mockGateway = {
      generate: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          taskType: 'text',
          domain: ['coding'],
          complexity: 'medium',
          keywords: ['typescript', 'refactor'],
        }),
        model: 'gpt-4o-mini',
        provider: 'openai',
        tokensInput: 50,
        tokensOutput: 80,
        latencyMs: 200,
        costEstimate: 0.001,
      }),
    };

    const classifier = new TaskClassifier(mockGateway as any);
    const result = await classifier.classify('Refactor this TypeScript module');

    expect(mockGateway.generate).toHaveBeenCalledOnce();
    expect(result.taskType).toBe('text');
    expect(result.domain).toEqual(['coding']);
    expect(result.complexity).toBe('medium');
    expect(result.confidence).toBe(0.9);
  });

  it('should fall back to heuristic when LLM fails', async () => {
    const mockGateway = {
      generate: vi.fn().mockRejectedValue(new Error('LLM unavailable')),
    };

    const classifier = new TaskClassifier(mockGateway as any);
    const result = await classifier.classify('Write a blog article about coding best practices');

    expect(mockGateway.generate).toHaveBeenCalledOnce();
    expect(result.confidence).toBe(0.6); // heuristic confidence
    expect(result.domain.length).toBeGreaterThan(0);
  });

  it('should fall back to heuristic when LLM returns invalid JSON', async () => {
    const mockGateway = {
      generate: vi.fn().mockResolvedValue({
        content: 'This is not JSON',
        model: 'gpt-4o-mini',
        provider: 'openai',
        tokensInput: 50,
        tokensOutput: 80,
        latencyMs: 200,
        costEstimate: 0.001,
      }),
    };

    const classifier = new TaskClassifier(mockGateway as any);
    const result = await classifier.classify('Analyze data');

    expect(result.confidence).toBe(0.6); // fell back to heuristic
  });

  it('should handle markdown-wrapped JSON from LLM', async () => {
    const mockGateway = {
      generate: vi.fn().mockResolvedValue({
        content: '```json\n{"taskType":"automation","domain":["automation"],"complexity":"complex","keywords":["workflow","pipeline"]}\n```',
        model: 'gpt-4o-mini',
        provider: 'openai',
        tokensInput: 50,
        tokensOutput: 80,
        latencyMs: 200,
        costEstimate: 0.001,
      }),
    };

    const classifier = new TaskClassifier(mockGateway as any);
    const result = await classifier.classify('Build an automation pipeline');

    expect(result.taskType).toBe('automation');
    expect(result.domain).toEqual(['automation']);
    expect(result.complexity).toBe('complex');
    expect(result.confidence).toBe(0.9);
  });

  it('should classify without LLM gateway (heuristic only)', async () => {
    const classifier = new TaskClassifier();
    const result = await classifier.classify('Fix the bug');

    expect(result.confidence).toBe(0.6);
    expect(result.taskType).toBe('text');
  });

  it('should sanitize invalid LLM response fields with fallback defaults', async () => {
    const mockGateway = {
      generate: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          taskType: 'invalid_type',
          domain: 'not_an_array',
          complexity: 'ultra_hard',
          keywords: 42,
        }),
        model: 'gpt-4o-mini',
        provider: 'openai',
        tokensInput: 50,
        tokensOutput: 80,
        latencyMs: 200,
        costEstimate: 0.001,
      }),
    };

    const classifier = new TaskClassifier(mockGateway as any);
    const result = await classifier.classify('Some task');

    expect(result.taskType).toBe('text'); // fallback
    expect(result.domain).toEqual(['general']); // fallback for non-array
    expect(result.complexity).toBe('simple'); // fallback for unknown
    expect(result.keywords).toEqual([]); // fallback for non-array
  });
});
