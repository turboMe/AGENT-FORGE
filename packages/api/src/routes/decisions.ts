import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';

interface DecisionQuerystring {
  page?: string;
  limit?: string;
  from?: string;
  to?: string;
  action?: string;
}

interface DecisionParams {
  decisionId: string;
}

export async function decisionRoutes(app: FastifyInstance) {
  // ── GET /decisions ─────────────────────────────────
  app.get<{ Querystring: DecisionQuerystring }>(
    '/decisions',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const {
        page = '1',
        limit = '20',
        from,
        to,
        action,
      } = request.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

      request.log.info(
        {
          tenantId: request.user.tenantId,
          page: pageNum,
          limit: limitNum,
          from,
          to,
          action,
        },
        'Listing decisions',
      );

      // Stub: In production, calls DecisionLogger.find() with filters
      return reply.success({
        decisions: [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: 0,
          totalPages: 0,
        },
      });
    },
  );

  // ── GET /decisions/:decisionId ─────────────────────
  app.get<{ Params: DecisionParams }>(
    '/decisions/:decisionId',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { decisionId } = request.params;

      // Stub: In production, calls DecisionLogger.findById()
      return reply.success({
        id: decisionId,
        taskId: 'task_stub',
        taskSummary: 'Stub decision',
        actionTaken: 'create_new',
        executionSuccess: true,
        createdAt: new Date().toISOString(),
      });
    },
  );
}
