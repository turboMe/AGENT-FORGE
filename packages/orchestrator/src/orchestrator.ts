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
  StepCallback,
} from './types.js';
import { TaskClassifier } from './classifier.js';
import { SkillMatcher } from './skill-matcher.js';
import { DecisionRouter } from './router.js';
import { DecisionLogger } from './decision-logger.js';

// ── No-op step callback ─────────────────────────────
const noop: StepCallback = () => {};

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
   *
   * Emits real-time step progress via the optional `onStep` callback.
   */
  async executeTask(params: {
    tenantId: string;
    userId: string;
    task: string;
    options?: { forceNewSkill?: boolean };
    onStep?: StepCallback;
  }): Promise<{
    taskId: string;
    classification: TaskClassification;
    routing: RoutingDecision;
    decision: IDecision;
  }> {
    const taskId = randomUUID();
    const emit = params.onStep ?? noop;

    // 1. Classify the task
    let classification: TaskClassification;
    try {
      emit('classify', 'running', 'Classifying task');
      classification = await this.classifier.classify(params.task);
      emit('classify', 'done', 'Classifying task');
    } catch (err) {
      emit('classify', 'failed', `Classification failed: ${(err as Error).message}`);
      throw err;
    }

    // 2. Search for matching skills
    let matches;
    try {
      emit('search', 'running', 'Searching skill library');
      matches = await this.matcher.match(params.tenantId, classification);
      emit('search', 'done', 'Searching skill library');
    } catch (err) {
      emit('search', 'failed', `Skill search failed: ${(err as Error).message}`);
      throw err;
    }

    // 3. Route: decide use / adapt / create
    let routing: RoutingDecision;
    try {
      emit('route', 'running', 'Deciding routing');
      routing = this.router.route(classification, matches, {
        forceNewSkill: params.options?.forceNewSkill,
      });
      emit('route', 'done', 'Deciding routing');
    } catch (err) {
      emit('route', 'failed', `Routing failed: ${(err as Error).message}`);
      throw err;
    }

    // 4. Build and persist decision log
    let decision: IDecision;
    try {
      emit('log', 'running', 'Logging decision');
      decision = await this.logger.log({
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
      emit('log', 'done', 'Logging decision');
    } catch (err) {
      emit('log', 'failed', `Decision logging failed: ${(err as Error).message}`);
      throw err;
    }

    return {
      taskId,
      classification,
      routing,
      decision,
    };
  }
}
