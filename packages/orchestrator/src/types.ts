import type { TaskOptions, RoutingResult, ExecutionResult } from '@agentforge/shared';

export interface IOrchestrator {
  executeTask(params: {
    tenantId: string;
    userId: string;
    task: string;
    options?: TaskOptions;
  }): Promise<{
    taskId: string;
    result: string;
    routing: RoutingResult;
    execution: ExecutionResult;
  }>;
}
