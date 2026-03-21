import { ROUTING_THRESHOLDS } from '@agentforge/shared';
import type { IDecisionRouter, TaskClassification, SkillMatchResult, RoutingDecision } from './types.js';

// ── DecisionRouter ──────────────────────────────────

export class DecisionRouter implements IDecisionRouter {
  /**
   * Decide how to handle a task based on classification and skill matches.
   *
   * Routing thresholds (from @agentforge/shared):
   * - score >= 0.90 → use_existing (exact match)
   * - score 0.65–0.89 → adapt_existing (partial match)
   * - score < 0.65 → create_new (no usable match)
   */
  route(
    classification: TaskClassification,
    matches: SkillMatchResult[],
    options?: { forceNewSkill?: boolean },
  ): RoutingDecision {
    // Force new skill creation if explicitly requested
    if (options?.forceNewSkill) {
      return {
        action: 'create_new',
        searchResult: 'no_match',
        matchScore: 0,
        reasoning: 'Forced new skill creation by user request (forceNewSkill=true).',
      };
    }

    // No matches found
    if (matches.length === 0) {
      return {
        action: 'create_new',
        searchResult: 'no_match',
        matchScore: 0,
        reasoning: `No matching skills found for domains [${classification.domain.join(', ')}]. Creating new skill.`,
      };
    }

    // Take the best match
    const best = matches[0]!;

    // Route based on match score thresholds
    if (best.matchScore >= ROUTING_THRESHOLDS.USE_EXISTING) {
      return {
        action: 'use_existing',
        searchResult: 'exact_match',
        matchedSkillId: best.skillId,
        matchedSkillName: best.skillName,
        matchScore: best.matchScore,
        reasoning: `Exact match found: "${best.skillName}" (score: ${best.matchScore}). Using existing skill.`,
      };
    }

    if (best.matchScore >= ROUTING_THRESHOLDS.ADAPT_EXISTING) {
      return {
        action: 'adapt_existing',
        searchResult: 'partial_match',
        matchedSkillId: best.skillId,
        matchedSkillName: best.skillName,
        matchScore: best.matchScore,
        reasoning: `Partial match found: "${best.skillName}" (score: ${best.matchScore}). Adapting existing skill for task.`,
      };
    }

    // Score below adapt threshold → create new
    return {
      action: 'create_new',
      searchResult: 'no_match',
      matchScore: best.matchScore,
      reasoning: `Best match "${best.skillName}" scored ${best.matchScore}, below adapt threshold (${ROUTING_THRESHOLDS.ADAPT_EXISTING}). Creating new skill.`,
    };
  }
}
