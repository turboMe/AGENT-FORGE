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
