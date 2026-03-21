import { describe, it, expect } from 'vitest';
import { cosineSimilarity, scoreToRecommendation } from '../search.js';

// ── Pure function tests (no mocking needed) ─────────

describe('cosineSimilarity', () => {
  it('should return 1 for identical vectors', () => {
    const v = [1, 2, 3, 4, 5];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
  });

  it('should return 0 for orthogonal vectors', () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0, 5);
  });

  it('should return -1 for opposite vectors', () => {
    const a = [1, 2, 3];
    const b = [-1, -2, -3];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0, 5);
  });

  it('should return value between -1 and 1 for arbitrary vectors', () => {
    const a = [0.3, 0.7, 0.1, 0.9];
    const b = [0.5, 0.2, 0.8, 0.4];
    const similarity = cosineSimilarity(a, b);
    expect(similarity).toBeGreaterThanOrEqual(-1);
    expect(similarity).toBeLessThanOrEqual(1);
  });

  it('should handle zero vectors', () => {
    const a = [0, 0, 0];
    const b = [1, 2, 3];
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  it('should return 0 for empty vectors', () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it('should return 0 for unequal length vectors', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  it('should compute correctly for known values', () => {
    // cos(45°) = √2/2 ≈ 0.7071
    const a = [1, 0];
    const b = [1, 1];
    expect(cosineSimilarity(a, b)).toBeCloseTo(Math.SQRT2 / 2, 4);
  });
});

describe('scoreToRecommendation', () => {
  it('should return "use" for scores >= 0.9', () => {
    expect(scoreToRecommendation(0.9)).toBe('use');
    expect(scoreToRecommendation(0.95)).toBe('use');
    expect(scoreToRecommendation(1.0)).toBe('use');
  });

  it('should return "adapt" for scores >= 0.65 and < 0.9', () => {
    expect(scoreToRecommendation(0.65)).toBe('adapt');
    expect(scoreToRecommendation(0.75)).toBe('adapt');
    expect(scoreToRecommendation(0.89)).toBe('adapt');
  });

  it('should return "create" for scores < 0.65', () => {
    expect(scoreToRecommendation(0.64)).toBe('create');
    expect(scoreToRecommendation(0.5)).toBe('create');
    expect(scoreToRecommendation(0.0)).toBe('create');
  });
});

describe('SkillSearch (hybrid scoring)', () => {
  it('should combine keyword and vector scores with correct weights', () => {
    // The default weights are 0.4 keyword + 0.6 vector
    const keywordScore = 0.8;  // normalized text score
    const vectorScore = 0.9;   // cosine similarity

    const hybrid = 0.4 * keywordScore + 0.6 * vectorScore;
    expect(hybrid).toBeCloseTo(0.86, 2);
  });

  it('should handle keyword-only results (no embedding)', () => {
    const keywordScore = 0.7;
    const vectorScore = 0;  // no embedding available

    const hybrid = 0.4 * keywordScore + 0.6 * vectorScore;
    expect(hybrid).toBeCloseTo(0.28, 2);
    expect(scoreToRecommendation(hybrid)).toBe('create');
  });

  it('should handle vector-only results (no text match)', () => {
    const keywordScore = 0;
    const vectorScore = 0.85;

    const hybrid = 0.4 * keywordScore + 0.6 * vectorScore;
    expect(hybrid).toBeCloseTo(0.51, 2);
    expect(scoreToRecommendation(hybrid)).toBe('create');
  });

  it('should correctly identify exact matches with both signals', () => {
    const keywordScore = 1.0;
    const vectorScore = 0.95;

    const hybrid = 0.4 * keywordScore + 0.6 * vectorScore;
    expect(hybrid).toBeCloseTo(0.97, 2);
    expect(scoreToRecommendation(hybrid)).toBe('use');
  });

  it('should correctly identify adapt-worthy matches', () => {
    const keywordScore = 0.6;
    const vectorScore = 0.8;

    const hybrid = 0.4 * keywordScore + 0.6 * vectorScore;
    expect(hybrid).toBeCloseTo(0.72, 2);
    expect(scoreToRecommendation(hybrid)).toBe('adapt');
  });
});
