import type { ISkill } from '@agentforge/shared';

// ── Letta Client Config ─────────────────────────────

export interface LettaClientConfig {
  baseUrl?: string;
  apiKey?: string;
  /** Request timeout in ms. Default: 5000 */
  timeoutMs?: number;
}

// ── Letta API Response Types ────────────────────────

export interface LettaAgent {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  memory?: LettaMemory;
  tools?: string[];
  model?: string;
  embedding_model?: string;
}

export interface LettaMemory {
  memory: {
    [blockLabel: string]: LettaMemoryBlock;
  };
  prompt_template?: string;
}

export interface LettaMemoryBlock {
  label: string;
  value: string;
  limit: number;
}

export interface LettaPassage {
  id: string;
  text: string;
  agent_id?: string;
  created_at?: string;
  embedding?: number[];
}

export interface LettaMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  text?: string;
  created_at?: string;
}

export interface LettaRecallMemory {
  messages: LettaMessage[];
}

export interface LettaHealthStatus {
  status: string;
  version?: string;
}

// ── Create Agent Request ────────────────────────────

export interface CreateAgentRequest {
  name: string;
  description?: string;
  memory_blocks?: Array<{ label: string; value: string; limit?: number }>;
  model?: string;
  embedding_model?: string;
  tools?: string[];
}

// ── Memory Manager Config ───────────────────────────

export interface MemoryManagerConfig {
  lettaClient: LettaClientConfig;
  /** Default model for Letta agents. */
  agentModel?: string;
  /** Max recall messages to retrieve. Default: 10 */
  recallLimit?: number;
  /** Max archival passages to retrieve. Default: 5 */
  archivalLimit?: number;
}

// ── Memory Context ──────────────────────────────────

export interface CoreMemoryData {
  persona?: string;
  human?: string;
  system?: string;
  [key: string]: string | undefined;
}

export interface MemoryContext {
  sessionId: string;
  coreMemory: CoreMemoryData;
  relevantHistory: string[];
  archivalKnowledge: string[];
  lastInteraction?: Date;
}

// ── Context Builder ─────────────────────────────────

export interface ContextBuildRequest {
  /** Current task description */
  task: string;
  /** Memory context from MemoryManager */
  memory: MemoryContext;
  /** Skill to apply (if matched) */
  skill?: ISkill;
  /** Max tokens for memory sections. Default: 2048 */
  memoryTokenBudget?: number;
}

export interface BuiltContext {
  /** Assembled prompt string */
  prompt: string;
  /** Estimated token count */
  estimatedTokens: number;
  /** Sections included */
  sections: string[];
}

// ── Session ─────────────────────────────────────────

export interface Session {
  id: string;
  userId: string;
  agentId?: string;
  startedAt: Date;
  lastActiveAt: Date;
  endedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface SessionConfig {
  /** TTL in milliseconds. Default: 3_600_000 (1 hour) */
  ttlMs?: number;
  /** Max concurrent sessions per user. Default: 5 */
  maxSessionsPerUser?: number;
}

// ── Service Interfaces ──────────────────────────────

export interface IMemoryService {
  getContext(userId: string, taskDescription: string): Promise<MemoryContext>;
  saveInteraction(userId: string, task: string, result: string): Promise<void>;
  searchMemory(userId: string, query: string): Promise<string[]>;
}

export interface IContextBuilder {
  build(request: ContextBuildRequest): BuiltContext;
}

export interface ISessionManager {
  createSession(userId: string): Session;
  getSession(sessionId: string): Session | null;
  endSession(sessionId: string): Session | null;
  getUserSessions(userId: string): Session[];
}
