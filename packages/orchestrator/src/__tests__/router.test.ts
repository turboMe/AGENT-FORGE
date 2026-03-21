import { describe, it, expect } from 'vitest';
import { DecisionRouter } from '../router.js';
import type { TaskClassification, SkillMatchResult } from '../types.js';

// ── Shared test data ────────────────────────────────

const baseClassification: TaskClassification = {
  taskType: 'text',
  domain: ['coding'],
  complexity: 'medium',
  keywords: ['typescript', 'refactor'],
  confidence: 0.9,
};

function makeMatch(score: number, overrides?: Partial<SkillMatchResult>): SkillMatchResult {
  return {
    skillId: 'skill-123',
    skillName: 'test-skill',
    matchScore: score,
    recommendation: score >= 0.9 ? 'use' : score >= 0.65 ? 'adapt' : 'create',
    domains: ['coding'],
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────

describe('DecisionRouter', () => {
  const router = new DecisionRouter();

  describe('use_existing (score >= 0.90)', () => {
    it('should route to use_existing for exact match (score 0.95)', () => {
      const decision = router.route(baseClassification, [makeMatch(0.95)]);

      expect(decision.action).toBe('use_existing');
      expect(decision.searchResult).toBe('exact_match');
      expect(decision.matchedSkillId).toBe('skill-123');
      expect(decision.matchScore).toBe(0.95);
      expect(decision.reasoning).toContain('Exact match');
    });

    it('should route to use_existing at boundary (score 0.90)', () => {
      const decision = router.route(baseClassification, [makeMatch(0.9)]);
      expect(decision.action).toBe('use_existing');
      expect(decision.searchResult).toBe('exact_match');
    });

    it('should route to use_existing for perfect match (score 1.0)', () => {
      const decision = router.route(baseClassification, [makeMatch(1.0)]);
      expect(decision.action).toBe('use_existing');
    });
  });

  describe('adapt_existing (score 0.65–0.89)', () => {
    it('should route to adapt_existing for partial match (score 0.75)', () => {
      const decision = router.route(baseClassification, [makeMatch(0.75)]);

      expect(decision.action).toBe('adapt_existing');
      expect(decision.searchResult).toBe('partial_match');
      expect(decision.matchedSkillId).toBe('skill-123');
      expect(decision.matchScore).toBe(0.75);
      expect(decision.reasoning).toContain('Partial match');
    });

    it('should route to adapt_existing at lower boundary (score 0.65)', () => {
      const decision = router.route(baseClassification, [makeMatch(0.65)]);
      expect(decision.action).toBe('adapt_existing');
      expect(decision.searchResult).toBe('partial_match');
    });

    it('should route to adapt_existing at upper boundary (score 0.89)', () => {
      const decision = router.route(baseClassification, [makeMatch(0.89)]);
      expect(decision.action).toBe('adapt_existing');
    });
  });

  describe('create_new (score < 0.65)', () => {
    it('should route to create_new for low match (score 0.50)', () => {
      const decision = router.route(baseClassification, [makeMatch(0.5)]);

      expect(decision.action).toBe('create_new');
      expect(decision.searchResult).toBe('no_match');
      expect(decision.matchedSkillId).toBeUndefined();
      expect(decision.matchScore).toBe(0.5);
      expect(decision.reasoning).toContain('below adapt threshold');
    });

    it('should route to create_new at boundary (score 0.64)', () => {
      const decision = router.route(baseClassification, [makeMatch(0.64)]);
      expect(decision.action).toBe('create_new');
      expect(decision.searchResult).toBe('no_match');
    });

    it('should route to create_new for zero score', () => {
      const decision = router.route(baseClassification, [makeMatch(0)]);
      expect(decision.action).toBe('create_new');
    });
  });

  describe('no matches', () => {
    it('should route to create_new when matches array is empty', () => {
      const decision = router.route(baseClassification, []);

      expect(decision.action).toBe('create_new');
      expect(decision.searchResult).toBe('no_match');
      expect(decision.matchScore).toBe(0);
      expect(decision.reasoning).toContain('No matching skills found');
      expect(decision.reasoning).toContain('coding');
    });
  });

  describe('forceNewSkill', () => {
    it('should force create_new regardless of match score', () => {
      const decision = router.route(
        baseClassification,
        [makeMatch(0.99)],
        { forceNewSkill: true },
      );

      expect(decision.action).toBe('create_new');
      expect(decision.searchResult).toBe('no_match');
      expect(decision.matchScore).toBe(0);
      expect(decision.reasoning).toContain('forceNewSkill=true');
    });

    it('should not force when forceNewSkill is false', () => {
      const decision = router.route(
        baseClassification,
        [makeMatch(0.95)],
        { forceNewSkill: false },
      );

      expect(decision.action).toBe('use_existing');
    });

    it('should not force when options is undefined', () => {
      const decision = router.route(baseClassification, [makeMatch(0.95)]);
      expect(decision.action).toBe('use_existing');
    });
  });

  describe('best match selection', () => {
    it('should use the first match (highest score)', () => {
      const matches = [
        makeMatch(0.92, { skillId: 'best', skillName: 'best-skill' }),
        makeMatch(0.80, { skillId: 'mid', skillName: 'mid-skill' }),
        makeMatch(0.40, { skillId: 'low', skillName: 'low-skill' }),
      ];

      const decision = router.route(baseClassification, matches);

      expect(decision.action).toBe('use_existing');
      expect(decision.matchedSkillId).toBe('best');
      expect(decision.matchedSkillName).toBe('best-skill');
    });
  });
});
