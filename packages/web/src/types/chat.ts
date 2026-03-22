// ── Chat Types ──────────────────────────────────────

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  files?: UploadedFile[];
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export type PipelineStepName =
  | 'classify'
  | 'search'
  | 'route'
  | 'execute'
  | 'save'
  | 'log';

export type PipelineStepStatus = 'pending' | 'running' | 'done';

export interface PipelineStep {
  step: PipelineStepName;
  label: string;
  status: PipelineStepStatus;
}

export type SSEEvent =
  | { type: 'step'; data: { step: PipelineStepName; status: PipelineStepStatus; label: string } }
  | { type: 'token'; data: { content: string } }
  | { type: 'done'; data: { taskId: string; routing: Record<string, unknown> } }
  | { type: 'error'; data: { message: string } };

// ── State ───────────────────────────────────────────

export interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  isStreaming: boolean;
  pipelineSteps: PipelineStep[];
  streamedContent: string;
}

export type ChatAction =
  | { type: 'NEW_CONVERSATION' }
  | { type: 'SET_ACTIVE_CONVERSATION'; id: string }
  | { type: 'ADD_USER_MESSAGE'; message: Message }
  | { type: 'START_STREAMING' }
  | { type: 'PIPELINE_STEP'; step: PipelineStepName; status: PipelineStepStatus; label: string }
  | { type: 'APPEND_TOKEN'; content: string }
  | { type: 'FINISH_STREAMING'; taskId: string }
  | { type: 'STREAM_ERROR'; error: string }
  | { type: 'LOAD_CONVERSATIONS'; conversations: Conversation[] }
  | { type: 'DELETE_CONVERSATION'; id: string };
