import { MemoryError } from '@agentforge/shared';
import type {
  LettaClientConfig,
  LettaAgent,
  LettaMemory,
  LettaPassage,
  LettaHealthStatus,
  LettaRecallMemory,
  CreateAgentRequest,
} from './types.js';

// ── Default config ──────────────────────────────────

const DEFAULT_BASE_URL = 'http://localhost:8283';
const DEFAULT_TIMEOUT_MS = 5_000;

// ── Letta REST API Client ───────────────────────────

export class LettaClient {
  readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;

  constructor(config: LettaClientConfig = {}) {
    this.baseUrl = config.baseUrl ?? process.env.LETTA_BASE_URL ?? DEFAULT_BASE_URL;
    this.apiKey = config.apiKey ?? process.env.LETTA_API_KEY ?? undefined;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  // ── Health ──────────────────────────────────────────

  async healthCheck(): Promise<LettaHealthStatus> {
    return this.request<LettaHealthStatus>('GET', '/v1/health');
  }

  // ── Agents ──────────────────────────────────────────

  async createAgent(req: CreateAgentRequest): Promise<LettaAgent> {
    return this.request<LettaAgent>('POST', '/v1/agents', req);
  }

  async getAgent(agentId: string): Promise<LettaAgent> {
    return this.request<LettaAgent>('GET', `/v1/agents/${agentId}`);
  }

  async listAgents(name?: string): Promise<LettaAgent[]> {
    const params = name ? `?name=${encodeURIComponent(name)}` : '';
    return this.request<LettaAgent[]>('GET', `/v1/agents${params}`);
  }

  async deleteAgent(agentId: string): Promise<void> {
    await this.request<unknown>('DELETE', `/v1/agents/${agentId}`);
  }

  // ── Core Memory ─────────────────────────────────────

  async getCoreMemory(agentId: string): Promise<LettaMemory> {
    return this.request<LettaMemory>('GET', `/v1/agents/${agentId}/memory`);
  }

  async updateCoreMemory(
    agentId: string,
    blocks: Record<string, string>,
  ): Promise<LettaMemory> {
    return this.request<LettaMemory>(
      'PATCH',
      `/v1/agents/${agentId}/memory`,
      blocks,
    );
  }

  // ── Recall Memory ───────────────────────────────────

  async getRecallMemory(
    agentId: string,
    limit = 10,
  ): Promise<LettaRecallMemory> {
    return this.request<LettaRecallMemory>(
      'GET',
      `/v1/agents/${agentId}/recall-memory?limit=${limit}`,
    );
  }

  // ── Archival Memory ─────────────────────────────────

  async insertArchivalMemory(
    agentId: string,
    text: string,
  ): Promise<LettaPassage[]> {
    return this.request<LettaPassage[]>(
      'POST',
      `/v1/agents/${agentId}/archival-memory`,
      { text },
    );
  }

  async searchArchivalMemory(
    agentId: string,
    query: string,
    limit = 5,
  ): Promise<LettaPassage[]> {
    const params = new URLSearchParams({
      query,
      limit: String(limit),
    });
    return this.request<LettaPassage[]>(
      'GET',
      `/v1/agents/${agentId}/archival-memory?${params.toString()}`,
    );
  }

  async deleteArchivalMemory(
    agentId: string,
    passageId: string,
  ): Promise<void> {
    await this.request<unknown>(
      'DELETE',
      `/v1/agents/${agentId}/archival-memory/${passageId}`,
    );
  }

  // ── HTTP Layer ──────────────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unknown error');
        throw new MemoryError(
          'letta',
          `Letta API error ${response.status}: ${errorBody}`,
          response.status,
        );
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof MemoryError) throw error;

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new MemoryError(
          'letta',
          `Letta request timed out after ${this.timeoutMs}ms: ${method} ${path}`,
          504,
        );
      }

      throw new MemoryError(
        'letta',
        `Letta connection failed: ${error instanceof Error ? error.message : String(error)}`,
        502,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
