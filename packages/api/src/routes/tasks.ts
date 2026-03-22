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

// ── SSE helpers ───────────────────────────────────────
function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const PIPELINE_STEPS = [
  { step: 'classify', label: 'Classifying task' },
  { step: 'search', label: 'Searching skill library' },
  { step: 'route', label: 'Deciding routing' },
  { step: 'execute', label: 'Executing with skill' },
  { step: 'save', label: 'Saving results' },
  { step: 'log', label: 'Logging decision' },
] as const;

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

  // ── POST /tasks/stream (SSE) ───────────────────────
  app.post<{ Body: CreateTaskBody }>(
    '/tasks/stream',
    {
      preHandler: [authenticate, zodValidate(CreateTaskSchema)],
    },
    async (request, reply) => {
      const { task, options } = request.body;
      const { uid, tenantId } = request.user;

      request.log.info(
        { userId: uid, tenantId, taskPreview: task.slice(0, 80) },
        'Streaming task (SSE)',
      );

      // ── SSE headers ─────────────────────────────
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      const taskId = `task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

      try {
        // ── Pipeline steps (stubbed with delays) ──
        for (const { step, label } of PIPELINE_STEPS) {
          reply.raw.write(sseEvent('step', { step, status: 'running', label }));
          await sleep(300 + Math.random() * 400);
          reply.raw.write(sseEvent('step', { step, status: 'done', label }));
        }

        // ── Stream response tokens ────────────────
        const stubResponse = `# Task Analysis\n\nI've analyzed your request: **"${task.slice(0, 80)}"**\n\n## Pipeline Results\n\n- **Classification**: text task, medium complexity\n- **Skill Match**: No existing skill found (score: 0.00)\n- **Action**: Created new skill for this task type\n- **Model**: ${options?.model ?? 'auto'}\n\n## Response\n\nThis is a **stubbed streaming response** from the AgentForge pipeline. In production, this would contain the actual LLM-generated output processed through the matched or newly created skill.\n\n\`\`\`\nTask ID: ${taskId}\nTokens: 0 (stub)\nLatency: ~2s (simulated)\n\`\`\`\n`;

        const words = stubResponse.split(/(?<=\s)/);
        for (const word of words) {
          reply.raw.write(sseEvent('token', { content: word }));
          await sleep(20 + Math.random() * 30);
        }

        // ── Done event ────────────────────────────
        reply.raw.write(
          sseEvent('done', {
            taskId,
            routing: {
              skillUsed: null,
              matchScore: 0,
              action: 'create_new',
              model: options?.model ?? 'auto',
              tokensUsed: 0,
              latencyMs: 0,
            },
          }),
        );
      } catch (err) {
        request.log.error({ err }, 'SSE stream error');
        reply.raw.write(
          sseEvent('error', {
            message: err instanceof Error ? err.message : 'Unknown error',
          }),
        );
      } finally {
        reply.raw.end();
      }
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
