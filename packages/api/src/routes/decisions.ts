import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import { DecisionLog } from '../models/DecisionLog.js';

interface DecisionQuerystring {
  page?: string;
  limit?: string;
  from?: string;
  to?: string;
  action?: string;
  search?: string;
  success?: string;
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
        search,
        success,
      } = request.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

      const query: Record<string, any> = { tenantId: request.user.tenantId };
      
      if (action) {
        query.actionTaken = action;
      }
      
      if (success !== undefined) {
        query.executionSuccess = success === 'true';
      }
      
      if (from || to) {
        query.createdAt = {};
        if (from) query.createdAt.$gte = new Date(from);
        if (to) {
          const toDate = new Date(to);
          toDate.setUTCHours(23, 59, 59, 999);
          query.createdAt.$lte = toDate;
        }
      }
      
      if (search) {
        query.$or = [
          { taskSummary: { $regex: search, $options: 'i' } },
          { matchedSkillId: { $regex: search, $options: 'i' } }
        ];
      }

      request.log.info({ tenantId: request.user.tenantId, query }, 'Listing decisions');

      const [total, decisions] = await Promise.all([
        DecisionLog.countDocuments(query),
        DecisionLog.find(query)
          .sort({ createdAt: -1 })
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum)
          .lean()
      ]);

      return reply.success({
        // Map _id to id and ensure field names match frontend Decision type
        decisions: decisions.map(d => ({
          id: d._id.toString(),
          taskId: d.taskId,
          taskSummary: d.taskSummary,
          actionTaken: d.actionTaken,
          skillUsed: d.matchedSkillId || d.newSkillCreated || null,
          executionSuccess: d.executionSuccess,
          latencyMs: 350, // Temporary mock: real latency would come from Task execution metrics
          costUsd: 0.05,  // Temporary mock: real cost would come from Task execution metrics
          createdAt: d.createdAt.toISOString()
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
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

      const decision = await DecisionLog.findOne({
        _id: decisionId,
        tenantId: request.user.tenantId
      }).lean();
      
      if (!decision) {
        return reply.status(404).send({ error: 'Decision not found' });
      }

      return reply.success({
        id: decision._id.toString(),
        taskId: decision.taskId,
        taskSummary: decision.taskSummary,
        actionTaken: decision.actionTaken,
        skillUsed: decision.matchedSkillId || decision.newSkillCreated || null,
        executionSuccess: decision.executionSuccess,
        latencyMs: 350,
        costUsd: 0.05,
        createdAt: decision.createdAt.toISOString()
      });
    },
  );
}
