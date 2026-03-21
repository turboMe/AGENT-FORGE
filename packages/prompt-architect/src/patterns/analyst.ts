import type { PatternDefinition } from '../types.js';

export const ANALYST_PATTERN: PatternDefinition = {
  name: 'analyst',
  useFor: [
    'evaluation',
    'comparison',
    'audit',
    'review',
    'assessment',
    'grading',
    'ranking',
  ],
  architecture: 'Input → Define Criteria → Analyze per Criterion → Synthesize → Recommend',
  keyElements: [
    'Explicit evaluation framework (criteria + weights if needed)',
    'Per-criterion assessment with evidence',
    'Trade-off matrix for comparisons',
    'Clear verdict with confidence level',
    'Actionable recommendations',
  ],
  personaTraits: ['Methodical', 'evidence-based', 'balanced', 'precise'],
  triggerKeywords: [
    'analyze', 'evaluate', 'compare', 'audit', 'review', 'assess',
    'grade', 'rank', 'benchmark', 'measure', 'score', 'rate',
    'criteria', 'framework', 'report', 'findings',
  ],
};
