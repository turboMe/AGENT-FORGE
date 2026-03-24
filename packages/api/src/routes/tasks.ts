import type { FastifyInstance } from 'fastify';
import { CreateTaskSchema, ARCHITECT_CONFIG } from '@agentforge/shared';
import type { ISkill, FileAttachment } from '@agentforge/shared';
import { authenticate } from '../middleware/authenticate.js';
import { zodValidate } from '../middleware/validate.js';
import { CredentialRepository } from '../repositories/credential.repository.js';
import { ConversationRepository } from '../repositories/conversation.repository.js';
import { SkillLibraryService } from '../services/skill-library.service.js';
import { LocalDecisionLogger } from '../services/decision-logger.local.js';
import { LLMGateway } from '@agentforge/llm-gateway';
import {
  Orchestrator,
  TaskClassifier,
  SkillMatcher,
  DecisionRouter,
} from '@agentforge/orchestrator';
import { ContextBuilder, MemoryManager } from '@agentforge/memory';
import {
  PROMPT_ARCHITECT_V2,
  buildArchitectInput,
  buildArchitectFollowUp,
  parseArchitectOutput,
  isArchitectQuestion,
} from '@agentforge/prompt-architect';

interface CreateTaskBody {
  task: string;
  conversationId?: string;
  files?: FileAttachment[];
  options?: {
    model?: string;
    quality?: string;
    forceNewSkill?: boolean;
    language?: string;
    context?: Record<string, string>;
    generationType?: 'skill' | 'agent';
    isArchitectFollowUp?: boolean;
    architectHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
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

/** Split text into chunks for SSE streaming */
function chunkString(str: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.slice(i, i + size));
  }
  return chunks;
}

/** Timeout wrapper: rejects if the promise doesn't resolve in `ms` */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout: ${label} exceeded ${ms}ms`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

const STEP_TIMEOUT_MS = 120_000; // 120s per major step
const HEARTBEAT_INTERVAL_MS = 15_000; // 15s keepalive

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
      const { task, options, conversationId, files } = request.body;
      const { uid, tenantId } = request.user;

      request.log.info(
        { userId: uid, tenantId, taskPreview: task.slice(0, 80), conversationId },
        'Streaming task (SSE)',
      );

      // ── SSE headers ─────────────────────────────
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      // ── Heartbeat: keep SSE connection alive during long operations ──
      const heartbeatTimer = setInterval(() => {
        try { reply.raw.write(sseEvent('heartbeat', { ts: Date.now() })); } catch { /* stream closed */ }
      }, HEARTBEAT_INTERVAL_MS);

      try {
        // ── Gap 8 fix: Strip /route prefix before any processing ──
        const cleanTask = task.startsWith('/route ') ? task.slice(7) : task;

        // ═══════════════════════════════════════════════════════
        // ARCHITECT FOLLOW-UP — skip main pipeline
        // When user answers architect's questions, skip classification/matching
        // ═══════════════════════════════════════════════════════
        if (options?.isArchitectFollowUp) {
          const credRepo = new CredentialRepository();
          const anthropicKey = await credRepo.getDecryptedKey(tenantId, 'anthropic') || process.env.ANTHROPIC_API_KEY || '';
          const openaiKey = await credRepo.getDecryptedKey(tenantId, 'openai') || process.env.OPENAI_API_KEY || '';

          const gateway = new LLMGateway({
            providers: {
              anthropic: anthropicKey ? { apiKey: anthropicKey } : undefined,
              openai: openaiKey ? { apiKey: openaiKey } : undefined,
            },
            defaultModel: 'auto',
          });

          const generationType = options.generationType ?? 'skill';
          const rawFiles: FileAttachment[] = files ?? [];

          const followUp = buildArchitectFollowUp({
            userAnswer: cleanTask,
            previousMessages: options.architectHistory ?? [],
            files: rawFiles,
            generationType,
          });

          reply.raw.write(sseEvent('step', {
            step: 'architect',
            status: 'running',
            label: 'Generating prompt from your clarifications',
          }));

          const architectResult = await withTimeout(
            gateway.generate({
              messages: followUp.messages,
              systemPrompt: PROMPT_ARCHITECT_V2,
              purpose: 'prompt-architect',
              temperature: ARCHITECT_CONFIG.temperature,
              maxTokens: ARCHITECT_CONFIG.maxTokens,
            }),
            STEP_TIMEOUT_MS,
            'Architect follow-up generation',
          );

          reply.raw.write(sseEvent('step', {
            step: 'architect',
            status: 'done',
            label: 'Generating prompt from your clarifications',
          }));

          // If architect asks MORE questions (rare but possible)
          if (isArchitectQuestion(architectResult.content)) {
            reply.raw.write(sseEvent('architect_questions', {
              questions: architectResult.content,
              requiresFollowUp: true,
            }));
            for (const chunk of chunkString(architectResult.content, 50)) {
              reply.raw.write(sseEvent('token', { content: chunk }));
            }
            reply.raw.write(sseEvent('done', { status: 'awaiting_input' }));
            reply.raw.end();
            return;
          }

          // Generated prompt — deliver
          const parsed = parseArchitectOutput(architectResult.content);
          for (const chunk of chunkString(architectResult.content, 50)) {
            reply.raw.write(sseEvent('token', { content: chunk }));
          }
          reply.raw.write(sseEvent('done', {
            status: 'complete',
            type: parsed.type,
            isDeliverable: true,
          }));
          reply.raw.end();
          return;
        }

        // ── Auto-save user message to conversation ──
        const convRepo = new ConversationRepository();
        if (conversationId) {
          await convRepo.addMessage(conversationId, tenantId, uid, {
            role: 'user',
            content: cleanTask,
            files: files?.map(f => ({ name: f.name, type: f.type, size: f.size })),
            timestamp: new Date(),
          });
        }

        const credRepo = new CredentialRepository();
        const anthropicKey = await credRepo.getDecryptedKey(tenantId, 'anthropic') || process.env.ANTHROPIC_API_KEY || '';
        const openaiKey = await credRepo.getDecryptedKey(tenantId, 'openai') || process.env.OPENAI_API_KEY || '';
        const voyageKey = await credRepo.getDecryptedKey(tenantId, 'voyage') || process.env.VOYAGE_API_KEY || 'stub-voyage-key';

        const gateway = new LLMGateway({
          providers: {
            anthropic: anthropicKey ? { apiKey: anthropicKey } : undefined,
            openai: openaiKey ? { apiKey: openaiKey } : undefined,
          },
          defaultModel: (options?.model as any) || 'auto',
        });

        const skillLibrary = new SkillLibraryService({ apiKey: voyageKey });

        // Use DI constructor to pass components that use the API's mongoose connection.
        const orchestrator = new Orchestrator({
          classifier: new TaskClassifier(gateway),
          matcher: new SkillMatcher(skillLibrary),
          router: new DecisionRouter(),
          logger: new LocalDecisionLogger(),
        });

        // ── Executing Pipeline via Orchestrator — real-time SSE step events ──
        const execResult = await orchestrator.executeTask({
          tenantId,
          userId: uid,
          task: cleanTask,
          options: { forceNewSkill: options?.forceNewSkill },
          onStep: (step, status, label) => {
            reply.raw.write(sseEvent('step', { step, status, label }));
          },
        });

        reply.raw.write(sseEvent('step', { step: 'execute', status: 'running', label: 'Executing with skill' }));

        // ── Gap 3 fix: Use ContextBuilder for full skill template ──
        const contextBuilder = new ContextBuilder();
        let matchedSkill: ISkill | null = null;

        if (execResult.routing.matchedSkillId) {
          matchedSkill = await skillLibrary.findById(execResult.routing.matchedSkillId);
        }

        // ── Gap 1 fix: Integrate MemoryManager (optional, behind env flag) ──
        let memoryContext = {
          sessionId: `session_${uid}_${Date.now()}`,
          coreMemory: {},
          relevantHistory: [] as string[],
          archivalKnowledge: [] as string[],
        };

        const lettaUrl = process.env.LETTA_BASE_URL;
        if (lettaUrl) {
          try {
            const memoryManager = new MemoryManager({
              lettaClient: { baseUrl: lettaUrl, apiKey: process.env.LETTA_API_KEY },
            });
            memoryContext = await memoryManager.getContext(uid, cleanTask);
          } catch {
            // Graceful degradation — use empty memory
          }
        }

        // Build rich prompt with memory + skill context via ContextBuilder
        const builtContext = contextBuilder.build({
          task: cleanTask,
          memory: memoryContext,
          skill: matchedSkill ?? undefined,
        });

        // Determine system prompt: skill systemPrompt > skill persona > generated > fallback
        let systemPrompt = 'You are an expert AI assistant. Answer the following task clearly and concisely.';

        if (matchedSkill?.template?.systemPrompt) {
          systemPrompt = matchedSkill.template.systemPrompt;
        } else if (matchedSkill?.template?.persona) {
          systemPrompt = matchedSkill.template.persona;
        }

        // ═══════════════════════════════════════════════════════
        // PROMPT ARCHITECT V2 — replaces V1 ExpertIdentifier + PromptGenerator
        // ═══════════════════════════════════════════════════════
        if (execResult.routing.action === 'create_new') {
          try {
            const rawFiles: FileAttachment[] = files ?? [];
            const generationType = options?.generationType ?? 'skill';
            const isDeliverableMode = options?.generationType === 'skill'
                                   || options?.generationType === 'agent';

            reply.raw.write(sseEvent('step', {
              step: 'architect',
              status: 'running',
              label: isDeliverableMode
                ? `Generating ${generationType} prompt`
                : 'Designing expert system prompt',
            }));

            const architectInput = buildArchitectInput({
              task: cleanTask,
              files: rawFiles,
              conversationContext: builtContext.prompt,
              classification: execResult.classification,
              generationType,
            });

            const architectResult = await withTimeout(
              gateway.generate({
                prompt: architectInput,
                systemPrompt: PROMPT_ARCHITECT_V2,
                purpose: 'prompt-architect',
                temperature: ARCHITECT_CONFIG.temperature,
                maxTokens: ARCHITECT_CONFIG.maxTokens,
              }),
              STEP_TIMEOUT_MS,
              'Architect V2 generation',
            );

            reply.raw.write(sseEvent('step', {
              step: 'architect',
              status: 'done',
              label: isDeliverableMode
                ? `Generating ${generationType} prompt`
                : 'Designing expert system prompt',
            }));

            // ── Architect asked questions ──
            if (isArchitectQuestion(architectResult.content)) {
              reply.raw.write(sseEvent('architect_questions', {
                questions: architectResult.content,
                requiresFollowUp: true,
              }));
              for (const chunk of chunkString(architectResult.content, 50)) {
                reply.raw.write(sseEvent('token', { content: chunk }));
              }
              reply.raw.write(sseEvent('done', { status: 'awaiting_input' }));
              reply.raw.end();
              return;
            }

            const parsed = parseArchitectOutput(architectResult.content);

            // ── USE CASE A: Prompt as deliverable ──
            if (isDeliverableMode) {
              for (const chunk of chunkString(architectResult.content, 50)) {
                reply.raw.write(sseEvent('token', { content: chunk }));
              }
              reply.raw.write(sseEvent('done', {
                status: 'complete',
                type: parsed.type,
                isDeliverable: true,
              }));
              reply.raw.end();
              return; // SKIP step 11
            }

            // ── USE CASE B: System prompt as intermediate (for step 11) ──
            systemPrompt = parsed.generatedPrompt;

          } catch (err) {
            request.log.error({ err }, 'Architect V2 failed, using fallback');
            reply.raw.write(sseEvent('step', {
              step: 'architect',
              status: 'failed',
              label: `Architect failed: ${(err as Error).message}`,
            }));
            // Fallback to generic prompt — already set above
          }
        }

        // Build full prompt: ContextBuilder output + optional file attachments
        let fullPrompt = builtContext.prompt;
        if (files && files.length > 0) {
          const fileContext = files
            .filter(f => f.content)
            .map(f => `--- File: ${f.name} ---\n${f.content}`)
            .join('\n\n');
          if (fileContext) {
            fullPrompt = `${fullPrompt}\n\n<attached_files>\n${fileContext}\n</attached_files>`;
          }
        }

        // Call the LLMGateway (with timeout)
        let llmResult;
        try {
          llmResult = await withTimeout(
            gateway.generate({
              prompt: fullPrompt,
              systemPrompt,
              model: (options?.model as any) || 'auto',
              complexity: execResult.classification.complexity,
            }),
            STEP_TIMEOUT_MS,
            'LLM generation',
          );
          reply.raw.write(sseEvent('step', { step: 'execute', status: 'done', label: 'Executing with skill' }));
        } catch (err) {
          reply.raw.write(sseEvent('step', { step: 'execute', status: 'failed', label: `Execution failed: ${(err as Error).message}` }));
          throw err;
        }

        // ── Gap 5 fix: Mark execution as successful ──
        reply.raw.write(sseEvent('step', { step: 'save', status: 'running', label: 'Saving results' }));
        try {
          const decisionLogger = new LocalDecisionLogger();
          await decisionLogger.markSuccess(execResult.taskId);
        } catch { /* non-critical */ }

        // ── Gap 7 fix: Update skill usage stats ──
        if (execResult.routing.matchedSkillId) {
          try {
            await skillLibrary.updateStats(execResult.routing.matchedSkillId, {
              incrementUseCount: true,
            });
          } catch { /* non-critical */ }
        }
        reply.raw.write(sseEvent('step', { step: 'save', status: 'done', label: 'Saving results' }));

        // ── Stream response tokens ────────────────
        const finalResponse = `# Task Analysis\n\nI've analyzed your request: **"${cleanTask.slice(0, 80)}"**\n\n## Pipeline Results\n\n- **Classification**: ${execResult.classification.taskType} task, ${execResult.classification.complexity} complexity\n- **Skill Match**: ${execResult.routing.matchedSkillName || 'None'} (score: ${execResult.routing.matchScore || 0})\n- **Action**: ${execResult.routing.action}\n- **Model**: ${llmResult.model}\n\n## Response\n\n${llmResult.content}\n\n\`\`\`\nTask ID: ${execResult.taskId}\nTokens: ${llmResult.tokensInput + llmResult.tokensOutput}\nLatency: ${llmResult.latencyMs}ms\nCost: $${llmResult.costEstimate.toFixed(5)}\n\`\`\`\n`;

        const words = finalResponse.split(/(?<=\s)/);
        for (const word of words) {
          reply.raw.write(sseEvent('token', { content: word }));
          await sleep(20);
        }

        // ── Done event ────────────────────────────
        reply.raw.write(
          sseEvent('done', {
            taskId: execResult.taskId,
            routing: {
              skillUsed: execResult.routing.matchedSkillId || null,
              matchScore: execResult.routing.matchScore || 0,
              action: execResult.routing.action,
              model: llmResult.model,
              tokensUsed: llmResult.tokensInput + llmResult.tokensOutput,
              latencyMs: llmResult.latencyMs,
            },
          }),
        );

        // ── Auto-save assistant response to conversation ──
        if (conversationId) {
          await convRepo.addMessage(conversationId, tenantId, uid, {
            role: 'assistant',
            content: finalResponse,
            timestamp: new Date(),
          });
          await convRepo.updateLastTaskId(conversationId, tenantId, execResult.taskId);
        }

        // ── Gap 1 (Phase B): Save interaction to Letta archival memory ──
        if (lettaUrl) {
          try {
            const memoryManager = new MemoryManager({
              lettaClient: { baseUrl: lettaUrl, apiKey: process.env.LETTA_API_KEY },
            });
            await memoryManager.saveInteraction(uid, cleanTask, llmResult.content);
          } catch { /* non-critical */ }
        }
      } catch (err) {
        request.log.error({ err }, 'SSE stream error');
        reply.raw.write(
          sseEvent('error', {
            message: err instanceof Error ? err.message : 'Unknown error',
          }),
        );
      } finally {
        clearInterval(heartbeatTimer);
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
