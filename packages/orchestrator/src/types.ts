import type { TaskOptions, IDecision } from '@agentforge/shared';
import type { ISkillLibrary } from '@agentforge/skill-library';
import type { ILLMGateway } from '@agentforge/llm-gateway';

// ── Task Classification ─────────────────────────────

export interface TaskClassification {
  taskType: 'text' | 'automation';
  domain: string[];
  complexity: 'simple' | 'medium' | 'complex';
  keywords: string[];
  confidence: number;
}

// ── Skill Matching ──────────────────────────────────

export interface SkillMatchResult {
  skillId: string;
  skillName: string;
  matchScore: number;
  recommendation: 'use' | 'adapt' | 'create';
  domains: string[];
}

// ── Routing Decision ────────────────────────────────

export interface RoutingDecision {
  action: 'use_existing' | 'adapt_existing' | 'create_new';
  searchResult: 'exact_match' | 'partial_match' | 'no_match';
  matchedSkillId?: string;
  matchedSkillName?: string;
  matchScore: number;
  reasoning: string;
}

// ── Orchestrator Config ─────────────────────────────

export interface OrchestratorConfig {
  llmGateway: ILLMGateway;
  skillLibrary: ISkillLibrary;
  /** Optional: Mongoose connection string for decision logging */
  mongoUri?: string;
}

// ── Component Interfaces ────────────────────────────

export interface ITaskClassifier {
  classify(task: string): Promise<TaskClassification>;
}

export interface ISkillMatcher {
  match(
    tenantId: string,
    classification: TaskClassification,
  ): Promise<SkillMatchResult[]>;
}

export interface IDecisionRouter {
  route(
    classification: TaskClassification,
    matches: SkillMatchResult[],
    options?: { forceNewSkill?: boolean },
  ): RoutingDecision;
}

export interface IDecisionLogger {
  log(decision: IDecision): Promise<IDecision>;
  findByTask(taskId: string): Promise<IDecision | null>;
  findByTenant(tenantId: string, limit?: number): Promise<IDecision[]>;
}

// ── Orchestrator Interface ──────────────────────────

export interface IOrchestrator {
  executeTask(params: {
    tenantId: string;
    userId: string;
    task: string;
    options?: Partial<TaskOptions>;
  }): Promise<{
    taskId: string;
    classification: TaskClassification;
    routing: RoutingDecision;
    decision: IDecision;
  }>;
}
