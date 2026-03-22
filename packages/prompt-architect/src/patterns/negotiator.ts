import type { PatternDefinition } from '../types.js';

export const NEGOTIATOR_PATTERN: PatternDefinition = {
  name: 'negotiator',
  useFor: [
    'email drafting',
    'conflict resolution',
    'persuasion',
    'stakeholder management',
  ],
  architecture: 'Understand Stakes → Map Interests → Design Approach → Craft Message → Anticipate Response',
  keyElements: [
    'Stakeholder analysis: what does each party want/fear',
    'Multiple approach variants (direct, diplomatic, escalating)',
    'Tone calibration to relationship dynamics',
    'Anticipate objections + prepare responses',
    'Clear call-to-action',
  ],
  personaTraits: ['Emotionally intelligent', 'strategic', 'persuasive but honest'],
  triggerKeywords: [
    'negotiate', 'persuade', 'convince', 'email', 'outreach', 'cold',
    'stakeholder', 'conflict', 'resolve', 'diplomatic', 'pitch',
    'proposal', 'deal', 'agreement', 'objection',
  ],
};
