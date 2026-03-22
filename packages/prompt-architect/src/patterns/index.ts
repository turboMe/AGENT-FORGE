import type { PatternDefinition, ExpertPattern } from '../types.js';

import { ANALYST_PATTERN } from './analyst.js';
import { CREATOR_PATTERN } from './creator.js';
import { ADVISOR_PATTERN } from './advisor.js';
import { PROCESSOR_PATTERN } from './processor.js';
import { ORCHESTRATOR_PATTERN } from './orchestrator.js';
import { GUARDIAN_PATTERN } from './guardian.js';
import { TEACHER_PATTERN } from './teacher.js';
import { NEGOTIATOR_PATTERN } from './negotiator.js';

// ── Pattern Registry ────────────────────────────────

export const PATTERN_REGISTRY: ReadonlyMap<ExpertPattern, PatternDefinition> = new Map([
  ['analyst', ANALYST_PATTERN],
  ['creator', CREATOR_PATTERN],
  ['advisor', ADVISOR_PATTERN],
  ['processor', PROCESSOR_PATTERN],
  ['orchestrator', ORCHESTRATOR_PATTERN],
  ['guardian', GUARDIAN_PATTERN],
  ['teacher', TEACHER_PATTERN],
  ['negotiator', NEGOTIATOR_PATTERN],
]);

/**
 * Get a pattern definition by name.
 * @throws Error if pattern name is invalid
 */
export function getPattern(name: ExpertPattern): PatternDefinition {
  const pattern = PATTERN_REGISTRY.get(name);
  if (!pattern) {
    throw new Error(`Unknown pattern: "${name}". Valid patterns: ${[...PATTERN_REGISTRY.keys()].join(', ')}`);
  }
  return pattern;
}

/**
 * Score all patterns against a task description and return them ranked.
 * Uses exact word matching between the task text and each pattern's triggerKeywords.
 */
export function matchPattern(taskDescription: string): Array<{ pattern: PatternDefinition; score: number }> {
  const text = taskDescription.toLowerCase();
  if (!text.trim()) {
    return [...PATTERN_REGISTRY.values()].map((pattern) => ({ pattern, score: 0 }));
  }

  const words = new Set(text.split(/[\s,.:;!?()]+/).filter(Boolean));

  const scored = [...PATTERN_REGISTRY.values()].map((pattern) => {
    const hits = pattern.triggerKeywords.filter((kw) => {
      // Multi-word keywords: check if phrase exists in text
      if (kw.includes(' ')) return text.includes(kw);
      // Single-word keywords: exact word match only
      return words.has(kw);
    });
    const score = pattern.triggerKeywords.length > 0
      ? hits.length / pattern.triggerKeywords.length
      : 0;
    return { pattern, score };
  });

  return scored.sort((a, b) => b.score - a.score);
}

// ── Re-exports ──────────────────────────────────────

export { ANALYST_PATTERN } from './analyst.js';
export { CREATOR_PATTERN } from './creator.js';
export { ADVISOR_PATTERN } from './advisor.js';
export { PROCESSOR_PATTERN } from './processor.js';
export { ORCHESTRATOR_PATTERN } from './orchestrator.js';
export { GUARDIAN_PATTERN } from './guardian.js';
export { TEACHER_PATTERN } from './teacher.js';
export { NEGOTIATOR_PATTERN } from './negotiator.js';
