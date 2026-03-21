import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SkillIndexer } from '../indexer.js';
import { SkillModel } from '../skill.model.js';

// ── Mock dependencies ───────────────────────────────

vi.mock('../skill.model.js', () => ({
  SkillModel: {
    findById: vi.fn(),
    find: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock('../embedding.js', () => ({
  EmbeddingService: vi.fn().mockImplementation(() => ({
    buildEmbeddingText: vi.fn().mockReturnValue('mocked embedding text'),
    generateEmbedding: vi.fn().mockResolvedValue(Array.from({ length: 1024 }, () => 0.5)),
  })),
}));

// ── Test Data ───────────────────────────────────────

const mockSkill = {
  _id: 'skill-1',
  name: 'cold-outreach-writer',
  description: 'Writes cold emails',
  domain: ['sales', 'email'],
  tags: ['cold', 'outreach'],
  template: {
    persona: 'Expert copywriter',
    process: ['Analyze', 'Draft', 'Refine'],
    outputFormat: 'Email with subject',
    constraints: ['No spam', 'Under 200 words'],
    systemPrompt: 'You are an expert...',
  },
};

describe('SkillIndexer', () => {
  let indexer: SkillIndexer;

  beforeEach(() => {
    vi.clearAllMocks();
    indexer = new SkillIndexer({ apiKey: 'test-key' });
  });

  describe('buildSearchVector', () => {
    it('should concatenate all searchable fields', () => {
      const vector = indexer.buildSearchVector(mockSkill);

      expect(vector).toContain('cold-outreach-writer');
      expect(vector).toContain('Writes cold emails');
      expect(vector).toContain('sales');
      expect(vector).toContain('email');
      expect(vector).toContain('cold');
      expect(vector).toContain('outreach');
      expect(vector).toContain('Expert copywriter');
      expect(vector).toContain('Email with subject');
      expect(vector).toContain('No spam');
      expect(vector).toContain('Under 200 words');
      expect(vector).toContain('Analyze');
      expect(vector).toContain('Draft');
      expect(vector).toContain('Refine');
    });

    it('should filter empty strings', () => {
      const skill = {
        ...mockSkill,
        domain: ['sales', '', 'email'],
        tags: [],
      };

      const vector = indexer.buildSearchVector(skill);
      // Should not have double spaces from empty strings
      expect(vector).not.toMatch(/  /);
    });
  });

  describe('indexSkill', () => {
    it('should generate searchVector and embedding, then save', async () => {
      vi.mocked(SkillModel.findById).mockResolvedValue(mockSkill as never);
      vi.mocked(SkillModel.updateOne).mockResolvedValue({ matchedCount: 1 } as never);

      await indexer.indexSkill('skill-1');

      expect(SkillModel.findById).toHaveBeenCalledWith('skill-1');
      expect(SkillModel.updateOne).toHaveBeenCalledWith(
        { _id: 'skill-1' },
        {
          $set: {
            searchVector: expect.any(String),
            embedding: expect.any(Array),
          },
        },
      );

      // Verify embedding is 1024-dim via the mock call args
      const updateArgs = vi.mocked(SkillModel.updateOne).mock.calls[0] as unknown[];
      const setData = (updateArgs as [unknown, { $set: { embedding: number[] } }])[1];
      expect(setData.$set.embedding).toHaveLength(1024);
    });

    it('should throw when skill not found', async () => {
      vi.mocked(SkillModel.findById).mockResolvedValue(null);

      await expect(indexer.indexSkill('nonexistent')).rejects.toThrow(
        'Skill not found: nonexistent',
      );
    });
  });

  describe('reindexAll', () => {
    it('should reindex all tenant skills in batches', async () => {
      const skills = Array.from({ length: 25 }, (_, i) => ({
        _id: `skill-${i}`,
      }));

      const mockSelect = { select: vi.fn().mockResolvedValue(skills) };
      vi.mocked(SkillModel.find).mockReturnValue(mockSelect as never);
      vi.mocked(SkillModel.findById).mockImplementation(
        (id) => Promise.resolve({ ...mockSkill, _id: id }) as never,
      );
      vi.mocked(SkillModel.updateOne).mockResolvedValue({ matchedCount: 1 } as never);

      const result = await indexer.reindexAll('tenant-1', 10);

      expect(SkillModel.find).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        deletedAt: null,
      });
      expect(result.indexed).toBe(25);
      expect(result.failed).toBe(0);
    });

    it('should count failed indexing attempts', async () => {
      const skills = [{ _id: 'skill-1' }, { _id: 'skill-2' }, { _id: 'skill-3' }];

      const mockSelect = { select: vi.fn().mockResolvedValue(skills) };
      vi.mocked(SkillModel.find).mockReturnValue(mockSelect as never);

      // First skill succeeds, second fails, third succeeds
      vi.mocked(SkillModel.findById)
        .mockResolvedValueOnce({ ...mockSkill, _id: 'skill-1' } as never)
        .mockResolvedValueOnce(null) // This will cause indexSkill to throw
        .mockResolvedValueOnce({ ...mockSkill, _id: 'skill-3' } as never);
      vi.mocked(SkillModel.updateOne).mockResolvedValue({ matchedCount: 1 } as never);

      const result = await indexer.reindexAll('tenant-1', 10);

      expect(result.indexed).toBe(2);
      expect(result.failed).toBe(1);
    });

    it('should use default batch size of 10', async () => {
      const mockSelect = { select: vi.fn().mockResolvedValue([]) };
      vi.mocked(SkillModel.find).mockReturnValue(mockSelect as never);

      await indexer.reindexAll('tenant-1');

      // Just verify it doesn't crash with no skills
      expect(SkillModel.find).toHaveBeenCalled();
    });
  });
});
