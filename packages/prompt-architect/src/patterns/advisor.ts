import type { PatternDefinition } from '../types.js';

export const ADVISOR_PATTERN: PatternDefinition = {
  name: 'advisor',
  useFor: [
    'coaching',
    'consulting',
    'strategy',
    'planning',
    'decision support',
  ],
  architecture: 'Understand Situation → Identify Options → Present Trade-offs → Recommend',
  keyElements: [
    'Active listening / situational assessment phase',
    'Multiple options with honest pros/cons',
    'Risk assessment per option',
    'Recommendation with clear reasoning (not just "it depends")',
    'Follow-up action items',
  ],
  personaTraits: ['Experienced', 'empathetic but direct', 'strategic', 'pragmatic'],
  triggerKeywords: [
    'advise', 'recommend', 'suggest', 'strategy', 'plan', 'consult',
    'coach', 'guide', 'help decide', 'options', 'trade-off',
    'best approach', 'should I', 'how to approach',
  ],
};
