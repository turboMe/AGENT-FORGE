import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/authenticate.js';

interface MarketplaceQuerystring {
  page?: string;
  limit?: string;
  search?: string;
  category?: string;
  sort?: string;
}

interface MarketplaceParams {
  skillId: string;
}

// ── Re-use the Skill model from skills route ────────────
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

// ── Serialize skill for marketplace response ────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToMarketplaceSkill(doc: any, userTenantId?: string, installedParentIds?: Set<string>) {
  const obj = typeof doc.toObject === 'function' ? doc.toObject({ versionKey: false }) : doc;
  const id = String(obj._id);

  // Determine install status
  let installStatus: 'available' | 'installed' = 'available';
  if (installedParentIds?.has(id)) {
    installStatus = 'installed';
  }
  // If this skill belongs to the user's tenant, it's "installed" (it's theirs)
  if (obj.tenantId === userTenantId) {
    installStatus = 'installed';
  }

  return {
    id,
    name: obj.name,
    slug: obj.slug,
    description: obj.description,
    author: {
      name: obj.createdBy === 'seed-lite' || obj.createdBy === 'migration'
        ? 'AgentForge'
        : obj.createdBy,
      avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(obj.name.slice(0, 2))}`,
    },
    category: (obj.domain ?? [])[0] ?? 'general',
    tags: obj.tags ?? [],
    version: `${obj.version ?? 1}.0.0`,
    downloads: obj.stats?.useCount ?? 0,
    rating: obj.stats?.avgSatisfaction ?? 0,
    totalRatings: obj.stats?.totalRatings ?? 0,
    installStatus,
    isVerified: obj.isSystem ?? false,
    createdAt: obj.createdAt?.toISOString?.() ?? obj.createdAt ?? '',
    updatedAt: obj.updatedAt?.toISOString?.() ?? obj.updatedAt ?? '',
  };
}

export async function marketplaceRoutes(app: FastifyInstance) {
  const SkillModel = getSkillModel();

  // ── GET /marketplace ──────────────────────────────
  app.get<{ Querystring: MarketplaceQuerystring }>(
    '/marketplace',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const {
        page = '1',
        limit = '20',
        search,
        category,
        sort = 'downloads',
      } = request.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

      // Build query: all public skills (from any tenant)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const query: Record<string, any> = {
        isPublic: true,
        deletedAt: null,
      };

      if (search) {
        const regex = new RegExp(search, 'i');
        query.$or = [
          { name: regex },
          { description: regex },
          { tags: regex },
        ];
      }

      if (category && category !== 'All') {
        query.domain = category.toLowerCase();
      }

      // Sort mapping
      const sortMap: Record<string, Record<string, 1 | -1>> = {
        downloads: { 'stats.useCount': -1 },
        rating: { 'stats.avgSatisfaction': -1 },
        newest: { createdAt: -1 },
      };
      const sortObj = sortMap[sort] ?? sortMap['downloads']!;

      // Fetch user's installed skills (to mark installStatus)
      const tenantId = request.user.tenantId;
      const installedSkills = await SkillModel.find(
        { tenantId, parentSkillId: { $exists: true, $ne: null }, deletedAt: null } as any,
        { parentSkillId: 1 },
      ).lean();
      const installedParentIds = new Set(
        (installedSkills as any[]).map((s: any) => s.parentSkillId).filter(Boolean) as string[],
      );

      const skip = (pageNum - 1) * limitNum;

      const [docs, total] = await Promise.all([
        SkillModel.find(query as any).sort(sortObj).skip(skip).limit(limitNum).exec(),
        SkillModel.countDocuments(query as any).exec(),
      ]);

      request.log.info(
        { tenantId, page: pageNum, limit: limitNum, search, category, total },
        'Listing marketplace skills',
      );

      return reply.success({
        skills: docs.map((doc: any) => docToMarketplaceSkill(doc, tenantId, installedParentIds)),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    },
  );

  // ── POST /marketplace/:skillId/install ─────────────
  app.post<{ Params: MarketplaceParams }>(
    '/marketplace/:skillId/install',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { skillId } = request.params;
      const { uid, tenantId } = request.user;

      // 1. Find the source skill
      let sourceSkill;
      try {
        sourceSkill = await SkillModel.findOne({
          _id: skillId,
          isPublic: true,
          deletedAt: null,
        } as any).exec();
      } catch {
        return reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: `Marketplace skill not found: ${skillId}` },
        });
      }

      if (!sourceSkill) {
        return reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: `Marketplace skill not found: ${skillId}` },
        });
      }

      // 2. Check if already installed
      const existing = await SkillModel.findOne({
        tenantId,
        parentSkillId: skillId,
        deletedAt: null,
      } as any).exec();

      if (existing) {
        return reply.code(409).send({
          success: false,
          error: { code: 'ALREADY_INSTALLED', message: 'Skill is already installed' },
        });
      }

      // 3. Create a copy for the user's tenant
      const sourceObj = sourceSkill.toObject({ versionKey: false });

      const newSkill = await SkillModel.create({
        tenantId,
        name: sourceObj.name,
        slug: sourceObj.slug,
        description: sourceObj.description,
        domain: sourceObj.domain,
        pattern: sourceObj.pattern,
        tags: sourceObj.tags,
        template: sourceObj.template,
        version: 1,
        parentSkillId: skillId,
        isSystem: false,
        isPublic: false,
        stats: { useCount: 0, totalRatings: 0, avgSatisfaction: null },
        searchVector: sourceObj.searchVector ?? `${sourceObj.name} ${sourceObj.description} ${(sourceObj.domain ?? []).join(' ')}`,
        createdBy: uid,
        deletedAt: null,
      });

      request.log.info(
        { tenantId, skillId, newSkillId: String(newSkill._id) },
        'Installed marketplace skill',
      );

      return reply.success({
        installed: true,
        skillId: String(newSkill._id),
        parentSkillId: skillId,
      });
    },
  );
}
