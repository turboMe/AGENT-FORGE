import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
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
    systemPrompt?: string;
    examples?: { input: string; output: string }[];
  };
}

/**
 * Get or register the Skill model on the API's own mongoose connection.
 * This avoids pnpm workspace singleton isolation issues with skill-library's mongoose.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSkillModel(): mongoose.Model<any> {
  if (mongoose.models['Skill']) {
    return mongoose.models['Skill'];
  }

  const ExampleSchema = new mongoose.Schema(
    { input: { type: String, required: true }, output: { type: String, required: true } },
    { _id: false },
  );

  const TemplateSchema = new mongoose.Schema(
    {
      persona: { type: String, required: true },
      process: { type: [String], required: true },
      outputFormat: { type: String, required: true },
      constraints: { type: [String], default: [] },
      examples: { type: [ExampleSchema], default: undefined },
      systemPrompt: { type: String, default: '' },
    },
    { _id: false },
  );

  const StatsSchema = new mongoose.Schema(
    {
      useCount: { type: Number, default: 0 },
      totalRatings: { type: Number, default: 0 },
      avgSatisfaction: { type: Number, default: null },
      lastUsedAt: { type: Date, default: undefined },
    },
    { _id: false },
  );

  const SkillSchema = new mongoose.Schema(
    {
      tenantId: { type: String, required: true, index: true },
      name: { type: String, required: true },
      slug: { type: String, required: true },
      description: { type: String, required: true },
      domain: { type: [String], default: [] },
      pattern: { type: String, required: true },
      tags: { type: [String], default: [] },
      template: { type: TemplateSchema, required: true },
      version: { type: Number, default: 1 },
      parentSkillId: { type: String, default: undefined },
      isSystem: { type: Boolean, default: false },
      isPublic: { type: Boolean, default: false },
      stats: { type: StatsSchema, default: () => ({}) },
      searchVector: { type: String, default: undefined },
      embedding: { type: [Number], default: undefined, select: false },
      createdBy: { type: String, required: true },
      deletedAt: { type: Date, default: null },
    },
    { timestamps: true },
  );

  return mongoose.model('Skill', SkillSchema, 'skills');
}

// ── Helper to serialize a doc ─────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToSkill(doc: any) {
  const obj = typeof doc.toObject === 'function' ? doc.toObject({ versionKey: false }) : doc;
  return {
    id: String(obj._id),
    _id: String(obj._id),
    tenantId: obj.tenantId,
    name: obj.name,
    slug: obj.slug,
    description: obj.description,
    domain: obj.domain ?? [],
    pattern: obj.pattern,
    tags: obj.tags ?? [],
    version: obj.version ?? 1,
    isSystem: obj.isSystem ?? false,
    isPublic: obj.isPublic ?? false,
    template: obj.template ? {
      persona: obj.template.persona ?? '',
      process: obj.template.process ?? [],
      outputFormat: obj.template.outputFormat ?? '',
      constraints: obj.template.constraints ?? [],
      systemPrompt: obj.template.systemPrompt ?? '',
      examples: obj.template.examples ?? [],
    } : undefined,
    stats: {
      useCount: obj.stats?.useCount ?? 0,
      totalRatings: obj.stats?.totalRatings ?? 0,
      avgSatisfaction: obj.stats?.avgSatisfaction ?? null,
      lastUsedAt: obj.stats?.lastUsedAt ?? null,
    },
    createdBy: obj.createdBy ?? '',
    createdAt: obj.createdAt?.toISOString?.() ?? obj.createdAt ?? '',
    updatedAt: obj.updatedAt?.toISOString?.() ?? obj.updatedAt ?? '',
  };
}

export async function skillRoutes(app: FastifyInstance) {
  const SkillModel = getSkillModel();

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
        pattern,
        search,
        sort = 'use_count',
      } = request.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

      // Parse sort field and direction
      const [sortField, sortDir] = sort.includes(':') ? sort.split(':') : [sort, 'desc'];

      const sortFieldMap: Record<string, string> = {
        use_count: 'stats.useCount',
        satisfaction: 'stats.avgSatisfaction',
        created_at: 'createdAt',
      };
      const resolvedSort = sortFieldMap[sortField ?? 'use_count'] ?? sortField;

      request.log.info(
        { tenantId: request.user.tenantId, page: pageNum, limit: limitNum, domain, search, sort },
        'Listing skills',
      );

      const tenantId = request.user.tenantId;
      const skip = (pageNum - 1) * limitNum;

      // Build query — user's own + system/public skills
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const query: Record<string, any> = {
        deletedAt: null,
        $or: [
          { tenantId },
          { isSystem: true, isPublic: true },
        ],
      };

      if (search) {
        const regex = new RegExp(search, 'i');
        query.$and = [{ $or: [{ name: regex }, { description: regex }, { tags: regex }] }];
      }
      if (domain) {
        query.domain = domain;
      }
      if (pattern) {
        query.pattern = pattern;
      }

      const sortObj: Record<string, 1 | -1> = { [resolvedSort as string]: sortDir === 'asc' ? 1 : -1 };

      const [docs, total] = await Promise.all([
        SkillModel.find(query as any).sort(sortObj).skip(skip).limit(limitNum).exec(),
        SkillModel.countDocuments(query as any).exec(),
      ]);

      return reply.success({
        skills: docs.map(docToSkill),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
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

      let doc;
      try {
        doc = await SkillModel.findOne({ _id: skillId, deletedAt: null } as any).exec();
      } catch {
        return reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: `Skill not found: ${skillId}` },
        });
      }

      if (!doc) {
        return reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: `Skill not found: ${skillId}` },
        });
      }

      return reply.success(docToSkill(doc));
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

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      const doc = await SkillModel.create({
        tenantId,
        name,
        slug,
        description,
        domain,
        pattern,
        tags: [],
        template: {
          persona: template.persona || 'AI Assistant',
          process: template.process?.length ? template.process : ['Process user request'],
          outputFormat: template.outputFormat || 'Markdown',
          constraints: template.constraints ?? [],
          systemPrompt: template.systemPrompt ?? '',
          examples: template.examples,
        },
        version: 1,
        isSystem: false,
        isPublic: false,
        stats: { useCount: 0, totalRatings: 0, avgSatisfaction: null },
        searchVector: `${name} ${description} ${domain.join(' ')}`,
        createdBy: uid,
      });

      return reply.success(docToSkill(doc as any));
    },
  );

  // ── PUT /skills/:skillId ──────────────────────────
  app.put<{ Params: SkillParams; Body: Partial<CreateSkillBody> }>(
    '/skills/:skillId',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { skillId } = request.params;
      const updates = request.body;

      request.log.info(
        { tenantId: request.user.tenantId, skillId, fields: Object.keys(updates) },
        'Updating skill',
      );

      const doc = await SkillModel.findOneAndUpdate(
        { _id: skillId, deletedAt: null } as any,
        { $set: updates, $inc: { version: 1 } },
        { new: true },
      ).exec();

      if (!doc) {
        return reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: `Skill not found: ${skillId}` },
        });
      }

      return reply.success(docToSkill(doc as any));
    },
  );

  // ── DELETE /skills/:skillId ───────────────────────
  app.delete<{ Params: SkillParams }>(
    '/skills/:skillId',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { skillId } = request.params;

      request.log.info(
        { tenantId: request.user.tenantId, skillId },
        'Deleting skill (soft)',
      );

      const result = await SkillModel.updateOne(
        { _id: skillId, deletedAt: null } as any,
        { $set: { deletedAt: new Date() } },
      ).exec();

      if (result.matchedCount === 0) {
        return reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: `Skill not found: ${skillId}` },
        });
      }

      return reply.success({
        id: skillId,
        deletedAt: new Date().toISOString(),
      });
    },
  );

  // ── PUT /skills/:skillId/publish ──────────────────
  app.put<{ Params: SkillParams }>(
    '/skills/:skillId/publish',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { skillId } = request.params;
      const { tenantId } = request.user;

      // Find the skill — must belong to this tenant
      let doc;
      try {
        doc = await SkillModel.findOne({
          _id: skillId,
          tenantId,
          deletedAt: null,
        } as any).exec();
      } catch {
        return reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: `Skill not found: ${skillId}` },
        });
      }

      if (!doc) {
        return reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: `Skill not found or not owned: ${skillId}` },
        });
      }

      // Toggle isPublic
      const newPublicState = !doc.toObject().isPublic;

      const updated = await SkillModel.findOneAndUpdate(
        { _id: skillId } as any,
        { $set: { isPublic: newPublicState } },
        { new: true },
      ).exec();

      if (!updated) {
        return reply.code(500).send({
          success: false,
          error: { code: 'UPDATE_FAILED', message: 'Failed to update skill' },
        });
      }

      request.log.info(
        { tenantId, skillId, isPublic: newPublicState },
        newPublicState ? 'Published skill to marketplace' : 'Unpublished skill from marketplace',
      );

      return reply.success(docToSkill(updated as any));
    },
  );
}
