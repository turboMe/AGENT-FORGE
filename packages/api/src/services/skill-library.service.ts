import mongoose from 'mongoose';
import type {
  ISkillLibrary,
  SkillSearchResult,
  SearchOptions,
  PaginationOptions,
  PaginatedResult,
  EmbeddingConfig,
} from '@agentforge/skill-library';
import { ROUTING_THRESHOLDS } from '@agentforge/shared';
import type { ISkill } from '@agentforge/shared';

// ── Local SkillModel (uses the API's own mongoose connection) ──

function getSkillModel() {
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

// ── Helper ──────────────────────────────────────────

function scoreToRecommendation(score: number): 'use' | 'adapt' | 'create' {
  if (score >= ROUTING_THRESHOLDS.USE_EXISTING) return 'use';
  if (score >= ROUTING_THRESHOLDS.ADAPT_EXISTING) return 'adapt';
  return 'create';
}

function docToSkill(doc: any): ISkill {
  const obj = typeof doc.toObject === 'function' ? doc.toObject({ versionKey: false }) : doc;
  return {
    _id: String(obj._id),
    tenantId: obj.tenantId,
    name: obj.name,
    slug: obj.slug,
    description: obj.description,
    domain: obj.domain ?? [],
    pattern: obj.pattern,
    tags: obj.tags ?? [],
    template: obj.template,
    version: obj.version ?? 1,
    parentSkillId: obj.parentSkillId,
    isSystem: obj.isSystem ?? false,
    isPublic: obj.isPublic ?? false,
    stats: obj.stats ?? { useCount: 0, totalRatings: 0, avgSatisfaction: null },
    searchVector: obj.searchVector,
    createdBy: obj.createdBy ?? '',
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    deletedAt: obj.deletedAt,
  };
}

// ── Service (uses API's mongoose connection) ────────

export class SkillLibraryService implements ISkillLibrary {
  constructor(_embeddingConfig: EmbeddingConfig) {
    // Embedding config kept for API compatibility but not used for local search
  }

  /**
   * Search skills using simple regex matching on the API's mongoose connection.
   * This avoids the pnpm workspace mongoose singleton isolation issue.
   */
  async search(
    tenantId: string,
    query: string,
    options?: SearchOptions,
  ): Promise<SkillSearchResult[]> {
    const SkillModel = getSkillModel();
    const { limit = 10, minScore = 0, domains } = options ?? {};

    const filter: any = {
      deletedAt: null,
      $or: [
        { tenantId },
        { isSystem: true, isPublic: true },
      ],
    };

    if (domains && domains.length > 0) {
      filter['domain'] = { $in: domains };
    }

    // Regex-based search across name, description, and tags
    if (query) {
      const words = query.split(/\s+/).filter(Boolean);
      const regex = new RegExp(words.join('|'), 'i');
      (filter as any).$and = [
        { $or: [{ name: regex }, { description: regex }, { tags: regex }, { searchVector: regex }] },
      ];
    }

    const docs = await SkillModel.find(filter)
      .sort({ 'stats.useCount': -1 })
      .limit(limit)
      .lean();

    return docs
      .map((doc: any) => {
        // Simple text match scoring
        const skill = docToSkill(doc);
        const matchText = `${skill.name} ${skill.description} ${skill.tags.join(' ')}`.toLowerCase();
        const queryLower = query.toLowerCase();
        const words = queryLower.split(/\s+/).filter(Boolean);
        const matchedWords = words.filter(w => matchText.includes(w));
        const score = words.length > 0 ? matchedWords.length / words.length : 0;

        return {
          skill,
          matchScore: Math.round(score * 1000) / 1000,
          recommendation: scoreToRecommendation(score),
        } as SkillSearchResult;
      })
      .filter((r: SkillSearchResult) => r.matchScore >= minScore);
  }

  async save(
    skill: Omit<ISkill, '_id' | 'version' | 'stats' | 'createdAt' | 'updatedAt'>,
  ): Promise<ISkill> {
    const SkillModel = getSkillModel();
    const slug = skill.slug || skill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const doc = await SkillModel.create({
      ...skill,
      slug,
      version: 1,
      stats: { useCount: 0, totalRatings: 0, avgSatisfaction: null },
    });
    return docToSkill(doc);
  }

  async updateStats(
    skillId: string,
    usage: { incrementUseCount?: boolean; rating?: number },
  ): Promise<void> {
    const SkillModel = getSkillModel();
    const update: any = {};
    const inc: Record<string, number> = {};

    if (usage.incrementUseCount) {
      inc['stats.useCount'] = 1;
      update.$set = { 'stats.lastUsedAt': new Date() };
    }

    if (Object.keys(inc).length > 0) {
      update.$inc = inc;
    }

    if (Object.keys(update).length > 0) {
      await SkillModel.updateOne({ _id: skillId } as any, update);
    }
  }

  async findById(skillId: string): Promise<ISkill | null> {
    const SkillModel = getSkillModel();
    const doc = await SkillModel.findOne({ _id: skillId, deletedAt: null } as any).lean();
    return doc ? docToSkill(doc) : null;
  }

  async findByTenant(
    tenantId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ISkill>> {
    const SkillModel = getSkillModel();
    const { page = 1, limit = 20 } = options ?? {};
    const skip = (page - 1) * limit;

    const query: any = {
      deletedAt: null,
      $or: [
        { tenantId },
        { isSystem: true, isPublic: true },
      ],
    };

    const [docs, total] = await Promise.all([
      SkillModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      SkillModel.countDocuments(query),
    ]);

    return {
      items: docs.map((d: any) => docToSkill(d)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
