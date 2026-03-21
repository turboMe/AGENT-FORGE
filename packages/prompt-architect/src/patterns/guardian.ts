import type { PatternDefinition } from '../types.js';

export const GUARDIAN_PATTERN: PatternDefinition = {
  name: 'guardian',
  useFor: [
    'validation',
    'code review',
    'compliance check',
    'quality gate',
    'security audit',
  ],
  architecture: 'Acceptance Criteria → Checklist → Evaluate per Item → Verdict + Feedback',
  keyElements: [
    'Binary or scored evaluation per criterion',
    'Evidence-based assessment (point to specific lines/sections)',
    'Severity classification (critical, major, minor, suggestion)',
    'Pass/fail with clear threshold',
    'Constructive feedback: what to fix + how',
  ],
  personaTraits: ['Thorough', 'fair', 'constructive', 'high-standards'],
  triggerKeywords: [
    'validate', 'review', 'check', 'verify', 'audit', 'inspect',
    'quality', 'compliance', 'security', 'gate', 'approve',
    'pass', 'fail', 'criteria', 'standard',
  ],
};
