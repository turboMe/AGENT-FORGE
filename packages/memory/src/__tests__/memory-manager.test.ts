import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryManager } from '../memory-manager.js';
import { LettaClient } from '../client.js';

// ── Mock LettaClient ────────────────────────────────

vi.mock('../client.js', () => {
  return {
    LettaClient: vi.fn().mockImplementation(() => ({
      listAgents: vi.fn(),
      createAgent: vi.fn(),
      getCoreMemory: vi.fn(),
      getRecallMemory: vi.fn(),
      searchArchivalMemory: vi.fn(),
      insertArchivalMemory: vi.fn(),
    })),
  };
});

function getClientMock() {
  const MockedClient = vi.mocked(LettaClient);
  return MockedClient.mock.results[0]!.value as {
    listAgents: ReturnType<typeof vi.fn>;
    createAgent: ReturnType<typeof vi.fn>;
    getCoreMemory: ReturnType<typeof vi.fn>;
    getRecallMemory: ReturnType<typeof vi.fn>;
    searchArchivalMemory: ReturnType<typeof vi.fn>;
    insertArchivalMemory: ReturnType<typeof vi.fn>;
  };
}

describe('MemoryManager', () => {
  let manager: MemoryManager;
  let clientMock: ReturnType<typeof getClientMock>;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new MemoryManager({
      lettaClient: { baseUrl: 'http://localhost:8283' },
      recallLimit: 5,
      archivalLimit: 3,
    });
    clientMock = getClientMock();
  });

  describe('getContext', () => {
    it('should aggregate core, recall, and archival memory', async () => {
      // Setup: existing agent
      clientMock.listAgents.mockResolvedValue([{ id: 'agent-1', name: 'agentforge_user-1' }]);

      // Core memory
      clientMock.getCoreMemory.mockResolvedValue({
        memory: {
          persona: { label: 'persona', value: 'Helpful assistant', limit: 2000 },
          human: { label: 'human', value: 'Developer user', limit: 2000 },
        },
      });

      // Recall memory
      clientMock.getRecallMemory.mockResolvedValue({
        messages: [
          { id: 'm1', role: 'user', text: 'Previous question' },
          { id: 'm2', role: 'assistant', text: 'Previous answer' },
        ],
      });

      // Archival memory
      clientMock.searchArchivalMemory.mockResolvedValue([
        { id: 'p1', text: 'Relevant knowledge about TypeScript' },
      ]);

      const context = await manager.getContext('user-1', 'Write a TypeScript function');

      expect(context.coreMemory.persona).toBe('Helpful assistant');
      expect(context.coreMemory.human).toBe('Developer user');
      expect(context.relevantHistory).toHaveLength(2);
      expect(context.relevantHistory[0]).toContain('[user]: Previous question');
      expect(context.archivalKnowledge).toHaveLength(1);
      expect(context.archivalKnowledge[0]).toContain('Relevant knowledge');
      expect(context.sessionId).toContain('session_user-1');
    });

    it('should auto-provision agent on first use', async () => {
      clientMock.listAgents.mockResolvedValue([]);
      clientMock.createAgent.mockResolvedValue({
        id: 'new-agent',
        name: 'agentforge_user-2',
      });
      clientMock.getCoreMemory.mockResolvedValue({ memory: {} });
      clientMock.getRecallMemory.mockResolvedValue({ messages: [] });
      clientMock.searchArchivalMemory.mockResolvedValue([]);

      await manager.getContext('user-2', 'Test task');

      expect(clientMock.createAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'agentforge_user-2',
          description: expect.stringContaining('user-2'),
        }),
      );
    });

    it('should cache agent ID on subsequent calls', async () => {
      clientMock.listAgents.mockResolvedValue([{ id: 'agent-3', name: 'agentforge_user-3' }]);
      clientMock.getCoreMemory.mockResolvedValue({ memory: {} });
      clientMock.getRecallMemory.mockResolvedValue({ messages: [] });
      clientMock.searchArchivalMemory.mockResolvedValue([]);

      await manager.getContext('user-3', 'Task 1');
      await manager.getContext('user-3', 'Task 2');

      // listAgents should only be called once (result cached)
      expect(clientMock.listAgents).toHaveBeenCalledTimes(1);
    });

    it('should degrade gracefully when Letta is unavailable', async () => {
      clientMock.listAgents.mockRejectedValue(new Error('ECONNREFUSED'));

      const context = await manager.getContext('user-4', 'Some task');

      expect(context.coreMemory).toEqual({});
      expect(context.relevantHistory).toEqual([]);
      expect(context.archivalKnowledge).toEqual([]);
    });

    it('should handle partial failures in memory tiers', async () => {
      clientMock.listAgents.mockResolvedValue([{ id: 'agent-5', name: 'agentforge_user-5' }]);

      // Core works, recall fails, archival works
      clientMock.getCoreMemory.mockResolvedValue({
        memory: {
          persona: { label: 'persona', value: 'Test persona', limit: 2000 },
        },
      });
      clientMock.getRecallMemory.mockRejectedValue(new Error('Recall unavailable'));
      clientMock.searchArchivalMemory.mockResolvedValue([
        { id: 'p1', text: 'Archival data' },
      ]);

      const context = await manager.getContext('user-5', 'A task');

      // Core and archival should still be populated
      expect(context.coreMemory.persona).toBe('Test persona');
      expect(context.relevantHistory).toEqual([]); // recall failed
      expect(context.archivalKnowledge).toEqual(['Archival data']);
    });
  });

  describe('saveInteraction', () => {
    it('should insert into archival memory', async () => {
      clientMock.listAgents.mockResolvedValue([{ id: 'agent-6', name: 'agentforge_user-6' }]);
      clientMock.insertArchivalMemory.mockResolvedValue([{ id: 'p1', text: 'stored' }]);

      await manager.saveInteraction('user-6', 'My task', 'My result');

      expect(clientMock.insertArchivalMemory).toHaveBeenCalledWith(
        'agent-6',
        expect.stringContaining('My task'),
      );
      expect(clientMock.insertArchivalMemory).toHaveBeenCalledWith(
        'agent-6',
        expect.stringContaining('My result'),
      );
    });

    it('should silently degrade on save failure', async () => {
      clientMock.listAgents.mockRejectedValue(new Error('Down'));

      // Should not throw
      await expect(
        manager.saveInteraction('user-7', 'task', 'result'),
      ).resolves.toBeUndefined();
    });
  });

  describe('searchMemory', () => {
    it('should return archival search results', async () => {
      clientMock.listAgents.mockResolvedValue([{ id: 'agent-8', name: 'agentforge_user-8' }]);
      clientMock.searchArchivalMemory.mockResolvedValue([
        { id: 'p1', text: 'Match 1' },
        { id: 'p2', text: 'Match 2' },
      ]);

      const results = await manager.searchMemory('user-8', 'search query');

      expect(results).toEqual(['Match 1', 'Match 2']);
    });

    it('should return empty array on failure', async () => {
      clientMock.listAgents.mockRejectedValue(new Error('Down'));

      const results = await manager.searchMemory('user-9', 'query');
      expect(results).toEqual([]);
    });
  });

  describe('clearCache', () => {
    it('should force re-resolution of agents', async () => {
      clientMock.listAgents.mockResolvedValue([{ id: 'agent-10', name: 'agentforge_user-10' }]);
      clientMock.getCoreMemory.mockResolvedValue({ memory: {} });
      clientMock.getRecallMemory.mockResolvedValue({ messages: [] });
      clientMock.searchArchivalMemory.mockResolvedValue([]);

      await manager.getContext('user-10', 'Task 1');
      expect(clientMock.listAgents).toHaveBeenCalledTimes(1);

      manager.clearCache();

      await manager.getContext('user-10', 'Task 2');
      expect(clientMock.listAgents).toHaveBeenCalledTimes(2);
    });
  });
});
