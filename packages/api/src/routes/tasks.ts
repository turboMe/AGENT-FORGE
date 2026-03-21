import type { FastifyInstance } from 'fastify';
import { CreateTaskSchema } from '@agentforge/shared';
import { authenticate } from '../middleware/authenticate.js';
import { zodValidate } from '../middleware/validate.js';

interface CreateTaskBody {
  task: string;
  options?: {
    model?: string;
    quality?: string;
    forceNewSkill?: boolean;
    language?: string;
    context?: Record<string, string>;
  };
}

interface TaskParams {
  taskId: string;
}

export async function taskRoutes(app: FastifyInstance) {
  // ── POST /tasks ────────────────────────────────────
  app.post<{ Body: CreateTaskBody }>(
    '/tasks',
    {
      preHandler: [authenticate, zodValidate(CreateTaskSchema)],
    },
    async (request, reply) => {
      const { task, options } = request.body;
      const { uid, tenantId } = request.user;

      request.log.info(
        { userId: uid, tenantId, taskPreview: task.slice(0, 80) },
        'Processing task',
      );

      // ── Orchestrator pipeline (stubbed) ──────────
      // In production this calls:
      //   1. TaskClassifier.classify(task)
      //   2. SkillMatcher.findBestMatch(classification)
      //   3. DecisionRouter.route(classification, matchResult)
      //   4. LLM Gateway execute
      //   5. DecisionLogger.log(decision)
      const taskId = `task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

      const result = {
        taskId,
        result: `[Stub] Processed: "${task.slice(0, 100)}"`,
        routing: {
          skillUsed: null,
          matchScore: 0,
          action: 'create_new' as const,
          model: options?.model ?? 'auto',
          tokensUsed: 0,
          latencyMs: 0,
        },
      };

      return reply.success(result);
    },
  );

  // ── GET /tasks/:taskId ─────────────────────────────
  app.get<{ Params: TaskParams }>(
    '/tasks/:taskId',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { taskId } = request.params;

      // Stub: In production, fetch from MongoDB
      return reply.success({
        taskId,
        status: 'completed',
        result: '[Stub] Task result',
        createdAt: new Date().toISOString(),
      });
    },
  );
}
