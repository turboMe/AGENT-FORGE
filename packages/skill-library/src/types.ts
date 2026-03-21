import type { ISkill } from '@agentforge/shared';

export interface SkillSearchResult {
  skill: ISkill | null;
  matchScore: number;
  recommendation: 'use' | 'adapt' | 'create';
}

export interface ISkillLibrary {
  search(tenantId: string, keywords: string[], domain?: string[]): Promise<SkillSearchResult>;
  save(skill: Partial<ISkill>): Promise<ISkill>;
  updateStats(skillId: string, usage: { incrementUseCount?: boolean; rating?: number }): Promise<void>;
  findById(skillId: string): Promise<ISkill | null>;
  findByTenant(tenantId: string, options?: { page?: number; limit?: number }): Promise<ISkill[]>;
}
