import type { SSEEvent, PipelineStepName, PipelineStepStatus } from '@/types/chat';

const API_BASE = '/api/v1';

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
