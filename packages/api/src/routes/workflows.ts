import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import { WorkflowRepository } from '../repositories/workflow.repository.js';
import type { IWorkflowParameter } from '@agentforge/shared';

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

interface CreateWorkflowBody {
  name: string;
  description?: string;
  skillId?: string;
  skillName?: string;
  schedule?: string;
  parameters?: IWorkflowParameter[];
}

interface UpdateWorkflowBody {
  name?: string;
  description?: string;
  parameters?: IWorkflowParameter[];
  schedule?: string;
  skillId?: string;
  skillName?: string;
}

const repo = new WorkflowRepository();

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

      const { workflows, total } = await repo.findByTenant(request.user.tenantId, {
        status,
        search,
        page: pageNum,
        limit: limitNum,
      });

      return reply.success({
        workflows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    },
  );

  // ── GET /workflows/:id ────────────────────────────
  app.get<{ Params: WorkflowParams }>(
    '/workflows/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const workflow = await repo.findById(request.params.id, request.user.tenantId);
      if (!workflow) {
        return reply.code(404).send({ success: false, error: 'Workflow not found' });
      }
      return reply.success(workflow);
    },
  );

  // ── GET /workflows/:id/runs ───────────────────────
  app.get<{ Params: WorkflowParams; Querystring: RunsQuerystring }>(
    '/workflows/:id/runs',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { limit = '20' } = request.query;
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

      const runs = await repo.findRuns(request.params.id, request.user.tenantId, limitNum);
      return reply.success({ runs });
    },
  );

  // ── POST /workflows ───────────────────────────────
  app.post<{ Body: CreateWorkflowBody }>(
    '/workflows',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { name, description, skillId, skillName, schedule, parameters } = request.body;

      if (!name) {
        return reply.code(400).send({ success: false, error: 'name is required' });
      }

      const workflow = await repo.create({
        tenantId: request.user.tenantId,
        createdBy: request.user.uid,
        name,
        description,
        skillId,
        skillName,
        schedule,
        parameters: parameters as CreateWorkflowBody['parameters'],
      });

      return reply.code(201).success(workflow);
    },
  );

  // ── PUT /workflows/:id ────────────────────────────
  app.put<{ Params: WorkflowParams; Body: UpdateWorkflowBody }>(
    '/workflows/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const updates = request.body;
      const workflow = await repo.update(request.params.id, request.user.tenantId, updates);
      if (!workflow) {
        return reply.code(404).send({ success: false, error: 'Workflow not found' });
      }
      return reply.success(workflow);
    },
  );

  // ── PUT /workflows/:id/pause ──────────────────────
  app.put<{ Params: WorkflowParams }>(
    '/workflows/:id/pause',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const workflow = await repo.updateStatus(request.params.id, request.user.tenantId, 'paused');
      if (!workflow) {
        return reply.code(404).send({ success: false, error: 'Workflow not found' });
      }
      return reply.success(workflow);
    },
  );

  // ── PUT /workflows/:id/resume ─────────────────────
  app.put<{ Params: WorkflowParams }>(
    '/workflows/:id/resume',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const workflow = await repo.updateStatus(request.params.id, request.user.tenantId, 'active');
      if (!workflow) {
        return reply.code(404).send({ success: false, error: 'Workflow not found' });
      }
      return reply.success(workflow);
    },
  );

  // ── DELETE /workflows/:id ─────────────────────────
  app.delete<{ Params: WorkflowParams }>(
    '/workflows/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const deleted = await repo.softDelete(request.params.id, request.user.tenantId);
      if (!deleted) {
        return reply.code(404).send({ success: false, error: 'Workflow not found' });
      }
      return reply.success({ id: request.params.id, deletedAt: new Date().toISOString() });
    },
  );
}
