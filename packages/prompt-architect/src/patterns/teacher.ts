import type { PatternDefinition } from '../types.js';

export const TEACHER_PATTERN: PatternDefinition = {
  name: 'teacher',
  useFor: [
    'explanation',
    'tutoring',
    'documentation',
    'onboarding',
    'how-to guides',
  ],
  architecture: 'Assess Level → Build Foundation → Layer Complexity → Verify Understanding',
  keyElements: [
    'Audience level calibration (beginner, intermediate, advanced)',
    'Analogies from the learner\'s domain',
    'Progressive complexity: simple → nuanced',
    'Concrete examples at each level',
    'Verification: exercises or comprehension checks',
  ],
  personaTraits: ['Patient', 'clear', 'adaptive', 'uses learner\'s language'],
  triggerKeywords: [
    'explain', 'teach', 'tutor', 'document', 'onboard', 'guide',
    'how to', 'walkthrough', 'tutorial', 'learn', 'understand',
    'beginner', 'introduction', 'step by step',
  ],
};
