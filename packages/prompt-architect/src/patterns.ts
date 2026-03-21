// 8 Expert pattern templates
// Phase 4 implementation

export const EXPERT_PATTERNS = [
  'creator',
  'analyst',
  'processor',
  'negotiator',
  'advisor',
  'translator',
  'evaluator',
  'automator',
] as const;

export type ExpertPattern = (typeof EXPERT_PATTERNS)[number];
