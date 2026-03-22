import { describe, it, expect } from 'vitest';
import {
  PATTERN_REGISTRY,
  getPattern,
  matchPattern,
  ANALYST_PATTERN,
  CREATOR_PATTERN,
  ADVISOR_PATTERN,
  PROCESSOR_PATTERN,
  ORCHESTRATOR_PATTERN,
  GUARDIAN_PATTERN,
  TEACHER_PATTERN,
  NEGOTIATOR_PATTERN,
} from '../patterns/index.js';

// ── Pattern Registry ────────────────────────────────

describe('PATTERN_REGISTRY', () => {
  it('should contain all 8 patterns', () => {
    expect(PATTERN_REGISTRY.size).toBe(8);
  });

  it('should have correct keys', () => {
    const keys = [...PATTERN_REGISTRY.keys()];
    expect(keys).toEqual([
      'analyst', 'creator', 'advisor', 'processor',
      'orchestrator', 'guardian', 'teacher', 'negotiator',
    ]);
  });

  it('should have valid definitions for every pattern', () => {
    for (const [name, pattern] of PATTERN_REGISTRY) {
      expect(pattern.name).toBe(name);
      expect(pattern.useFor.length).toBeGreaterThan(0);
      expect(pattern.architecture).toBeTruthy();
      expect(pattern.keyElements.length).toBeGreaterThan(0);
      expect(pattern.personaTraits.length).toBeGreaterThan(0);
      expect(pattern.triggerKeywords.length).toBeGreaterThan(0);
    }
  });
});

// ── getPattern ──────────────────────────────────────

describe('getPattern', () => {
  it('should return the correct pattern for valid names', () => {
    expect(getPattern('analyst')).toEqual(ANALYST_PATTERN);
    expect(getPattern('creator')).toEqual(CREATOR_PATTERN);
    expect(getPattern('advisor')).toEqual(ADVISOR_PATTERN);
    expect(getPattern('processor')).toEqual(PROCESSOR_PATTERN);
    expect(getPattern('orchestrator')).toEqual(ORCHESTRATOR_PATTERN);
    expect(getPattern('guardian')).toEqual(GUARDIAN_PATTERN);
    expect(getPattern('teacher')).toEqual(TEACHER_PATTERN);
    expect(getPattern('negotiator')).toEqual(NEGOTIATOR_PATTERN);
  });

  it('should throw for invalid pattern name', () => {
    expect(() => getPattern('invalid' as any)).toThrow('Unknown pattern: "invalid"');
  });
});

// ── matchPattern ────────────────────────────────────

describe('matchPattern', () => {
  it('should rank analyst pattern highest for evaluation tasks', () => {
    const results = matchPattern('analyze and evaluate this data report');
    expect(results[0]!.pattern.name).toBe('analyst');
    expect(results[0]!.score).toBeGreaterThan(0);
  });

  it('should rank creator pattern highest for content generation', () => {
    const results = matchPattern('create and draft content for a design brainstorm');
    expect(results[0]!.pattern.name).toBe('creator');
    expect(results[0]!.score).toBeGreaterThan(0);
  });

  it('should rank processor pattern highest for data tasks', () => {
    const results = matchPattern('parse and transform this data schema to normalize the format');
    expect(results[0]!.pattern.name).toBe('processor');
    expect(results[0]!.score).toBeGreaterThan(0);
  });

  it('should rank teacher pattern highest for learning tasks', () => {
    const results = matchPattern('teach and explain this tutorial for a beginner to learn how to do it');
    expect(results[0]!.pattern.name).toBe('teacher');
    expect(results[0]!.score).toBeGreaterThan(0);
  });

  it('should rank negotiator pattern for email tasks', () => {
    const results = matchPattern('negotiate a cold email outreach pitch to persuade and convince a stakeholder');
    expect(results[0]!.pattern.name).toBe('negotiator');
    expect(results[0]!.score).toBeGreaterThan(0);
  });

  it('should return all 8 patterns in results', () => {
    const results = matchPattern('do something');
    expect(results.length).toBe(8);
  });

  it('should handle empty string', () => {
    const results = matchPattern('');
    expect(results.length).toBe(8);
    results.forEach((r) => expect(r.score).toBe(0));
  });
});

// ── Individual patterns ─────────────────────────────

describe('Pattern definitions', () => {
  it('analyst should cover evaluation tasks', () => {
    expect(ANALYST_PATTERN.useFor).toContain('evaluation');
    expect(ANALYST_PATTERN.architecture).toContain('Criteria');
  });

  it('creator should cover content generation', () => {
    expect(CREATOR_PATTERN.useFor).toContain('content generation');
    expect(CREATOR_PATTERN.architecture).toContain('Generate');
  });

  it('guardian should cover validation tasks', () => {
    expect(GUARDIAN_PATTERN.useFor).toContain('validation');
    expect(GUARDIAN_PATTERN.architecture).toContain('Checklist');
  });

  it('orchestrator should cover workflow tasks', () => {
    expect(ORCHESTRATOR_PATTERN.useFor).toContain('multi-step workflows');
    expect(ORCHESTRATOR_PATTERN.architecture).toContain('Decompose');
  });
});
