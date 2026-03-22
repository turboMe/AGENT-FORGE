# AgentForge — Data Model

> **Version:** 1.0  
> **Date:** 2026-03-21  
> **Author:** blueprint-architect  
> **Status:** Draft — Awaiting Review

---

## 1. Database Strategy

- **Engine:** MongoDB Atlas (M0 → M2 → M5 scaling path)
- **ODM:** Mongoose 8.x with TypeScript
- **Database name:** `agentforge` (staging: `agentforge_staging`)
- **Multi-tenancy:** Shared database, shared collections, row-level isolation via `tenantId`
- **Timestamps:** All collections use `{ timestamps: true }` (auto `createdAt`, `updatedAt`)
- **Soft deletes:** `deletedAt: Date | null` — never hard-delete user data

---

## 2. Collections

### 2.1 `tenants`

Organizations / workspaces. Every user belongs to a tenant.

```typescript
interface ITenant {
  _id: ObjectId;
  name: string;                    // "Patryk's Workspace"
  slug: string;                    // "patryks-workspace" (unique)
  ownerId: string;                 // Firebase UID of owner
  tier: 'free' | 'pro' | 'team' | 'agency';
  
  // Usage limits (overrides defaults per tier)
  limits: {
    tasksPerDay: number;           // Default: 20 (free), 100 (pro), 500 (team), unlimited (agency)
    tokensPerDay: number;          // Default: 50k (free), 250k (pro), 1M (team), unlimited (agency)
    maxSkills: number;             // Default: 10 (free), 50 (pro), 200 (team), unlimited (agency)
    maxApiKeys: number;            // Default: 0 (free), 3 (pro), 10 (team), 25 (agency)
  };
  
  // Billing hooks (v2)
  billing?: {
    stripeCustomerId?: string;
    subscriptionId?: string;
    currentPeriodEnd?: Date;
  };
  
  settings: {
    defaultModel: string;          // "auto" | "claude" | "gpt"
    defaultQuality: string;       // "fast" | "balanced" | "best"
    defaultLanguage: string;       // "en"
  };
  
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

**Indexes:**

```javascript
{ slug: 1 }                  // unique
{ ownerId: 1 }               // lookup by Firebase UID
{ 'billing.stripeCustomerId': 1 }  // sparse, for Stripe webhooks
```

---

### 2.2 `users`

User profiles synced from Firebase Auth.

```typescript
interface IUser {
  _id: ObjectId;
  firebaseUid: string;            // Firebase UID (unique)
  email: string;
  displayName?: string;
  photoUrl?: string;
  
  tenantId: ObjectId;             // Ref → tenants
  role: 'owner' | 'member' | 'viewer';
  
  preferences: {
    language: string;              // UI language
    theme: 'light' | 'dark' | 'system';
  };
  
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

**Indexes:**

```javascript
{ firebaseUid: 1 }           // unique, auth lookup
{ tenantId: 1, email: 1 }    // tenant member listing
```

---

### 2.3 `skills`

The skill library — the core asset of the system.

```typescript
interface ISkill {
  _id: ObjectId;
  tenantId: ObjectId;             // Ref → tenants (null = system skill)
  
  // Identity
  name: string;                    // "cold-outreach-writer"
  slug: string;                    // URL-safe name
  description: string;             // Human-readable description
  
  // Classification
  domain: string[];                // ["sales", "email", "HoReCa"]
  pattern: string;                 // "creator" | "analyst" | "negotiator+creator"
  tags: string[];                  // Search tags
  
  // The actual skill definition
  template: {
    persona: string;               // Expert persona description
    process: string[];             // Step-by-step process  
    outputFormat: string;          // Expected output format
    constraints: string[];         // What NOT to do
    examples?: {                   // Few-shot examples
      input: string;
      output: string;
    }[];
    systemPrompt: string;         // Compiled system prompt
  };
  
  // Metadata
  version: number;                 // Incremented on updates
  parentSkillId?: ObjectId;       // If adapted from another skill
  isSystem: boolean;               // System-provided skill (read-only)
  isPublic: boolean;               // Shared in marketplace (v2)
  
  // Stats
  stats: {
    useCount: number;
    totalRatings: number;
    avgSatisfaction: number | null;
    lastUsedAt?: Date;
  };
  
  // Text search
  searchVector?: string;          // Concatenated searchable text
  
  createdBy: string;               // Firebase UID or "system"
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

**Indexes:**

```javascript
{ tenantId: 1, slug: 1 }            // unique per tenant
{ tenantId: 1, domain: 1 }          // domain filtering
{ tenantId: 1, tags: 1 }            // tag search
{ tenantId: 1, 'stats.useCount': -1 } // popular skills sort
{ searchVector: 'text' }            // MongoDB text index for full-text search
{ tenantId: 1, isPublic: 1 }        // marketplace listing
```

---

### 2.4 `tasks`

Every task execution — the audit trail.

```typescript
interface ITask {
  _id: ObjectId;
  taskId: string;                  // Human-readable "task_abc123"
  tenantId: ObjectId;
  userId: string;                  // Firebase UID
  
  // Input
  input: {
    task: string;                  // Original task text
    options: {
      model: string;
      quality: string;
      language: string;
      context?: Record<string, any>;
    };
  };
  
  // Classification
  classification: {
    taskType: 'text' | 'automation';
    domain: string[];
    complexity: 'simple' | 'medium' | 'complex';
    keywords: string[];
  };
  
  // Routing decision
  routing: {
    searchResult: 'exact_match' | 'partial_match' | 'no_match';
    matchScore: number;
    matchedSkillId?: ObjectId;
    actionTaken: 'use_existing' | 'adapt_existing' | 'create_new';
    newSkillId?: ObjectId;        // If new skill was created
  };
  
  // Execution
  execution: {
    model: string;                 // "claude-sonnet-4-5-20250929"
    provider: string;              // "anthropic" | "openai" | "google"
    tokensInput: number;
    tokensOutput: number;
    tokensTotal: number;
    latencyMs: number;
    retries: number;
    costEstimate: number;         // USD
  };
  
  // Output
  result?: string;                 // The generated output
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  
  // Quality
  quality?: {
    autoScore?: number;            // Auto-evaluated 0-1
    userRating?: number;           // User rating 1-5
    userFeedback?: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}
```

**Indexes:**

```javascript
{ taskId: 1 }                              // unique, public ID lookup
{ tenantId: 1, createdAt: -1 }            // task history listing
{ tenantId: 1, status: 1, createdAt: -1 } // filtered listing
{ tenantId: 1, 'routing.matchedSkillId': 1 } // tasks per skill
{ userId: 1, createdAt: -1 }              // user-specific history
{ status: 1, createdAt: 1 }               // async task polling (TTL candidate)
```

**TTL Index (auto-cleanup):**

```javascript
// Auto-delete failed tasks after 30 days
{ createdAt: 1 }, { expireAfterSeconds: 2592000, partialFilterExpression: { status: 'failed' } }
```

---

### 2.5 `decisions`

Lightweight routing decision log (mirrors decisions-log.jsonl from PoC).

```typescript
interface IDecision {
  _id: ObjectId;
  tenantId: ObjectId;
  taskId: ObjectId;                // Ref → tasks
  
  timestamp: Date;
  taskSummary: string;
  taskType: 'text' | 'automation';
  domain: string[];
  complexity: 'simple' | 'medium' | 'complex';
  searchKeywords: string[];
  searchResult: 'exact_match' | 'partial_match' | 'no_match';
  matchedSkillId?: ObjectId;
  matchScore: number;
  actionTaken: 'use_existing' | 'adapt_existing' | 'create_new';
  newSkillCreated?: ObjectId;
  executionSuccess: boolean;
  
  createdAt: Date;
}
```

**Indexes:**

```javascript
{ tenantId: 1, createdAt: -1 }       // decision history
{ tenantId: 1, actionTaken: 1 }      // analytics: how often new vs cached
{ tenantId: 1, matchScore: 1 }       // match score distribution
```

---

### 2.6 `usage_daily`

Daily usage aggregates per tenant (for quota enforcement and billing).

```typescript
interface IUsageDaily {
  _id: ObjectId;
  tenantId: ObjectId;
  date: string;                    // "2026-03-21" (YYYY-MM-DD)
  
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
    estimated: number;             // USD
    byProvider: {
      anthropic: number;
      openai: number;
      google: number;
    };
  };
  
  skills: {
    created: number;
    cacheHits: number;             // exact_match usage
    cacheMisses: number;           // no_match → new creation
  };
  
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**

```javascript
{ tenantId: 1, date: 1 }       // unique compound, daily lookup
```

**Update pattern (atomic increment):**

```typescript
await UsageDaily.findOneAndUpdate(
  { tenantId, date: todayString },
  {
    $inc: {
      'tasks.total': 1,
      'tasks.byStatus.completed': 1,
      'tokens.total': tokensUsed,
      'tokens.input': tokensInput,
      'tokens.output': tokensOutput,
      [`tokens.byProvider.${provider}`]: tokensUsed,
      'cost.estimated': costEstimate,
      'skills.cacheHits': isCache ? 1 : 0,
    },
    $setOnInsert: { tenantId, date: todayString, createdAt: new Date() },
  },
  { upsert: true, new: true }
);
```

---

### 2.7 `api_keys` (v2)

```typescript
interface IApiKey {
  _id: ObjectId;
  tenantId: ObjectId;
  userId: string;                  // Firebase UID of creator
  
  name: string;                    // "Production API Key"
  prefix: string;                  // "af_live_xxxx" (first 12 chars for display)
  hash: string;                    // SHA-256 hash of full key
  
  permissions: string[];           // ["tasks:create", "skills:read"]
  
  rateLimit: number;               // Override per-key rate limit
  lastUsedAt?: Date;
  expiresAt?: Date;
  
  createdAt: Date;
  revokedAt?: Date;
}
```

**Indexes:**

```javascript
{ hash: 1 }                       // unique, key lookup
{ tenantId: 1 }                   // list keys per tenant
{ expiresAt: 1 }                  // TTL for auto-expired keys
```

---

## 3. Entity Relationships

```
tenants (1) ──────────── (N) users
   │
   ├── (1) ──────────── (N) skills
   │                          │
   │                          ├── parentSkillId ──→ skills (self-ref)
   │                          │
   ├── (1) ──────────── (N) tasks
   │                          │
   │                          ├── routing.matchedSkillId ──→ skills
   │                          ├── routing.newSkillId ──→ skills
   │                          │
   ├── (1) ──────────── (N) decisions
   │                          │
   │                          ├── taskId ──→ tasks
   │                          ├── matchedSkillId ──→ skills
   │                          ├── newSkillCreated ──→ skills
   │                          │
   ├── (1) ──────────── (N) usage_daily
   │
   └── (1) ──────────── (N) api_keys
```

---

## 4. Migration from PoC

The current PoC uses flat files:

| PoC File | Production Collection |
|----------|-----------------------|
| `skill-index.json` | `skills` |
| `decisions-log.jsonl` | `decisions` |
| `skills/*/SKILL.md` | `skills.template` (parsed YAML + markdown) |

### Migration Script

```typescript
// migrate-poc-to-production.ts
async function migratePoCData(tenantId: ObjectId) {
  // 1. Parse skill-index.json
  const index = JSON.parse(await readFile('.agents/memory/skill-index.json', 'utf8'));
  
  for (const skill of index.skills) {
    // 2. Read SKILL.md, parse YAML frontmatter + markdown body
    const skillContent = await readFile(skill.file_path.replace('~/', ''));
    const { frontmatter, body } = parseSkillFile(skillContent);
    
    // 3. Insert into skills collection
    await Skill.create({
      tenantId,
      name: skill.name,
      slug: skill.name,
      description: skill.description,
      domain: skill.domain,
      pattern: skill.pattern,
      tags: skill.tags,
      template: {
        persona: extractPersona(body),
        process: extractProcess(body),
        outputFormat: extractFormat(body),
        constraints: extractConstraints(body),
        systemPrompt: body,
      },
      version: 1,
      isSystem: false,
      isPublic: false,
      stats: {
        useCount: skill.use_count,
        totalRatings: 0,
        avgSatisfaction: skill.avg_satisfaction,
        lastUsedAt: skill.last_used ? new Date(skill.last_used) : undefined,
      },
      createdBy: 'migration',
      createdAt: new Date(skill.created_at),
    });
  }
  
  // 4. Parse decisions-log.jsonl → decisions collection
  const logLines = (await readFile('.agents/memory/decisions-log.jsonl', 'utf8'))
    .split('\n').filter(Boolean).map(JSON.parse);
  
  for (const decision of logLines) {
    await Decision.create({
      tenantId,
      timestamp: new Date(decision.timestamp),
      taskSummary: decision.task_summary,
      taskType: decision.task_type,
      domain: decision.classified_domain,
      complexity: decision.complexity,
      searchKeywords: decision.search_keywords,
      searchResult: decision.search_result,
      matchScore: decision.match_score,
      actionTaken: decision.action_taken,
      executionSuccess: decision.execution_success,
    });
  }
}
```

---

## 5. Data Validation (Zod Schemas)

```typescript
import { z } from 'zod';

export const CreateTaskSchema = z.object({
  task: z.string().min(1).max(10000),
  options: z.object({
    model: z.enum(['auto', 'claude', 'gpt', 'gemini']).default('auto'),
    quality: z.enum(['fast', 'balanced', 'best']).default('balanced'),
    forceNewSkill: z.boolean().default(false),
    language: z.string().length(2).default('en'),
    context: z.record(z.string()).optional(),
  }).optional(),
});

export const CreateSkillSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().min(10).max(1000),
  domain: z.array(z.string()).min(1).max(10),
  pattern: z.string(),
  template: z.object({
    persona: z.string().min(10),
    process: z.array(z.string()).min(1),
    outputFormat: z.string(),
    constraints: z.array(z.string()),
    examples: z.array(z.object({
      input: z.string(),
      output: z.string(),
    })).optional(),
  }),
});

export const RateSkillSchema = z.object({
  taskId: z.string(),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(1000).optional(),
});
```

---

## 6. Backup & Recovery

| Strategy | Implementation |
|----------|---------------|
| **Continuous backup** | MongoDB Atlas continuous backup (enabled on M2+) |
| **Point-in-time restore** | Atlas PITR — restore to any second in last 7 days |
| **Daily snapshot** | Atlas daily snapshot retention: 7 days |
| **Export** | Weekly `mongoexport` to Cloud Storage (automated via GitHub Actions) |
| **Skills backup** | Skills are also exportable as SKILL.md files (reversible migration) |
