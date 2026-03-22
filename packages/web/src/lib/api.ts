import type { SSEEvent, PipelineStepName, PipelineStepStatus } from '@/types/chat';
import type { Skill, SkillUpdatePayload } from '@/types/skill';
import type { Workflow, WorkflowRun, WorkflowParameter } from '@/types/workflow';
import type { Credential, CreateCredentialPayload } from '@/types/credential';
import type { UserProfile, UsageStats } from '@/types/settings';

const API_BASE = '/api/v1';

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

  const res = await fetch(`${API_BASE}/skills?${query.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch skills: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

export async function updateSkill(skillId: string, data: SkillUpdatePayload): Promise<Skill> {
  const res = await fetch(`${API_BASE}/skills/${skillId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update skill: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

export async function deleteSkill(skillId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/skills/${skillId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete skill: ${res.status}`);
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
): AbortController {
  const controller = new AbortController();

  // ── Auto-prefix /route ──────────────────────────
  const prefixedTask = task.startsWith('/route ')
    ? task
    : `/route ${task}`;

  (async () => {
    try {
      const res = await fetch(`${API_BASE}/tasks/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: prefixedTask, options }),
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
                    data: parsed as { taskId: string; routing: Record<string, unknown> },
                  });
                  break;
                case 'error':
                  onEvent({
                    type: 'error',
                    data: parsed as { message: string },
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

  const res = await fetch(`${API_BASE}/workflows?${query.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch workflows: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

export async function fetchWorkflowRuns(workflowId: string, limit = 20): Promise<WorkflowRun[]> {
  const res = await fetch(`${API_BASE}/workflows/${workflowId}/runs?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch workflow runs: ${res.status}`);
  const json = await res.json();
  return json.data?.runs ?? [];
}

export async function pauseWorkflow(workflowId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/workflows/${workflowId}/pause`, { method: 'PUT' });
  if (!res.ok) throw new Error(`Failed to pause workflow: ${res.status}`);
}

export async function resumeWorkflow(workflowId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/workflows/${workflowId}/resume`, { method: 'PUT' });
  if (!res.ok) throw new Error(`Failed to resume workflow: ${res.status}`);
}

export async function deleteWorkflow(workflowId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/workflows/${workflowId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete workflow: ${res.status}`);
}

export async function updateWorkflowParams(
  workflowId: string,
  parameters: WorkflowParameter[],
): Promise<void> {
  const res = await fetch(`${API_BASE}/workflows/${workflowId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parameters }),
  });
  if (!res.ok) throw new Error(`Failed to update workflow params: ${res.status}`);
}

// ── Credential API ───────────────────────────────────

export async function fetchCredentials(): Promise<Credential[]> {
  const res = await fetch(`${API_BASE}/credentials`);
  if (!res.ok) throw new Error(`Failed to fetch credentials: ${res.status}`);
  const json = await res.json();
  return json.data?.credentials ?? [];
}

export async function createCredential(data: CreateCredentialPayload): Promise<Credential> {
  const res = await fetch(`${API_BASE}/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create credential: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

export async function deleteCredential(credentialId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/credentials/${credentialId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete credential: ${res.status}`);
}

// ── Settings API ─────────────────────────────────────

export async function fetchProfile(): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/settings/profile`);
  if (!res.ok) throw new Error(`Failed to fetch profile: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

export async function updateProfile(data: Partial<UserProfile>): Promise<void> {
  const res = await fetch(`${API_BASE}/settings/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update profile: ${res.status}`);
}

export async function fetchUsage(): Promise<UsageStats> {
  const res = await fetch(`${API_BASE}/settings/usage`);
  if (!res.ok) throw new Error(`Failed to fetch usage: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}
