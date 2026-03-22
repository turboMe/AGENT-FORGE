import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LettaClient } from '../client.js';

// ── Setup ───────────────────────────────────────────

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

function errorResponse(status: number, body = 'Error') {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ error: body }),
    text: () => Promise.resolve(body),
  });
}

// ── Tests ───────────────────────────────────────────

describe('LettaClient', () => {
  describe('constructor', () => {
    it('should use default base URL', () => {
      const client = new LettaClient();
      expect(client.baseUrl).toBe('http://localhost:8283');
    });

    it('should accept custom config', () => {
      const client = new LettaClient({
        baseUrl: 'http://letta:9000',
        apiKey: 'test-key',
      });
      expect(client.baseUrl).toBe('http://letta:9000');
    });
  });

  describe('healthCheck', () => {
    it('should call GET /v1/health', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ status: 'ok' }));

      const client = new LettaClient();
      const result = await client.healthCheck();

      expect(result).toEqual({ status: 'ok' });
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8283/v1/health',
        expect.objectContaining({ method: 'GET' }),
      );
    });
  });

  describe('createAgent', () => {
    it('should POST /v1/agents with body', async () => {
      const agent = { id: 'agent-1', name: 'test-agent', created_at: '2026-01-01' };
      mockFetch.mockReturnValueOnce(jsonResponse(agent));

      const client = new LettaClient();
      const result = await client.createAgent({ name: 'test-agent' });

      expect(result).toEqual(agent);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8283/v1/agents',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('test-agent'),
        }),
      );
    });
  });

  describe('getAgent', () => {
    it('should GET /v1/agents/:id', async () => {
      const agent = { id: 'agent-1', name: 'test-agent', created_at: '2026-01-01' };
      mockFetch.mockReturnValueOnce(jsonResponse(agent));

      const client = new LettaClient();
      const result = await client.getAgent('agent-1');

      expect(result).toEqual(agent);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8283/v1/agents/agent-1',
        expect.objectContaining({ method: 'GET' }),
      );
    });
  });

  describe('listAgents', () => {
    it('should GET /v1/agents without filter', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([]));

      const client = new LettaClient();
      await client.listAgents();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8283/v1/agents',
        expect.any(Object),
      );
    });

    it('should include name filter in query', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([]));

      const client = new LettaClient();
      await client.listAgents('my-agent');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8283/v1/agents?name=my-agent',
        expect.any(Object),
      );
    });
  });

  describe('deleteAgent', () => {
    it('should DELETE /v1/agents/:id', async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({ ok: true, status: 204, json: () => Promise.resolve(undefined), text: () => Promise.resolve('') }),
      );

      const client = new LettaClient();
      await client.deleteAgent('agent-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8283/v1/agents/agent-1',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  describe('getCoreMemory', () => {
    it('should GET /v1/agents/:id/memory', async () => {
      const memory = {
        memory: {
          persona: { label: 'persona', value: 'I am helpful', limit: 2000 },
        },
      };
      mockFetch.mockReturnValueOnce(jsonResponse(memory));

      const client = new LettaClient();
      const result = await client.getCoreMemory('agent-1');

      expect(result.memory['persona']!.value).toBe('I am helpful');
    });
  });

  describe('updateCoreMemory', () => {
    it('should PATCH /v1/agents/:id/memory', async () => {
      const updatedMemory = {
        memory: {
          persona: { label: 'persona', value: 'Updated persona', limit: 2000 },
        },
      };
      mockFetch.mockReturnValueOnce(jsonResponse(updatedMemory));

      const client = new LettaClient();
      const result = await client.updateCoreMemory('agent-1', {
        persona: 'Updated persona',
      });

      expect(result.memory['persona']!.value).toBe('Updated persona');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8283/v1/agents/agent-1/memory',
        expect.objectContaining({ method: 'PATCH' }),
      );
    });
  });

  describe('getRecallMemory', () => {
    it('should GET /v1/agents/:id/recall-memory with limit', async () => {
      const recall = {
        messages: [
          { id: 'msg-1', role: 'user', text: 'Hello', created_at: '2026-01-01' },
        ],
      };
      mockFetch.mockReturnValueOnce(jsonResponse(recall));

      const client = new LettaClient();
      const result = await client.getRecallMemory('agent-1', 5);

      expect(result.messages).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8283/v1/agents/agent-1/recall-memory?limit=5',
        expect.any(Object),
      );
    });
  });

  describe('archival memory', () => {
    it('should POST to insert archival memory', async () => {
      const passages = [{ id: 'p-1', text: 'Important fact', agent_id: 'agent-1' }];
      mockFetch.mockReturnValueOnce(jsonResponse(passages));

      const client = new LettaClient();
      const result = await client.insertArchivalMemory('agent-1', 'Important fact');

      expect(result).toHaveLength(1);
      expect(result[0]!.text).toBe('Important fact');
    });

    it('should GET to search archival memory', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([]));

      const client = new LettaClient();
      await client.searchArchivalMemory('agent-1', 'search query', 3);

      const calledUrl = mockFetch.mock.calls[0]![0] as string;
      expect(calledUrl).toContain('/v1/agents/agent-1/archival-memory');
      expect(calledUrl).toContain('query=search+query');
      expect(calledUrl).toContain('limit=3');
    });

    it('should DELETE archival memory passage', async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({ ok: true, status: 204, json: () => Promise.resolve(undefined), text: () => Promise.resolve('') }),
      );

      const client = new LettaClient();
      await client.deleteArchivalMemory('agent-1', 'passage-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8283/v1/agents/agent-1/archival-memory/passage-1',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  describe('error handling', () => {
    it('should throw MemoryError on HTTP errors', async () => {
      mockFetch.mockReturnValueOnce(errorResponse(500, 'Internal Server Error'));

      const client = new LettaClient();
      await expect(client.healthCheck()).rejects.toThrow('Letta API error 500');
    });

    it('should throw MemoryError on 404', async () => {
      mockFetch.mockReturnValueOnce(errorResponse(404, 'Not Found'));

      const client = new LettaClient();
      await expect(client.getAgent('nonexistent')).rejects.toThrow(
        'Letta API error 404',
      );
    });

    it('should throw MemoryError on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const client = new LettaClient();
      await expect(client.healthCheck()).rejects.toThrow(
        'Letta connection failed',
      );
    });

    it('should throw MemoryError on timeout', async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => {
              const error = new DOMException('The operation was aborted', 'AbortError');
              reject(error);
            }, 10);
          }),
      );

      const client = new LettaClient({ timeoutMs: 1 });
      await expect(client.healthCheck()).rejects.toThrow('timed out');
    });
  });

  describe('auth headers', () => {
    it('should include Authorization header when API key is set', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ status: 'ok' }));

      const client = new LettaClient({ apiKey: 'my-secret-key' });
      await client.healthCheck();

      const calledOptions = mockFetch.mock.calls[0]![1] as RequestInit;
      const headers = calledOptions.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer my-secret-key');
    });

    it('should not include Authorization header when no API key', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ status: 'ok' }));

      const client = new LettaClient();
      await client.healthCheck();

      const calledOptions = mockFetch.mock.calls[0]![1] as RequestInit;
      const headers = calledOptions.headers as Record<string, string>;
      expect(headers['Authorization']).toBeUndefined();
    });
  });
});
