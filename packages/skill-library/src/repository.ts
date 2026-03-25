import { NotFoundError } from '@agentforge/shared';
import type { ISkill } from '@agentforge/shared';
import { SkillModel, type ISkillDocument } from './skill.model.js';
import type { PaginationOptions, PaginatedResult } from './types.js';

// ── Helpers ─────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function docToSkill(doc: ISkillDocument): ISkill {
  const obj = doc.toObject({ versionKey: false });
  return {
    _id: String(obj._id),
    tenantId: obj.tenantId,
    name: obj.name,
    slug: obj.slug,
    description: obj.description,
    domain: obj.domain,
    pattern: obj.pattern,
    tags: obj.tags,
    template: obj.template,
    version: obj.version,
    parentSkillId: obj.parentSkillId,
    isSystem: obj.isSystem,
    isPublic: obj.isPublic,
    stats: obj.stats,
    searchVector: obj.searchVector,
    createdBy: obj.createdBy,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    deletedAt: obj.deletedAt,
  };
}

// ── Repository ──────────────────────────────────────

export class SkillRepository {
  /**
   * Create a new skill.
   */
  async create(
    data: Omit<ISkill, '_id' | 'version' | 'stats' | 'createdAt' | 'updatedAt'>,
  ): Promise<ISkill> {
    const slug = data.slug || toSlug(data.name);

    const doc = await SkillModel.create({
      ...data,
      slug,
      version: 1,
      stats: {
        useCount: 0,
        totalRatings: 0,
        avgSatisfaction: null,
      },
    });

    return docToSkill(doc);
  }

  /**
   * Find skill by ID (excludes soft-deleted).
   */
  async findById(id: string): Promise<ISkill | null> {
    const doc = await SkillModel.findOne({
      _id: id,
      deletedAt: null,
    });

    return doc ? docToSkill(doc) : null;
  }

  /**
   * Find skill by tenant + slug (excludes soft-deleted).
   */
  async findBySlug(tenantId: string, slug: string): Promise<ISkill | null> {
    const doc = await SkillModel.findOne({
      tenantId,
      slug,
      deletedAt: null,
    });

    return doc ? docToSkill(doc) : null;
  }

  /**
   * List skills for a tenant with pagination and optional filters.
   */
  async findByTenant(
    tenantId: string,
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<ISkill>> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', filter: skillFilter } = options;
    const skip = (page - 1) * limit;

    // Build query filter — include user's own skills + system/public skills
    const query: Record<string, unknown> = {
      deletedAt: null,
      $or: [
        { tenantId },
        { isSystem: true, isPublic: true },
      ],
    };

    if (skillFilter?.search) {
      const regex = new RegExp(skillFilter.search, 'i');
      // Use $and to avoid overwriting the tenant access $or
      if (!query.$and) query.$and = [];
      (query.$and as unknown[]).push({
        $or: [
          { name: regex },
          { description: regex },
          { tags: regex },
        ],
      });
    }

    if (skillFilter?.domain) {
      query.domain = skillFilter.domain;
    }

    if (skillFilter?.pattern) {
      query.pattern = skillFilter.pattern;
    }

    // Map frontend sort fields to DB fields
    const sortFieldMap: Record<string, string> = {
      use_count: 'stats.useCount',
      satisfaction: 'stats.avgSatisfaction',
      created_at: 'createdAt',
    };
    const resolvedSortBy = sortFieldMap[sortBy] ?? sortBy;
    const sort: Record<string, 1 | -1> = { [resolvedSortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [docs, total] = await Promise.all([
      SkillModel.find(query).sort(sort).skip(skip).limit(limit),
      SkillModel.countDocuments(query),
    ]);

    return {
      items: docs.map(docToSkill),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Partial-update a skill. Increments version automatically.
   */
  async update(
    id: string,
    data: Partial<Pick<ISkill, 'name' | 'description' | 'domain' | 'pattern' | 'tags' | 'template' | 'isPublic'>>,
  ): Promise<ISkill> {
    const doc = await SkillModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      {
        $set: data,
        $inc: { version: 1 },
      },
      { new: true },
    );

    if (!doc) {
      throw new NotFoundError(`Skill not found: ${id}`);
    }

    return docToSkill(doc);
  }

  /**
   * Soft-delete a skill.
   */
  async softDelete(id: string): Promise<void> {
    const result = await SkillModel.updateOne(
      { _id: id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
    );

    if (result.matchedCount === 0) {
      throw new NotFoundError(`Skill not found: ${id}`);
    }
  }

  /**
   * Atomically update skill usage stats.
   */
  async updateStats(
    id: string,
    usage: { incrementUseCount?: boolean; rating?: number },
  ): Promise<void> {
    const update: Record<string, unknown> = {};
    const inc: Record<string, number> = {};

    if (usage.incrementUseCount) {
      inc['stats.useCount'] = 1;
      update.$set = { 'stats.lastUsedAt': new Date() };
    }

    if (usage.rating !== undefined) {
      inc['stats.totalRatings'] = 1;
      // Compute running average using pipeline update
      const doc = await SkillModel.findById(id).select('stats');
      if (!doc) {
        throw new NotFoundError(`Skill not found: ${id}`);
      }

      const { totalRatings, avgSatisfaction } = doc.stats;
      const currentAvg = avgSatisfaction ?? 0;
      const newAvg = (currentAvg * totalRatings + usage.rating) / (totalRatings + 1);

      update.$set = {
        ...update.$set as Record<string, unknown>,
        'stats.avgSatisfaction': Math.round(newAvg * 100) / 100,
      };
    }

    if (Object.keys(inc).length > 0) {
      update.$inc = inc;
    }

    if (Object.keys(update).length > 0) {
      await SkillModel.updateOne({ _id: id }, update);
    }
  }

  /**
   * Find skills by domain for a tenant.
   */
  async findByDomain(tenantId: string, domain: string): Promise<ISkill[]> {
    const docs = await SkillModel.find({
      tenantId,
      domain,
      deletedAt: null,
    });

    return docs.map(docToSkill);
  }
}
