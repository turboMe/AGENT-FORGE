import type { ISkill } from '@agentforge/shared';

export interface IPromptArchitect {
  createSkill(taskDescription: string, domain: string[]): Promise<Partial<ISkill>>;
  adaptSkill(existingSkill: ISkill, newContext: string): Promise<Partial<ISkill>>;
  evaluateOutput(output: string, taskDescription: string): Promise<{ score: number; feedback: string }>;
}
