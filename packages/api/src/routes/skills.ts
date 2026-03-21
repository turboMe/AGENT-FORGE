import type { FastifyInstance } from 'fastify';
import { CreateSkillSchema } from '@agentforge/shared';
import { authenticate } from '../middleware/authenticate.js';
import { zodValidate } from '../middleware/validate.js';

interface SkillQuerystring {
  page?: string;
  limit?: string;
  domain?: string;
  pattern?: string;
  search?: string;
  sort?: string;
}

interface SkillParams {
  skillId: string;
}

interface CreateSkillBody {
  name: string;
  description: string;
  domain: string[];
  pattern: string;
  template: {
    persona: string;
    process: string[];
    outputFormat: string;
    constraints: string[];
    examples?: { input: string; output: string }[];
  };
}

export async function skillRoutes(app: FastifyInstance) {
  // ── GET /skills ────────────────────────────────────
  app.get<{ Querystring: SkillQuerystring }>(
    '/skills',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const {
        page = '1',
        limit = '20',
        domain,
        search,
        sort = 'use_count',
      } = request.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

      request.log.info(
        { tenantId: request.user.tenantId, page: pageNum, limit: limitNum, domain, search, sort },
        'Listing skills',
      );

      // Stub: In production, calls SkillRepository.find() with filters
      return reply.success({
        skills: [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: 0,
          totalPages: 0,
        },
      });
    },
  );

  // ── GET /skills/:skillId ───────────────────────────
  app.get<{ Params: SkillParams }>(
    '/skills/:skillId',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { skillId } = request.params;

      // Stub: In production, calls SkillRepository.findById()
      return reply.success({
        id: skillId,
        name: 'stub-skill',
        description: 'Stub skill for development',
        domain: [],
        pattern: 'processor',
        stats: { useCount: 0, avgSatisfaction: null, lastUsed: null },
        isSystem: false,
        isPublic: false,
        createdAt: new Date().toISOString(),
      });
    },
  );

  // ── POST /skills ───────────────────────────────────
  app.post<{ Body: CreateSkillBody }>(
    '/skills',
    {
      preHandler: [authenticate, zodValidate(CreateSkillSchema)],
    },
    async (request, reply) => {
      const { name, description, domain, pattern, template } = request.body;
      const { uid, tenantId } = request.user;

      request.log.info(
        { userId: uid, tenantId, skillName: name },
        'Creating skill',
      );

      // Stub: In production, calls SkillRepository.create()
      const skillId = `skill_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

      return reply.success({
        id: skillId,
        name,
        description,
        domain,
        pattern,
        template,
        isSystem: false,
        isPublic: false,
        createdBy: uid,
        tenantId,
        createdAt: new Date().toISOString(),
      });
    },
  );
}
