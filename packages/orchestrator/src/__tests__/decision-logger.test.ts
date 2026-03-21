import { describe, it, expect, vi } from 'vitest';
import { DecisionLogger } from '../decision-logger.js';
import type { IDecision } from '@agentforge/shared';

// ── We mock mongoose entirely since we don't have a DB ──

// Build a chainable query mock
function createQueryMock(result: any) {
  const chain: Record<string, any> = {};
  chain.sort = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.lean = vi.fn().mockResolvedValue(result);
  return chain;
}

// ── We need to test the logic, not Mongoose ─────────

// Since DecisionLogger creates a Mongoose model internally,
// we'll test it via a unit-style approach mocking the model.

describe('DecisionLogger', () => {
  const sampleDecision: IDecision = {
    _id: '',
    tenantId: 'tenant-1',
    taskId: 'task-abc-123',
    timestamp: new Date('2026-03-21'),
    taskSummary: 'Refactor the auth module',
    taskType: 'text',
    domain: ['coding'],
    complexity: 'medium',
    searchKeywords: ['refactor', 'auth', 'module'],
    searchResult: 'exact_match',
    matchedSkillId: 'skill-xyz',
    matchScore: 0.92,
    actionTaken: 'use_existing',
    executionSuccess: true,
    createdAt: new Date('2026-03-21'),
  };

  describe('log', () => {
    it('should call model.create with correct fields', async () => {
      // We'll spy on the internal model by accessing it directly
      const logger = new DecisionLogger();
      const mockDoc = {
        ...sampleDecision,
        _id: 'generated-id-1',
      };

      // Override the model's create method
      (logger as any).model = {
        create: vi.fn().mockResolvedValue(mockDoc),
      };

      const result = await logger.log(sampleDecision);

      expect((logger as any).model.create).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        taskId: 'task-abc-123',
        timestamp: sampleDecision.timestamp,
        taskSummary: 'Refactor the auth module',
        taskType: 'text',
        domain: ['coding'],
        complexity: 'medium',
        searchKeywords: ['refactor', 'auth', 'module'],
        searchResult: 'exact_match',
        matchedSkillId: 'skill-xyz',
        matchScore: 0.92,
        actionTaken: 'use_existing',
        newSkillCreated: undefined,
        executionSuccess: true,
      });

      expect(result._id).toBe('generated-id-1');
      expect(result.tenantId).toBe('tenant-1');
      expect(result.taskId).toBe('task-abc-123');
    });
  });

  describe('findByTask', () => {
    it('should query by taskId and return IDecision', async () => {
      const logger = new DecisionLogger();
      const leanDoc = {
        ...sampleDecision,
        _id: 'doc-1',
      };

      (logger as any).model = {
        findOne: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(leanDoc),
        }),
      };

      const result = await logger.findByTask('task-abc-123');

      expect((logger as any).model.findOne).toHaveBeenCalledWith({ taskId: 'task-abc-123' });
      expect(result).not.toBeNull();
      expect(result!._id).toBe('doc-1');
      expect(result!.taskId).toBe('task-abc-123');
    });

    it('should return null when task not found', async () => {
      const logger = new DecisionLogger();
      (logger as any).model = {
        findOne: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        }),
      };

      const result = await logger.findByTask('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findByTenant', () => {
    it('should query by tenantId with sort and limit', async () => {
      const logger = new DecisionLogger();
      const leanDocs = [
        { ...sampleDecision, _id: 'doc-1' },
        { ...sampleDecision, _id: 'doc-2', taskId: 'task-def-456' },
      ];

      const chain = createQueryMock(leanDocs);
      (logger as any).model = {
        find: vi.fn().mockReturnValue(chain),
      };

      const results = await logger.findByTenant('tenant-1', 25);

      expect((logger as any).model.find).toHaveBeenCalledWith({ tenantId: 'tenant-1' });
      expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(chain.limit).toHaveBeenCalledWith(25);
      expect(results).toHaveLength(2);
    });

    it('should use default limit of 50', async () => {
      const logger = new DecisionLogger();
      const chain = createQueryMock([]);
      (logger as any).model = {
        find: vi.fn().mockReturnValue(chain),
      };

      await logger.findByTenant('tenant-1');

      expect(chain.limit).toHaveBeenCalledWith(50);
    });

    it('should return empty array when no decisions exist', async () => {
      const logger = new DecisionLogger();
      const chain = createQueryMock([]);
      (logger as any).model = {
        find: vi.fn().mockReturnValue(chain),
      };

      const results = await logger.findByTenant('empty-tenant');
      expect(results).toEqual([]);
    });
  });
});
