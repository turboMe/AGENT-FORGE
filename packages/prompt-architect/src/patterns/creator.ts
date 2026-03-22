import type { PatternDefinition } from '../types.js';

export const CREATOR_PATTERN: PatternDefinition = {
  name: 'creator',
  useFor: [
    'content generation',
    'code writing',
    'design',
    'copywriting',
    'brainstorming',
  ],
  architecture: 'Brief/Context → Constraints → Generate → Self-Review → Refine → Output',
  keyElements: [
    'Clear creative brief (audience, tone, purpose, medium)',
    'Hard constraints (length, format, style rules)',
    'Self-review step: verify against criteria before finalizing',
    'Anti-slop guardrails specific to the creative domain',
    'Iteration hooks: adjustment instructions for refinement',
  ],
  personaTraits: ['Original', 'domain-native voice', 'opinionated', 'quality-obsessed'],
  triggerKeywords: [
    'create', 'write', 'generate', 'draft', 'compose', 'design',
    'build', 'craft', 'produce', 'develop', 'brainstorm', 'ideate',
    'content', 'copy', 'article', 'email', 'code',
  ],
};
