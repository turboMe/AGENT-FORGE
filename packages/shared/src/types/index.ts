// ── File Attachment ─────────────────────────────────
export interface FileAttachment {
  name: string;
  type: string;
  size: number;
  content?: string;
  url?: string;
}

// ── Tenant ──────────────────────────────────────────
export interface ITenant {
  _id: string;
  name: string;
  slug: string;
  ownerId: string;
  tier: 'free' | 'pro' | 'team' | 'agency';
  limits: {
    tasksPerDay: number;
    tokensPerDay: number;
    maxSkills: number;
    maxApiKeys: number;
  };
  billing?: {
    stripeCustomerId?: string;
    subscriptionId?: string;
    currentPeriodEnd?: Date;
  };
  settings: {
    defaultModel: string;
    defaultQuality: string;
    defaultLanguage: string;
  };
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ── User ────────────────────────────────────────────
export interface IUser {
  _id: string;
  firebaseUid: string;
  email: string;
  displayName?: string;
  photoUrl?: string;
  tenantId: string;
  role: 'owner' | 'member' | 'viewer';
  preferences: {
    language: string;
    theme: 'light' | 'dark' | 'system';
  };
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ── User Profile (Settings) ────────────────────────
export interface IUserProfile {
  _id: string;
  firebaseUid: string;
  tenantId: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  plan: 'free' | 'pro' | 'enterprise';
  preferences: {
    theme: 'light' | 'dark' | 'system';
    defaultModel: string;
    notifications: {
      email: boolean;
      push: boolean;
      weeklyReport: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

// ── Skill ───────────────────────────────────────────
export interface ISkill {
  _id: string;
  tenantId: string;
  name: string;
  slug: string;
  description: string;
  domain: string[];
  pattern: string;
  tags: string[];
  template: {
    persona: string;
    process: string[];
    outputFormat: string;
    constraints: string[];
    examples?: { input: string; output: string }[];
    systemPrompt: string;
  };
  version: number;
  parentSkillId?: string;
  isSystem: boolean;
  isPublic: boolean;
  stats: {
    useCount: number;
    totalRatings: number;
    avgSatisfaction: number | null;
    lastUsedAt?: Date;
  };
  searchVector?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ── Task ────────────────────────────────────────────
export interface TaskOptions {
  model: string;
  quality: string;
  forceNewSkill?: boolean;
  language: string;
  context?: Record<string, unknown>;
}

export interface RoutingResult {
  searchResult: 'exact_match' | 'partial_match' | 'no_match';
  matchScore: number;
  matchedSkillId?: string;
  actionTaken: 'use_existing' | 'adapt_existing' | 'create_new';
  newSkillId?: string;
}

export interface ExecutionResult {
  model: string;
  provider: string;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  latencyMs: number;
  retries: number;
  costEstimate: number;
}

export interface ITask {
  _id: string;
  taskId: string;
  tenantId: string;
  userId: string;
  input: {
    task: string;
    options: TaskOptions;
  };
  classification: {
    taskType: 'text' | 'automation';
    domain: string[];
    complexity: 'simple' | 'medium' | 'complex';
    keywords: string[];
  };
  routing: RoutingResult;
  execution: ExecutionResult;
  result?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  quality?: {
    autoScore?: number;
    userRating?: number;
    userFeedback?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// ── Decision ────────────────────────────────────────
export interface IDecision {
  _id: string;
  tenantId: string;
  taskId: string;
  timestamp: Date;
  taskSummary: string;
  taskType: 'text' | 'automation';
  domain: string[];
  complexity: 'simple' | 'medium' | 'complex';
  searchKeywords: string[];
  searchResult: 'exact_match' | 'partial_match' | 'no_match';
  matchedSkillId?: string;
  matchScore: number;
  actionTaken: 'use_existing' | 'adapt_existing' | 'create_new';
  newSkillCreated?: string;
  executionSuccess: boolean;
  createdAt: Date;
}

// ── Usage Daily ─────────────────────────────────────
export interface IUsageDaily {
  _id: string;
  tenantId: string;
  date: string;
  tasks: {
    total: number;
    byStatus: {
      completed: number;
      failed: number;
    };
  };
  tokens: {
    total: number;
    input: number;
    output: number;
    byProvider: {
      anthropic: number;
      openai: number;
      google: number;
      ollama: number;
    };
  };
  cost: {
    estimated: number;
    byProvider: {
      anthropic: number;
      openai: number;
      google: number;
    };
  };
  skills: {
    created: number;
    cacheHits: number;
    cacheMisses: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// ── API Key (v2) ────────────────────────────────────
export interface IApiKey {
  _id: string;
  tenantId: string;
  userId: string;
  name: string;
  prefix: string;
  hash: string;
  permissions: string[];
  rateLimit: number;
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  revokedAt?: Date;
}

// ── Credential ──────────────────────────────────────
export interface ICredential {
  _id: string;
  tenantId: string;
  userId: string;
  service: string;
  encryptedKey: string;
  iv: string;
  maskedKey: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Workflow ────────────────────────────────────────

export interface IWorkflowParameter {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  label: string;
  description?: string;
  options?: string[];
}

export type WorkflowStatus = 'active' | 'paused' | 'completed' | 'failed' | 'draft';

export interface IWorkflow {
  _id: string;
  tenantId: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  skillId?: string;
  skillName?: string;
  schedule?: string;
  parameters: IWorkflowParameter[];
  stats: {
    runCount: number;
    successRate: number;
    avgDurationMs: number;
    lastRunAt?: Date;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ── Workflow Run ────────────────────────────────────

export type WorkflowRunStatus = 'success' | 'failed' | 'running' | 'cancelled';

export interface IWorkflowRun {
  _id: string;
  workflowId: string;
  tenantId: string;
  status: WorkflowRunStatus;
  startedAt: Date;
  completedAt?: Date;
  durationMs: number;
  output?: string;
  error?: string;
  triggeredBy: 'schedule' | 'manual';
}

// ── Conversation ────────────────────────────────────

export interface IConversationFile {
  name: string;
  type: string;
  size: number;
  content?: string;
}

export interface IConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  files?: IConversationFile[];
  timestamp: Date;
}

export interface IConversation {
  _id: string;
  tenantId: string;
  userId: string;       // conversations are per-user
  title: string;
  messages: IConversationMessage[];
  lastTaskId?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
