// ── Chat Types ──────────────────────────────────────

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  files?: UploadedFile[];
  /** If true, message content contains a deliverable (skill/agent prompt) */
  isDeliverable?: boolean;
  /** Type of deliverable: 'skill' or 'agent' */
  deliverableType?: 'skill' | 'agent';
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content?: string;
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
  | 'log'
  | 'architect';

export type PipelineStepStatus = 'pending' | 'running' | 'done' | 'failed' | 'timeout';

export interface PipelineStep {
  step: PipelineStepName;
  label: string;
  status: PipelineStepStatus;
  error?: string;
  startedAt?: number;
}

export type SSEEvent =
  | { type: 'step'; data: { step: PipelineStepName; status: PipelineStepStatus; label: string } }
  | { type: 'token'; data: { content: string } }
  | { type: 'done'; data: { taskId?: string; status?: string; type?: string; isDeliverable?: boolean; routing?: Record<string, unknown> } }
  | { type: 'architect_questions'; data: { questions: string; requiresFollowUp: boolean } }
  | { type: 'heartbeat'; data: { ts: number } }
  | { type: 'error'; data: { message: string } };

// ── Architect Follow-up State ───────────────────────

export interface ArchitectState {
  isAwaitingInput: boolean;
  generationType: 'skill' | 'agent' | null;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  originalTask: string;
  originalFiles: UploadedFile[];
}

// ── State ───────────────────────────────────────────

export interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  isStreaming: boolean;
  pipelineSteps: PipelineStep[];
  streamedContent: string;
  architect: ArchitectState;
}

export type ChatAction =
  | { type: 'NEW_CONVERSATION' }
  | { type: 'SET_ACTIVE_CONVERSATION'; id: string }
  | { type: 'ADD_USER_MESSAGE'; message: Message }
  | { type: 'START_STREAMING' }
  | { type: 'PIPELINE_STEP'; step: PipelineStepName; status: PipelineStepStatus; label: string; error?: string }
  | { type: 'APPEND_TOKEN'; content: string }
  | { type: 'FINISH_STREAMING'; taskId?: string; isDeliverable?: boolean; deliverableType?: string }
  | { type: 'STREAM_ERROR'; error: string }
  | { type: 'LOAD_CONVERSATIONS'; conversations: Conversation[] }
  | { type: 'UPDATE_CONVERSATION'; conversation: Conversation }
  | { type: 'DELETE_CONVERSATION'; id: string }
  | { type: 'ARCHITECT_AWAITING_INPUT'; generationType: 'skill' | 'agent'; originalTask: string; originalFiles: UploadedFile[] }
  | { type: 'ARCHITECT_RESET' };
