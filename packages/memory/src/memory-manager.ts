import { LettaClient } from './client.js';
import type {
  MemoryManagerConfig,
  MemoryContext,
  CoreMemoryData,
  LettaAgent,
} from './types.js';

// ── Agent cache entry ───────────────────────────────

interface CachedAgent {
  agentId: string;
  resolvedAt: number;
}

// ── Memory Manager ──────────────────────────────────

/**
 * Orchestrates the three Letta memory tiers:
 * - **Core memory**: persona, user profile, system context (≈ RAM)
 * - **Recall memory**: searchable conversation history
 * - **Archival memory**: long-term vector-searchable storage
 *
 * Auto-provisions a Letta agent per tenant and degrades gracefully
 * when Letta is unavailable.
 */
export class MemoryManager {
  private readonly client: LettaClient;
  private readonly recallLimit: number;
  private readonly archivalLimit: number;
  private readonly agentModel?: string;

  /** tenantId/userId → cached agent info */
  private readonly agentCache = new Map<string, CachedAgent>();

  constructor(config: MemoryManagerConfig) {
    this.client = new LettaClient(config.lettaClient);
    this.recallLimit = config.recallLimit ?? 10;
    this.archivalLimit = config.archivalLimit ?? 5;
    this.agentModel = config.agentModel;
  }

  // ── Public API (IMemoryService) ─────────────────────

  /**
   * Get unified memory context for a user and task.
   * Fetches core + recall + archival in parallel.
   * Returns empty context if Letta is unavailable.
   */
  async getContext(userId: string, taskDescription: string): Promise<MemoryContext> {
    const sessionId = `session_${userId}_${Date.now()}`;

    try {
      const agentId = await this.resolveAgent(userId);

      const [coreMemory, recallResult, archivalResult] = await Promise.allSettled([
        this.client.getCoreMemory(agentId),
        this.client.getRecallMemory(agentId, this.recallLimit),
        this.client.searchArchivalMemory(agentId, taskDescription, this.archivalLimit),
      ]);

      // Extract core memory blocks
      const coreData: CoreMemoryData = {};
      if (coreMemory.status === 'fulfilled' && coreMemory.value.memory) {
        for (const [label, block] of Object.entries(coreMemory.value.memory)) {
          coreData[label] = block.value;
        }
      }

      // Extract recall messages
      const relevantHistory: string[] = [];
      if (recallResult.status === 'fulfilled') {
        for (const msg of recallResult.value.messages) {
          if (msg.text) {
            relevantHistory.push(`[${msg.role}]: ${msg.text}`);
          }
        }
      }

      // Extract archival passages
      const archivalKnowledge: string[] = [];
      if (archivalResult.status === 'fulfilled') {
        for (const passage of archivalResult.value) {
          archivalKnowledge.push(passage.text);
        }
      }

      return {
        sessionId,
        coreMemory: coreData,
        relevantHistory,
        archivalKnowledge,
        lastInteraction: new Date(),
      };
    } catch {
      // Graceful degradation — return empty context
      return this.emptyContext(sessionId);
    }
  }

  /**
   * Save an interaction to archival memory for long-term retrieval.
   */
  async saveInteraction(userId: string, task: string, result: string): Promise<void> {
    try {
      const agentId = await this.resolveAgent(userId);

      const passage = `Task: ${task}\nResult: ${result}\nTimestamp: ${new Date().toISOString()}`;
      await this.client.insertArchivalMemory(agentId, passage);
    } catch {
      // Silently degrade — interaction save is non-critical
    }
  }

  /**
   * Semantic search across archival memory.
   */
  async searchMemory(userId: string, query: string): Promise<string[]> {
    try {
      const agentId = await this.resolveAgent(userId);
      const passages = await this.client.searchArchivalMemory(
        agentId,
        query,
        this.archivalLimit,
      );
      return passages.map((p) => p.text);
    } catch {
      return [];
    }
  }

  // ── Agent Provisioning ────────────────────────────────

  /**
   * Resolve (or create) a Letta agent for the given user.
   * Caches agent IDs in memory for performance.
   */
  async resolveAgent(userId: string): Promise<string> {
    // Check cache first
    const cached = this.agentCache.get(userId);
    if (cached) {
      return cached.agentId;
    }

    // Try to find existing agent by name
    const agentName = `agentforge_${userId}`;
    const existing = await this.client.listAgents(agentName);
    if (existing.length > 0) {
      const agent = existing[0] as LettaAgent;
      this.cacheAgent(userId, agent.id);
      return agent.id;
    }

    // Create new agent
    const newAgent = await this.client.createAgent({
      name: agentName,
      description: `AgentForge memory agent for user ${userId}`,
      memory_blocks: [
        { label: 'persona', value: 'I am an AI assistant memory store for AgentForge.', limit: 2000 },
        { label: 'human', value: `User ${userId}`, limit: 2000 },
      ],
      model: this.agentModel,
    });

    this.cacheAgent(userId, newAgent.id);
    return newAgent.id;
  }

  // ── Helpers ───────────────────────────────────────────

  private cacheAgent(userId: string, agentId: string): void {
    this.agentCache.set(userId, {
      agentId,
      resolvedAt: Date.now(),
    });
  }

  private emptyContext(sessionId: string): MemoryContext {
    return {
      sessionId,
      coreMemory: {},
      relevantHistory: [],
      archivalKnowledge: [],
    };
  }

  /**
   * Expose the underlying client for advanced usage.
   */
  getClient(): LettaClient {
    return this.client;
  }

  /**
   * Clear the agent cache (useful for testing).
   */
  clearCache(): void {
    this.agentCache.clear();
  }
}
