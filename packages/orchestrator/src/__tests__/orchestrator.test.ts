import { describe, it, expect, vi } from 'vitest';
import { Orchestrator } from '../orchestrator.js';
import type { ITaskClassifier, ISkillMatcher, IDecisionRouter, IDecisionLogger, TaskClassification, SkillMatchResult, RoutingDecision } from '../types.js';

// ── Mock factory ────────────────────────────────────

function createMockClassifier(result?: Partial<TaskClassification>): ITaskClassifier {
  return {
    classify: vi.fn().mockResolvedValue({
      taskType: 'text',
      domain: ['coding'],
      complexity: 'medium',
      keywords: ['typescript', 'refactor'],
      confidence: 0.9,
      ...result,
    }),
  };
}

function createMockMatcher(results: SkillMatchResult[] = []): ISkillMatcher {
  return {
    match: vi.fn().mockResolvedValue(results),
  };
}

function createMockRouter(result?: Partial<RoutingDecision>): IDecisionRouter {
  return {
    route: vi.fn().mockReturnValue({
      action: 'use_existing',
      searchResult: 'exact_match',
      matchedSkillId: 'skill-1',
      matchedSkillName: 'test-skill',
      matchScore: 0.95,
      reasoning: 'Exact match found.',
      ...result,
    }),
  };
}

function createMockLogger(): IDecisionLogger {
  return {
    log: vi.fn().mockImplementation(async (decision) => ({
      ...decision,
      _id: 'decision-generated-id',
    })),
    findByTask: vi.fn(),
    findByTenant: vi.fn(),
  };
}

// ── Tests ───────────────────────────────────────────

describe('Orchestrator', () => {
  it('should execute the full pipeline: classify → match → route → log', async () => {
    const classifier = createMockClassifier();
    const matcher = createMockMatcher([
      {
        skillId: 'skill-1',
        skillName: 'ts-refactor',
        matchScore: 0.95,
        recommendation: 'use',
        domains: ['coding'],
      },
    ]);
    const router = createMockRouter();
    const logger = createMockLogger();

    const orchestrator = new Orchestrator({ classifier, matcher, router, logger });

    const result = await orchestrator.executeTask({
      tenantId: 'tenant-1',
      userId: 'user-1',
      task: 'Refactor this TypeScript module',
    });

    // 1. Classifier was called
    expect(classifier.classify).toHaveBeenCalledWith('Refactor this TypeScript module');

    // 2. Matcher was called with classification
    expect(matcher.match).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
      taskType: 'text',
      domain: ['coding'],
    }));

    // 3. Router was called with classification and matches
    expect(router.route).toHaveBeenCalledWith(
      expect.objectContaining({ taskType: 'text' }),
      [expect.objectContaining({ skillId: 'skill-1' })],
      { forceNewSkill: undefined },
    );

    // 4. Logger was called
    expect(logger.log).toHaveBeenCalledOnce();

    // 5. Result structure
    expect(result.taskId).toBeDefined();
    expect(result.classification.taskType).toBe('text');
    expect(result.routing.action).toBe('use_existing');
    expect(result.decision._id).toBe('decision-generated-id');
  });

  it('should pass forceNewSkill option through to router', async () => {
    const classifier = createMockClassifier();
    const matcher = createMockMatcher();
    const router = createMockRouter({ action: 'create_new', searchResult: 'no_match', matchScore: 0 });
    const logger = createMockLogger();

    const orchestrator = new Orchestrator({ classifier, matcher, router, logger });

    await orchestrator.executeTask({
      tenantId: 'tenant-1',
      userId: 'user-1',
      task: 'Create something new',
      options: { forceNewSkill: true },
    });

    expect(router.route).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { forceNewSkill: true },
    );
  });

  it('should generate a unique taskId for each execution', async () => {
    const orchestrator = new Orchestrator({
      classifier: createMockClassifier(),
      matcher: createMockMatcher(),
      router: createMockRouter(),
      logger: createMockLogger(),
    });

    const result1 = await orchestrator.executeTask({
      tenantId: 't', userId: 'u', task: 'task 1',
    });
    const result2 = await orchestrator.executeTask({
      tenantId: 't', userId: 'u', task: 'task 2',
    });

    expect(result1.taskId).not.toBe(result2.taskId);
  });

  it('should truncate long task summaries in decision log', async () => {
    const longTask = 'x'.repeat(1000);
    const logger = createMockLogger();
    const orchestrator = new Orchestrator({
      classifier: createMockClassifier(),
      matcher: createMockMatcher(),
      router: createMockRouter(),
      logger,
    });

    await orchestrator.executeTask({
      tenantId: 't', userId: 'u', task: longTask,
    });

    const loggedDecision = (logger.log as any).mock.calls[0][0];
    expect(loggedDecision.taskSummary.length).toBeLessThanOrEqual(500);
  });

  it('should handle create_new routing correctly', async () => {
    const orchestrator = new Orchestrator({
      classifier: createMockClassifier({ domain: ['unknown'] }),
      matcher: createMockMatcher([]),
      router: createMockRouter({
        action: 'create_new',
        searchResult: 'no_match',
        matchScore: 0,
        matchedSkillId: undefined,
        reasoning: 'No matching skills found.',
      }),
      logger: createMockLogger(),
    });

    const result = await orchestrator.executeTask({
      tenantId: 't', userId: 'u', task: 'Do something novel',
    });

    expect(result.routing.action).toBe('create_new');
    expect(result.routing.matchedSkillId).toBeUndefined();
  });

  it('should propagate classifier errors', async () => {
    const classifier: ITaskClassifier = {
      classify: vi.fn().mockRejectedValue(new Error('Classification failed')),
    };

    const orchestrator = new Orchestrator({
      classifier,
      matcher: createMockMatcher(),
      router: createMockRouter(),
      logger: createMockLogger(),
    });

    await expect(
      orchestrator.executeTask({ tenantId: 't', userId: 'u', task: 'test' }),
    ).rejects.toThrow('Classification failed');
  });

  it('should propagate matcher errors', async () => {
    const matcher: ISkillMatcher = {
      match: vi.fn().mockRejectedValue(new Error('Search failed')),
    };

    const orchestrator = new Orchestrator({
      classifier: createMockClassifier(),
      matcher,
      router: createMockRouter(),
      logger: createMockLogger(),
    });

    await expect(
      orchestrator.executeTask({ tenantId: 't', userId: 'u', task: 'test' }),
    ).rejects.toThrow('Search failed');
  });

  it('should propagate logger errors', async () => {
    const logger: IDecisionLogger = {
      log: vi.fn().mockRejectedValue(new Error('DB write failed')),
      findByTask: vi.fn(),
      findByTenant: vi.fn(),
    };

    const orchestrator = new Orchestrator({
      classifier: createMockClassifier(),
      matcher: createMockMatcher(),
      router: createMockRouter(),
      logger,
    });

    await expect(
      orchestrator.executeTask({ tenantId: 't', userId: 'u', task: 'test' }),
    ).rejects.toThrow('DB write failed');
  });

  it('should include correct fields in the decision log', async () => {
    const logger = createMockLogger();
    const orchestrator = new Orchestrator({
      classifier: createMockClassifier({
        taskType: 'automation',
        domain: ['automation'],
        complexity: 'complex',
        keywords: ['workflow'],
      }),
      matcher: createMockMatcher([]),
      router: createMockRouter({
        action: 'create_new',
        searchResult: 'no_match',
        matchScore: 0,
      }),
      logger,
    });

    await orchestrator.executeTask({
      tenantId: 'tenant-abc',
      userId: 'user-xyz',
      task: 'Build automation workflow',
    });

    const loggedDecision = (logger.log as any).mock.calls[0][0];
    expect(loggedDecision.tenantId).toBe('tenant-abc');
    expect(loggedDecision.taskType).toBe('automation');
    expect(loggedDecision.domain).toEqual(['automation']);
    expect(loggedDecision.complexity).toBe('complex');
    expect(loggedDecision.searchKeywords).toEqual(['workflow']);
    expect(loggedDecision.searchResult).toBe('no_match');
    expect(loggedDecision.actionTaken).toBe('create_new');
    expect(loggedDecision.executionSuccess).toBe(false);
  });
});
