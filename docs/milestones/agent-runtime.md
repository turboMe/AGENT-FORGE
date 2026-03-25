# Milestone: Agent Runtime

> **Status:** Planned  
> **Priority:** Next milestone  
> **Depends on:** Current agent UX improvements (done)

## Overview

Currently, agents in AgentForge are **prompt-only** — the generated prompt is used as a system prompt for a single LLM call, identical to how skills work. A "real" agent needs an **execution loop** with tool calling, multi-step reasoning, and memory between steps.

This milestone transforms agents from "premium skills" into **autonomous executors** that can call tools, observe results, and iterate until the task is done.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Agent Runtime                       │
│                                                         │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │  Agent    │───▶│  LLM Call    │───▶│  Tool Call    │  │
│  │  Loop     │◀──│  (w/ tools)  │    │  Executor     │  │
│  │          │    └──────────────┘    └───────────────┘  │
│  │  observe  │                              │           │
│  │  think    │         ┌────────────────────┘           │
│  │  act      │         ▼                                │
│  │  verify   │    ┌──────────────┐                      │
│  │          │◀──│  Tool Result  │                      │
│  └──────────┘    │  Injection    │                      │
│       │          └──────────────┘                      │
│       ▼                                                 │
│  ┌──────────┐                                           │
│  │  DONE /  │                                           │
│  │  MAX     │                                           │
│  │  STEPS   │                                           │
│  └──────────┘                                           │
└─────────────────────────────────────────────────────────┘
```

## Components

### 1. Agent Executor (`packages/agent-runtime/src/executor.ts`)

The core loop that orchestrates agent execution:

```typescript
interface AgentExecutorConfig {
  maxSteps: number;           // Safety limit (default: 10)
  maxDurationMs: number;      // Timeout (default: 120_000)
  systemPrompt: string;       // The generated agent prompt
  tools: ToolDefinition[];    // Available tools for this agent
  onStep?: (step: AgentStep) => void;  // SSE streaming callback
}

interface AgentStep {
  type: 'thought' | 'tool_call' | 'tool_result' | 'final_answer';
  content: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: string;
  stepNumber: number;
}
```

**Loop logic:**
1. Send messages + tool definitions to LLM (function calling API)
2. If LLM returns `tool_calls` → execute tools → inject results → go to 1
3. If LLM returns text (no tool calls) → return as final answer
4. If `maxSteps` or `maxDurationMs` reached → force final answer

### 2. Tool Registry (`packages/agent-runtime/src/tools/`)

Map of tool names to executable implementations:

```typescript
interface ToolDefinition {
  name: string;
  description: string;
  parameters: JSONSchema;       // For LLM function calling
  execute: (input: Record<string, unknown>) => Promise<string>;
}
```

**Initial tool set:**

| Tool | Description | Implementation |
|------|-------------|----------------|
| `web_search` | Search the web via SerpAPI/Brave/Tavily | API call to search provider |
| `web_fetch` | Fetch and extract text from a URL | HTTP fetch + html-to-text |
| `knowledge_search` | Search internal skill library | Query MongoDB skills collection |
| `calculate` | Evaluate math expressions | Safe eval with mathjs |
| `write_file` | Generate and save a file | Write to temp/output dir |

### 3. Multi-turn SSE Streaming

Extend the existing SSE protocol with new event types:

```
event: agent_step
data: {"stepNumber": 1, "type": "thought", "content": "I need to search for..."}

event: agent_step
data: {"stepNumber": 2, "type": "tool_call", "toolName": "web_search", "toolInput": {"query": "..."}}

event: agent_step
data: {"stepNumber": 2, "type": "tool_result", "toolName": "web_search", "content": "Results: ..."}

event: agent_step
data: {"stepNumber": 3, "type": "final_answer", "content": "Based on my research..."}

event: done
data: {"taskId": "...", "totalSteps": 3, "type": "agent"}
```

### 4. Backend Integration (`packages/api/src/routes/tasks.ts`)

When `matchedSkill.pattern === 'agent'` and agent runtime is enabled:

```typescript
if (matchedSkill?.pattern === 'agent' && process.env.AGENT_RUNTIME_ENABLED === 'true') {
  const executor = new AgentExecutor({
    systemPrompt: matchedSkill.template.systemPrompt,
    tools: toolRegistry.getToolsForAgent(matchedSkill),
    maxSteps: 10,
    onStep: (step) => {
      reply.raw.write(sseEvent('agent_step', step));
    },
  });
  
  const result = await executor.run(cleanTask);
  // Stream final result...
} else {
  // Existing single-shot behavior (backward compatible)
}
```

### 5. Frontend: Agent Step Viewer

New component to display multi-step agent execution in real-time:

- Collapsible step cards showing thought → tool call → result
- Live streaming of each step
- Final answer prominently displayed
- Total steps and duration shown

## Implementation Order

1. **`packages/agent-runtime/`** — New package: executor loop + tool interface
2. **`packages/agent-runtime/src/tools/`** — Implement initial tools (web_search, web_fetch)
3. **`packages/api/src/routes/tasks.ts`** — Integrate executor behind feature flag
4. **Frontend step viewer** — New component for rendering agent steps
5. **SSE protocol extension** — `agent_step` events
6. **LLM Gateway updates** — Ensure `tools` param is passed through to providers

## Feature Flag

```env
AGENT_RUNTIME_ENABLED=false  # Enable when ready
```

This ensures the existing single-shot agent behavior remains the default until the runtime is battle-tested.

## Dependencies

- `packages/llm-gateway` — Must support `tools` parameter in LLM calls (OpenAI/Anthropic function calling)
- Search API key (SerpAPI/Brave/Tavily) for `web_search` tool
- `html-to-text` or similar for `web_fetch` tool

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Infinite loops | `maxSteps` + `maxDurationMs` hard limits |
| Tool execution errors | Graceful error injection back to LLM as "tool failed" |
| Cost explosion | Per-agent step limit + token budget tracking |
| Security (web_fetch) | URL allowlist, rate limiting, response size caps |
