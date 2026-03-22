import type { ISkillLibrary, SkillSearchResult } from '@agentforge/skill-library';
import type { ISkillMatcher, TaskClassification, SkillMatchResult } from './types.js';

// ── SkillMatcher ────────────────────────────────────

export class SkillMatcher implements ISkillMatcher {
  private readonly skillLibrary: ISkillLibrary;

  constructor(skillLibrary: ISkillLibrary) {
    this.skillLibrary = skillLibrary;
  }

  /**
   * Search the skill library for skills matching the task classification.
   * Builds a query from keywords + domain and maps results to SkillMatchResult.
   */
  async match(
    tenantId: string,
    classification: TaskClassification,
  ): Promise<SkillMatchResult[]> {
    const query = this.buildSearchQuery(classification);

    if (!query) {
      return [];
    }

    const searchResults = await this.skillLibrary.search(tenantId, query, {
      limit: 5,
      minScore: 0,
      domains: classification.domain.length > 0 && !classification.domain.includes('general')
        ? classification.domain
        : undefined,
    });

    return searchResults.map((result) => this.toMatchResult(result));
  }

  /**
   * Build a search query string from the classification keywords and domains.
   */
  buildSearchQuery(classification: TaskClassification): string {
    const parts: string[] = [];

    // Add keywords (most important for semantic match)
    if (classification.keywords.length > 0) {
      parts.push(...classification.keywords);
    }

    // Add domain names (secondary signal)
    if (classification.domain.length > 0 && !classification.domain.includes('general')) {
      parts.push(...classification.domain);
    }

    return parts.join(' ');
  }

  /**
   * Map a SkillSearchResult to our SkillMatchResult.
   */
  private toMatchResult(result: SkillSearchResult): SkillMatchResult {
    return {
      skillId: result.skill._id,
      skillName: result.skill.name,
      matchScore: result.matchScore,
      recommendation: result.recommendation,
      domains: result.skill.domain,
    };
  }
}
