import { describe, it, expect, vi } from 'vitest';
import { SkillMatcher } from '../skill-matcher.js';
import type { TaskClassification } from '../types.js';

// ── Mock skill library ──────────────────────────────

function createMockSkillLibrary(results: any[] = []) {
  return {
    search: vi.fn().mockResolvedValue(results),
    save: vi.fn(),
    updateStats: vi.fn(),
    findById: vi.fn(),
    findByTenant: vi.fn(),
  };
}

// ── Test classification data ────────────────────────

const codingClassification: TaskClassification = {
  taskType: 'text',
  domain: ['coding'],
  complexity: 'medium',
  keywords: ['typescript', 'refactor', 'function'],
  confidence: 0.9,
};

const generalClassification: TaskClassification = {
  taskType: 'text',
  domain: ['general'],
  complexity: 'simple',
  keywords: ['help', 'something'],
  confidence: 0.6,
};

const emptyKeywordsClassification: TaskClassification = {
  taskType: 'text',
  domain: ['general'],
  complexity: 'simple',
  keywords: [],
  confidence: 0.6,
};

// ── Tests ───────────────────────────────────────────

describe('SkillMatcher', () => {
  it('should search skill library with keywords and domains', async () => {
    const mockResults = [
      {
        skill: { _id: 'skill-1', name: 'typescript-refactor', domain: ['coding'] },
        matchScore: 0.92,
        recommendation: 'use' as const,
      },
    ];
    const mockLib = createMockSkillLibrary(mockResults);
    const matcher = new SkillMatcher(mockLib as any);

    const results = await matcher.match('tenant-1', codingClassification);

    expect(mockLib.search).toHaveBeenCalledWith(
      'tenant-1',
      'typescript refactor function coding',
      {
        limit: 5,
        minScore: 0,
        domains: ['coding'],
      },
    );
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      skillId: 'skill-1',
      skillName: 'typescript-refactor',
      matchScore: 0.92,
      recommendation: 'use',
      domains: ['coding'],
    });
  });

  it('should not filter by domain when domain is "general"', async () => {
    const mockLib = createMockSkillLibrary([]);
    const matcher = new SkillMatcher(mockLib as any);

    await matcher.match('tenant-1', generalClassification);

    expect(mockLib.search).toHaveBeenCalledWith(
      'tenant-1',
      'help something',
      {
        limit: 5,
        minScore: 0,
        domains: undefined,
      },
    );
  });

  it('should return empty array when no matches found', async () => {
    const mockLib = createMockSkillLibrary([]);
    const matcher = new SkillMatcher(mockLib as any);

    const results = await matcher.match('tenant-1', codingClassification);
    expect(results).toEqual([]);
  });

  it('should return empty array when query is empty', async () => {
    const emptyDomainClas: TaskClassification = {
      ...emptyKeywordsClassification,
      domain: ['general'],
    };
    const mockLib = createMockSkillLibrary();
    const matcher = new SkillMatcher(mockLib as any);

    const results = await matcher.match('tenant-1', emptyDomainClas);
    expect(results).toEqual([]);
    expect(mockLib.search).not.toHaveBeenCalled();
  });

  it('should map multiple search results correctly', async () => {
    const mockResults = [
      {
        skill: { _id: 's1', name: 'skill-one', domain: ['coding'] },
        matchScore: 0.95,
        recommendation: 'use' as const,
      },
      {
        skill: { _id: 's2', name: 'skill-two', domain: ['coding', 'analysis'] },
        matchScore: 0.72,
        recommendation: 'adapt' as const,
      },
      {
        skill: { _id: 's3', name: 'skill-three', domain: ['general'] },
        matchScore: 0.40,
        recommendation: 'create' as const,
      },
    ];
    const mockLib = createMockSkillLibrary(mockResults);
    const matcher = new SkillMatcher(mockLib as any);

    const results = await matcher.match('tenant-1', codingClassification);

    expect(results).toHaveLength(3);
    expect(results[0]!.recommendation).toBe('use');
    expect(results[1]!.recommendation).toBe('adapt');
    expect(results[2]!.recommendation).toBe('create');
  });

  describe('buildSearchQuery', () => {
    it('should combine keywords and non-general domains', () => {
      const matcher = new SkillMatcher({} as any);
      const query = matcher.buildSearchQuery(codingClassification);
      expect(query).toBe('typescript refactor function coding');
    });

    it('should exclude "general" from the query', () => {
      const matcher = new SkillMatcher({} as any);
      const query = matcher.buildSearchQuery(generalClassification);
      expect(query).toBe('help something');
    });

    it('should return empty string for empty keywords and general domain', () => {
      const matcher = new SkillMatcher({} as any);
      const query = matcher.buildSearchQuery(emptyKeywordsClassification);
      expect(query).toBe('');
    });
  });
});
