import { randomUUID } from 'node:crypto';
import type { IDecision } from '@agentforge/shared';
import type {
  IOrchestrator,
  ITaskClassifier,
  ISkillMatcher,
  IDecisionRouter,
  IDecisionLogger,
  OrchestratorConfig,
  TaskClassification,
  RoutingDecision,
} from './types.js';
import { TaskClassifier } from './classifier.js';
import { SkillMatcher } from './skill-matcher.js';
import { DecisionRouter } from './router.js';
import { DecisionLogger } from './decision-logger.js';

// ── Orchestrator ────────────────────────────────────

export class Orchestrator implements IOrchestrator {
  private readonly classifier: ITaskClassifier;
  private readonly matcher: ISkillMatcher;
  private readonly router: IDecisionRouter;
  private readonly logger: IDecisionLogger;

  constructor(config: OrchestratorConfig);
  constructor(deps: {
    classifier: ITaskClassifier;
    matcher: ISkillMatcher;
    router: IDecisionRouter;
    logger: IDecisionLogger;
  });
  constructor(
    configOrDeps:
      | OrchestratorConfig
      | {
          classifier: ITaskClassifier;
          matcher: ISkillMatcher;
          router: IDecisionRouter;
          logger: IDecisionLogger;
        },
  ) {
    if ('classifier' in configOrDeps) {
      // Direct dependency injection (for testing)
      this.classifier = configOrDeps.classifier;
      this.matcher = configOrDeps.matcher;
      this.router = configOrDeps.router;
      this.logger = configOrDeps.logger;
    } else {
      // Config-based construction (for production)
      this.classifier = new TaskClassifier(configOrDeps.llmGateway);
      this.matcher = new SkillMatcher(configOrDeps.skillLibrary);
      this.router = new DecisionRouter();
      this.logger = new DecisionLogger();
    }
  }

  /**
   * Execute the orchestration pipeline:
   * 1. Classify task
   * 2. Match skills
   * 3. Route decision
   * 4. Log decision
   */
  async executeTask(params: {
    tenantId: string;
    userId: string;
    task: string;
    options?: { forceNewSkill?: boolean };
  }): Promise<{
    taskId: string;
    classification: TaskClassification;
    routing: RoutingDecision;
    decision: IDecision;
  }> {
    const taskId = randomUUID();

    // 1. Classify the task
    const classification = await this.classifier.classify(params.task);

    // 2. Search for matching skills
    const matches = await this.matcher.match(params.tenantId, classification);

    // 3. Route: decide use / adapt / create
    const routing = this.router.route(classification, matches, {
      forceNewSkill: params.options?.forceNewSkill,
    });

    // 4. Build and persist decision log
    const decision = await this.logger.log({
      _id: '',
      tenantId: params.tenantId,
      taskId,
      timestamp: new Date(),
      taskSummary: params.task.slice(0, 500),
      taskType: classification.taskType,
      domain: classification.domain,
      complexity: classification.complexity,
      searchKeywords: classification.keywords,
      searchResult: routing.searchResult,
      matchedSkillId: routing.matchedSkillId,
      matchScore: routing.matchScore,
      actionTaken: routing.action,
      executionSuccess: false, // Will be updated post-execution
      createdAt: new Date(),
    });

    return {
      taskId,
      classification,
      routing,
      decision,
    };
  }
}
