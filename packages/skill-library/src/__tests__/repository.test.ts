import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SkillRepository } from '../repository.js';
import { SkillModel } from '../skill.model.js';

// ── Mock SkillModel ─────────────────────────────────

vi.mock('../skill.model.js', () => {
  const mockDoc = (data: Record<string, unknown>) => ({
    ...data,
    _id: data._id ?? 'skill-id-1',
    toObject: vi.fn().mockReturnValue({
      ...data,
      _id: data._id ?? 'skill-id-1',
      version: data.version ?? 1,
      isSystem: data.isSystem ?? false,
      isPublic: data.isPublic ?? false,
      stats: data.stats ?? { useCount: 0, totalRatings: 0, avgSatisfaction: null },
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      deletedAt: null,
    }),
  });

  const createMockQuery = (result: unknown) => ({
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnThis(),
    then: vi.fn().mockImplementation((resolve: (value: unknown) => void) => resolve(result)),
    exec: vi.fn().mockResolvedValue(result),
  });

  return {
    SkillModel: {
      create: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
      findById: vi.fn(),
      findOneAndUpdate: vi.fn(),
      updateOne: vi.fn(),
      countDocuments: vi.fn(),
    },
    __mockDoc: mockDoc,
    __createMockQuery: createMockQuery,
  };
});

// ── Test Data ───────────────────────────────────────

const skillData = {
  tenantId: 'tenant-1',
  name: 'cold-outreach-writer',
  slug: 'cold-outreach-writer',
  description: 'Writes cold outreach emails',
  domain: ['sales', 'email'],
  pattern: 'creator',
  tags: ['email', 'cold', 'outreach'],
  template: {
    persona: 'Expert sales copywriter with 10 years experience',
    process: ['Analyze target', 'Draft email', 'Refine'],
    outputFormat: 'Structured email with subject line',
    constraints: ['No spam language', 'Keep under 200 words'],
    systemPrompt: 'You are an expert sales copywriter...',
  },
  isSystem: false,
  isPublic: false,
  createdBy: 'user-uid-1',
};

describe('SkillRepository', () => {
  let repo: SkillRepository;
  let mockDocFn: (data: Record<string, unknown>) => Record<string, unknown>;

  beforeEach(async () => {
    vi.clearAllMocks();
    repo = new SkillRepository();

    const mod = await import('../skill.model.js');
    mockDocFn = (mod as unknown as { __mockDoc: typeof mockDocFn }).__mockDoc;
  });

  describe('create', () => {
    it('should create a skill with generated slug', async () => {
      const doc = mockDocFn({ ...skillData });
      vi.mocked(SkillModel.create).mockResolvedValue(doc as never);

      const result = await repo.create(skillData);

      expect(SkillModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'cold-outreach-writer',
          slug: 'cold-outreach-writer',
          version: 1,
          stats: expect.objectContaining({
            useCount: 0,
            totalRatings: 0,
            avgSatisfaction: null,
          }),
        }),
      );

      expect(result).toHaveProperty('_id');
      expect(result.name).toBe('cold-outreach-writer');
    });

    it('should generate slug from name if not provided', async () => {
      const dataNoSlug = { ...skillData, slug: '' };
      const doc = mockDocFn({ ...dataNoSlug, slug: 'cold-outreach-writer' });
      vi.mocked(SkillModel.create).mockResolvedValue(doc as never);

      await repo.create(dataNoSlug);

      expect(SkillModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'cold-outreach-writer',
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return skill when found', async () => {
      const doc = mockDocFn({ ...skillData, _id: 'skill-123' });
      vi.mocked(SkillModel.findOne).mockResolvedValue(doc as never);

      const result = await repo.findById('skill-123');

      expect(SkillModel.findOne).toHaveBeenCalledWith({
        _id: 'skill-123',
        deletedAt: null,
      });
      expect(result).not.toBeNull();
      expect(result?._id).toBe('skill-123');
    });

    it('should return null when not found', async () => {
      vi.mocked(SkillModel.findOne).mockResolvedValue(null);

      const result = await repo.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('should find skill by tenant and slug', async () => {
      const doc = mockDocFn({ ...skillData });
      vi.mocked(SkillModel.findOne).mockResolvedValue(doc as never);

      const result = await repo.findBySlug('tenant-1', 'cold-outreach-writer');

      expect(SkillModel.findOne).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        slug: 'cold-outreach-writer',
        deletedAt: null,
      });
      expect(result).not.toBeNull();
    });
  });

  describe('findByTenant', () => {
    it('should return paginated results', async () => {
      const docs = [
        mockDocFn({ ...skillData, _id: 'skill-1' }),
        mockDocFn({ ...skillData, _id: 'skill-2', name: 'other-skill' }),
      ];

      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(docs),
      };
      vi.mocked(SkillModel.find).mockReturnValue(mockQuery as never);
      vi.mocked(SkillModel.countDocuments).mockResolvedValue(15);

      const result = await repo.findByTenant('tenant-1', { page: 2, limit: 5 });

      expect(SkillModel.find).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        deletedAt: null,
      });
      expect(mockQuery.skip).toHaveBeenCalledWith(5); // (page-1) * limit
      expect(mockQuery.limit).toHaveBeenCalledWith(5);
      expect(result.total).toBe(15);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.totalPages).toBe(3);
      expect(result.items).toHaveLength(2);
    });

    it('should use default pagination when no options given', async () => {
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(SkillModel.find).mockReturnValue(mockQuery as never);
      vi.mocked(SkillModel.countDocuments).mockResolvedValue(0);

      const result = await repo.findByTenant('tenant-1');

      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(20);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  describe('update', () => {
    it('should update fields and increment version', async () => {
      const doc = mockDocFn({ ...skillData, version: 2, description: 'Updated' });
      vi.mocked(SkillModel.findOneAndUpdate).mockResolvedValue(doc as never);

      const result = await repo.update('skill-1', { description: 'Updated' });

      expect(SkillModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'skill-1', deletedAt: null },
        {
          $set: { description: 'Updated' },
          $inc: { version: 1 },
        },
        { new: true },
      );
      expect(result).toHaveProperty('_id');
    });

    it('should throw NotFoundError when skill not found', async () => {
      vi.mocked(SkillModel.findOneAndUpdate).mockResolvedValue(null);

      await expect(repo.update('nonexistent', { description: 'X' })).rejects.toThrow(
        'Skill not found',
      );
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt on the skill', async () => {
      vi.mocked(SkillModel.updateOne).mockResolvedValue({ matchedCount: 1 } as never);

      await repo.softDelete('skill-1');

      expect(SkillModel.updateOne).toHaveBeenCalledWith(
        { _id: 'skill-1', deletedAt: null },
        { $set: { deletedAt: expect.any(Date) } },
      );
    });

    it('should throw NotFoundError when skill not found', async () => {
      vi.mocked(SkillModel.updateOne).mockResolvedValue({ matchedCount: 0 } as never);

      await expect(repo.softDelete('nonexistent')).rejects.toThrow('Skill not found');
    });
  });

  describe('updateStats', () => {
    it('should increment useCount', async () => {
      vi.mocked(SkillModel.updateOne).mockResolvedValue({ matchedCount: 1 } as never);

      await repo.updateStats('skill-1', { incrementUseCount: true });

      expect(SkillModel.updateOne).toHaveBeenCalledWith(
        { _id: 'skill-1' },
        expect.objectContaining({
          $inc: { 'stats.useCount': 1 },
          $set: expect.objectContaining({ 'stats.lastUsedAt': expect.any(Date) }),
        }),
      );
    });

    it('should update avgSatisfaction as running average', async () => {
      const doc = {
        stats: { useCount: 5, totalRatings: 2, avgSatisfaction: 4.0 },
      };

      const mockSelect = { select: vi.fn().mockResolvedValue(doc) };
      vi.mocked(SkillModel.findById).mockReturnValue(mockSelect as never);
      vi.mocked(SkillModel.updateOne).mockResolvedValue({ matchedCount: 1 } as never);

      await repo.updateStats('skill-1', { rating: 5 });

      // Running average: (4.0 * 2 + 5) / 3 = 4.333... → rounded to 4.33
      expect(SkillModel.updateOne).toHaveBeenCalledWith(
        { _id: 'skill-1' },
        expect.objectContaining({
          $inc: { 'stats.totalRatings': 1 },
          $set: expect.objectContaining({
            'stats.avgSatisfaction': 4.33,
          }),
        }),
      );
    });

    it('should throw when skill not found for rating update', async () => {
      const mockSelect = { select: vi.fn().mockResolvedValue(null) };
      vi.mocked(SkillModel.findById).mockReturnValue(mockSelect as never);

      await expect(repo.updateStats('nonexistent', { rating: 5 })).rejects.toThrow(
        'Skill not found',
      );
    });
  });

  describe('findByDomain', () => {
    it('should find skills matching domain', async () => {
      const docs = [mockDocFn({ ...skillData, _id: 'skill-1' })];
      vi.mocked(SkillModel.find).mockResolvedValue(docs as never);

      const results = await repo.findByDomain('tenant-1', 'sales');

      expect(SkillModel.find).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        domain: 'sales',
        deletedAt: null,
      });
      expect(results).toHaveLength(1);
    });
  });
});
