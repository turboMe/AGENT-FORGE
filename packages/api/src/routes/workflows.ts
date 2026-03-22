import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';

interface WorkflowQuerystring {
  page?: string;
  limit?: string;
  status?: string;
  search?: string;
}

interface WorkflowParams {
  id: string;
}

interface RunsQuerystring {
  limit?: string;
}

interface UpdateWorkflowBody {
  name?: string;
  description?: string;
  parameters?: Record<string, unknown>;
  schedule?: string;
}

export async function workflowRoutes(app: FastifyInstance) {
  // ── GET /workflows ────────────────────────────────
  app.get<{ Querystring: WorkflowQuerystring }>(
    '/workflows',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const {
        page = '1',
        limit = '20',
        status,
        search,
      } = request.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

      request.log.info(
        { tenantId: request.user.tenantId, page: pageNum, limit: limitNum, status, search },
        'Listing workflows',
      );

      // Stub: In production, calls WorkflowRepository.find()
      return reply.success({
        workflows: [],
        pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 },
      });
    },
  );

  // ── GET /workflows/:id ────────────────────────────
  app.get<{ Params: WorkflowParams }>(
    '/workflows/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params;

      request.log.info(
        { tenantId: request.user.tenantId, workflowId: id },
        'Fetching workflow',
      );

      return reply.success({
        id,
        name: 'stub-workflow',
        description: 'Stub workflow for development',
        status: 'active',
        parameters: {},
        stats: { runCount: 0, successRate: 0, avgDurationMs: 0, lastRunAt: null },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    },
  );

  // ── GET /workflows/:id/runs ───────────────────────
  app.get<{ Params: WorkflowParams; Querystring: RunsQuerystring }>(
    '/workflows/:id/runs',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      const { limit = '20' } = request.query;
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

      request.log.info(
        { tenantId: request.user.tenantId, workflowId: id, limit: limitNum },
        'Fetching workflow runs',
      );

      return reply.success({ runs: [] });
    },
  );

  // ── POST /workflows ───────────────────────────────
  app.post<{ Body: UpdateWorkflowBody }>(
    '/workflows',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { name, description, parameters, schedule } = request.body;
      const { uid, tenantId } = request.user;

      request.log.info(
        { userId: uid, tenantId, workflowName: name },
        'Creating workflow',
      );

      const id = `wf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

      return reply.success({
        id,
        name,
        description,
        status: 'draft',
        parameters,
        schedule,
        createdBy: uid,
        tenantId,
        createdAt: new Date().toISOString(),
      });
    },
  );

  // ── PUT /workflows/:id ────────────────────────────
  app.put<{ Params: WorkflowParams; Body: UpdateWorkflowBody }>(
    '/workflows/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      const updates = request.body;

      request.log.info(
        { tenantId: request.user.tenantId, workflowId: id, fields: Object.keys(updates) },
        'Updating workflow',
      );

      return reply.success({
        id,
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    },
  );

  // ── PUT /workflows/:id/pause ──────────────────────
  app.put<{ Params: WorkflowParams }>(
    '/workflows/:id/pause',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params;

      request.log.info(
        { tenantId: request.user.tenantId, workflowId: id },
        'Pausing workflow',
      );

      return reply.success({ id, status: 'paused', updatedAt: new Date().toISOString() });
    },
  );

  // ── PUT /workflows/:id/resume ─────────────────────
  app.put<{ Params: WorkflowParams }>(
    '/workflows/:id/resume',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params;

      request.log.info(
        { tenantId: request.user.tenantId, workflowId: id },
        'Resuming workflow',
      );

      return reply.success({ id, status: 'active', updatedAt: new Date().toISOString() });
    },
  );

  // ── DELETE /workflows/:id ─────────────────────────
  app.delete<{ Params: WorkflowParams }>(
    '/workflows/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params;

      request.log.info(
        { tenantId: request.user.tenantId, workflowId: id },
        'Deleting workflow (soft)',
      );

      return reply.success({ id, deletedAt: new Date().toISOString() });
    },
  );
}
