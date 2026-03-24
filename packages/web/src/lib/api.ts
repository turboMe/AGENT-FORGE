import type { SSEEvent, PipelineStepName, PipelineStepStatus } from '@/types/chat';
import type { Skill, SkillUpdatePayload } from '@/types/skill';
import type { Workflow, WorkflowRun, WorkflowParameter } from '@/types/workflow';
import type { Credential, CreateCredentialPayload } from '@/types/credential';
import type { UserProfile, UsageStats } from '@/types/settings';
import type { MarketplaceSkill } from '@/types/marketplace';
import type { Decision, AnalyticsOverview } from '@/types/analytics';
import { auth } from './firebase';

const API_BASE = '/api/v1';

// ── Auth Header Helper ──────────────────────────────
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {
    // Silently fail — API will return 401 and auth guard handles redirect
  }
  return headers;
}

async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const authHeaders = await getAuthHeaders();
  // Only include Content-Type: application/json if there's a body
  // Sending it without a body causes Fastify to try parsing empty body as JSON → 500
  const headers: Record<string, string> = {
    ...authHeaders,
    ...(init?.headers as Record<string, string> ?? {}),
  };
  if (!init?.body) {
    delete headers['Content-Type'];
  }
  return fetch(url, {
    ...init,
    headers,
  });
}

// ── Skill API ───────────────────────────────────────

export interface FetchSkillsParams {
  page?: number;
  limit?: number;
  search?: string;
  domain?: string;
  pattern?: string;
  sort?: string;
}

export interface FetchSkillsResponse {
  skills: Skill[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchSkills(params: FetchSkillsParams = {}): Promise<FetchSkillsResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.domain) query.set('domain', params.domain);
  if (params.pattern) query.set('pattern', params.pattern);
  if (params.sort) query.set('sort', params.sort);

  const res = await authFetch(`${API_BASE}/skills?${query.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch skills: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

export async function updateSkill(skillId: string, data: SkillUpdatePayload): Promise<Skill> {
  const res = await authFetch(`${API_BASE}/skills/${skillId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update skill: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

export async function deleteSkill(skillId: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/skills/${skillId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete skill: ${res.status}`);
}

export interface CreateSkillPayload {
  name: string;
  description: string;
  domain: string[];
  pattern: string;
  template: {
    persona: string;
    process: string[];
    outputFormat: string;
    constraints: string[];
    systemPrompt?: string;
  };
}

export async function createSkill(data: CreateSkillPayload): Promise<Skill> {
  const res = await authFetch(`${API_BASE}/skills`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create skill: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

/**
 * Stream a task through the AgentForge pipeline via SSE.
 * Automatically prepends "/route " to every task.
 *
 * @returns AbortController to cancel the stream
 */
export function streamTask(
  task: string,
  options: Record<string, unknown> | undefined,
  onEvent: (event: SSEEvent) => void,
  extra?: { conversationId?: string; files?: { name: string; type: string; size: number; content?: string }[]; skillId?: string },
): AbortController {
  const controller = new AbortController();

  // ── Auto-prefix /route ──────────────────────────
  const prefixedTask = task.startsWith('/route ')
    ? task
    : `/route ${task}`;

  (async () => {
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/tasks/stream`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ task: prefixedTask, options, conversationId: extra?.conversationId, files: extra?.files, skillId: extra?.skillId }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        onEvent({ type: 'error', data: { message: `HTTP ${res.status}: ${text}` } });
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        onEvent({ type: 'error', data: { message: 'No response stream available' } });
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        let currentEvent = '';
        let currentData = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            currentData = line.slice(6);
          } else if (line === '' && currentEvent && currentData) {
            // Empty line = end of SSE event
            try {
              const parsed = JSON.parse(currentData);
              switch (currentEvent) {
                case 'step':
                  onEvent({
                    type: 'step',
                    data: parsed as {
                      step: PipelineStepName;
                      status: PipelineStepStatus;
                      label: string;
                    },
                  });
                  break;
                case 'token':
                  onEvent({
                    type: 'token',
                    data: parsed as { content: string },
                  });
                  break;
                case 'done':
                  onEvent({
                    type: 'done',
                    data: parsed as { taskId?: string; status?: string; type?: string; isDeliverable?: boolean; routing?: Record<string, unknown> },
                  });
                  break;
                case 'architect_questions':
                  onEvent({
                    type: 'architect_questions',
                    data: parsed as { questions: string; requiresFollowUp: boolean },
                  });
                  break;
                case 'error':
                  onEvent({
                    type: 'error',
                    data: parsed as { message: string },
                  });
                  break;
                case 'heartbeat':
                  // Keepalive — no-op, just prevents connection timeout
                  onEvent({
                    type: 'heartbeat',
                    data: parsed as { ts: number },
                  });
                  break;
              }
            } catch {
              // Ignore malformed JSON
            }
            currentEvent = '';
            currentData = '';
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        onEvent({
          type: 'error',
          data: { message: (err as Error).message ?? 'Stream failed' },
        });
      }
    }
  })();

  return controller;
}

// ── Conversation API ────────────────────────────────

export interface ApiConversation {
  _id: string;
  tenantId: string;
  userId: string;
  title: string;
  messages?: { role: 'user' | 'assistant'; content: string; files?: { name: string; type: string; size: number }[]; timestamp: string }[];
  lastTaskId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FetchConversationsResponse {
  conversations: ApiConversation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchConversations(params?: { page?: number; limit?: number; search?: string }): Promise<FetchConversationsResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.search) query.set('search', params.search);

  const res = await authFetch(`${API_BASE}/conversations?${query.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch conversations: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

export async function createConversation(title?: string): Promise<ApiConversation> {
  const res = await authFetch(`${API_BASE}/conversations`, {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Failed to create conversation: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

export async function fetchConversation(id: string): Promise<ApiConversation> {
  const res = await authFetch(`${API_BASE}/conversations/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch conversation: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

export async function updateConversationTitle(id: string, title: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/conversations/${id}/title`, {
    method: 'PUT',
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Failed to update conversation title: ${res.status}`);
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/conversations/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete conversation: ${res.status}`);
}

// ── Workflow API ─────────────────────────────────────

export interface FetchWorkflowsParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface FetchWorkflowsResponse {
  workflows: Workflow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchWorkflows(params: FetchWorkflowsParams = {}): Promise<FetchWorkflowsResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);

  const res = await authFetch(`${API_BASE}/workflows?${query.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch workflows: ${res.status}`);
  const json = await res.json();
  const data = json.data ?? json;
  // Map _id → id for frontend compatibility
  return {
    ...data,
    workflows: (data.workflows ?? []).map((w: Record<string, unknown>) => ({
      ...w,
      id: w._id ?? w.id,
    })),
  };
}

export async function fetchWorkflowRuns(workflowId: string, limit = 20): Promise<WorkflowRun[]> {
  const res = await authFetch(`${API_BASE}/workflows/${workflowId}/runs?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch workflow runs: ${res.status}`);
  const json = await res.json();
  const runs = json.data?.runs ?? [];
  return runs.map((r: Record<string, unknown>) => ({
    ...r,
    id: r._id ?? r.id,
  }));
}

export async function pauseWorkflow(workflowId: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/workflows/${workflowId}/pause`, { method: 'PUT' });
  if (!res.ok) throw new Error(`Failed to pause workflow: ${res.status}`);
}

export async function resumeWorkflow(workflowId: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/workflows/${workflowId}/resume`, { method: 'PUT' });
  if (!res.ok) throw new Error(`Failed to resume workflow: ${res.status}`);
}

export async function deleteWorkflow(workflowId: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/workflows/${workflowId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete workflow: ${res.status}`);
}

export async function updateWorkflowParams(
  workflowId: string,
  parameters: WorkflowParameter[],
): Promise<void> {
  const res = await authFetch(`${API_BASE}/workflows/${workflowId}`, {
    method: 'PUT',
    body: JSON.stringify({ parameters }),
  });
  if (!res.ok) throw new Error(`Failed to update workflow params: ${res.status}`);
}

// ── Credential API ───────────────────────────────────

export async function fetchCredentials(): Promise<Credential[]> {
  const res = await authFetch(`${API_BASE}/credentials`);
  if (!res.ok) throw new Error(`Failed to fetch credentials: ${res.status}`);
  const json = await res.json();
  return json.data?.credentials ?? [];
}

export async function createCredential(data: CreateCredentialPayload): Promise<Credential> {
  const res = await authFetch(`${API_BASE}/credentials`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create credential: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

export async function deleteCredential(credentialId: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/credentials/${credentialId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete credential: ${res.status}`);
}

// ── Settings API ─────────────────────────────────────

export async function fetchProfile(): Promise<UserProfile> {
  const res = await authFetch(`${API_BASE}/settings/profile`);
  if (!res.ok) throw new Error(`Failed to fetch profile: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

export async function updateProfile(data: Partial<UserProfile>): Promise<void> {
  const res = await authFetch(`${API_BASE}/settings/profile`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update profile: ${res.status}`);
}

export async function fetchUsage(): Promise<UsageStats> {
  const res = await authFetch(`${API_BASE}/settings/usage`);
  if (!res.ok) throw new Error(`Failed to fetch usage: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

// ── Marketplace API ──────────────────────────────────

export interface FetchMarketplaceParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  sort?: string;
}

export interface FetchMarketplaceResponse {
  skills: MarketplaceSkill[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchMarketplaceSkills(
  params: FetchMarketplaceParams = {},
): Promise<FetchMarketplaceResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.category) query.set('category', params.category);
  if (params.sort) query.set('sort', params.sort);

  const res = await authFetch(`${API_BASE}/marketplace?${query.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch marketplace: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

export async function installMarketplaceSkill(skillId: string): Promise<{ installed: boolean }> {
  const res = await authFetch(`${API_BASE}/marketplace/${skillId}/install`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Failed to install skill: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

export async function publishSkill(skillId: string): Promise<Skill> {
  const res = await authFetch(`${API_BASE}/skills/${skillId}/publish`, {
    method: 'PUT',
  });
  if (!res.ok) throw new Error(`Failed to publish skill: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

// ── Analytics / Decisions API ────────────────────────

export interface FetchDecisionsParams {
  page?: number;
  limit?: number;
  search?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  success?: boolean;
}

export interface FetchDecisionsResponse {
  decisions: Decision[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchDecisions(
  params: FetchDecisionsParams = {},
): Promise<FetchDecisionsResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.action) query.set('action', params.action);
  if (params.dateFrom) query.set('from', params.dateFrom);
  if (params.dateTo) query.set('to', params.dateTo);
  if (params.success !== undefined) query.set('success', String(params.success));

  const res = await authFetch(`${API_BASE}/decisions?${query.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch decisions: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

export async function fetchAnalyticsOverview(): Promise<AnalyticsOverview> {
  const res = await authFetch(`${API_BASE}/analytics/overview`);
  if (!res.ok) throw new Error(`Failed to fetch analytics: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}
