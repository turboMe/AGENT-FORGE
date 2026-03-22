# AgentForge — API Design

> **Version:** 1.0  
> **Date:** 2026-03-21  
> **Author:** blueprint-architect  
> **Status:** Draft — Awaiting Review

---

## 1. API Overview

- **Framework:** Fastify 5.x
- **Protocol:** REST over HTTPS
- **Format:** JSON (request & response)
- **Versioning:** URL-based (`/api/v1/...`)
- **Auth:** Firebase JWT Bearer tokens
- **Validation:** Zod schemas (compile to JSON Schema for Fastify)
- **Docs:** Auto-generated OpenAPI 3.1 via `@fastify/swagger`

### Base URL

```
Production:  https://api.agentforge.dev/api/v1
Staging:     https://staging-api.agentforge.dev/api/v1
Local:       http://localhost:3000/api/v1
```

---

## 2. Authentication

### 2.1 Token Format

All authenticated endpoints require:

```
Authorization: Bearer <firebase-id-token>
```

### 2.2 Auth Middleware

```typescript
// Fastify preHandler hook
async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new UnauthorizedError('Missing token');
  
  const decoded = await firebaseAdmin.auth().verifyIdToken(token);
  req.user = {
    uid: decoded.uid,
    email: decoded.email,
    tenantId: decoded.tenantId,  // custom claim
    tier: decoded.tier || 'free', // 'free' | 'pro' | 'team' | 'agency'
  };
}
```

### 2.3 API Keys (M2M — v2)

For programmatic access (CI/CD, integrations):

```
X-API-Key: af_live_xxxxxxxxxxxxxxxxxxxx
```

API keys are tenant-scoped, stored hashed in MongoDB, with per-key rate limits.

---

## 3. Standard Response Envelope

### Success

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-03-21T19:00:00Z",
    "latencyMs": 1243
  }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You've exceeded 20 tasks/day on the free tier.",
    "details": {
      "limit": 20,
      "used": 20,
      "resetsAt": "2026-03-22T00:00:00Z"
    }
  },
  "meta": {
    "requestId": "req_abc124",
    "timestamp": "2026-03-21T19:00:01Z"
  }
}
```

### Error Codes

| HTTP | Code | When |
|------|------|------|
| 400 | `VALIDATION_ERROR` | Invalid request body |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Insufficient tier / wrong tenant |
| 404 | `NOT_FOUND` | Resource doesn't exist |
| 409 | `CONFLICT` | Duplicate resource |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
| 502 | `LLM_UNAVAILABLE` | All LLM providers down |
| 504 | `LLM_TIMEOUT` | LLM response too slow |

---

## 4. Endpoints

### 4.1 Tasks — Core Pipeline

#### `POST /api/v1/tasks`

Submit a task for execution through the full pipeline.

**Auth:** Required  
**Rate Limit:** Tier-dependent (see architecture.md)

**Request:**

```json
{
  "task": "Write a professional cold email to a restaurant owner in Reykjavik",
  "options": {
    "model": "auto",              // "auto" | "claude" | "gpt" | "gemini"
    "quality": "balanced",        // "fast" | "balanced" | "best"
    "forceNewSkill": false,       // Skip skill search, always create new
    "language": "en",             // Output language
    "context": {                  // Optional additional context
      "industry": "HoReCa",
      "tone": "professional"
    }
  }
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "taskId": "task_abc123",
    "result": "Subject: Save 4 hours every week on supplier orders\n\nHi [Name],\n\n...",
    "routing": {
      "skillUsed": "cold-outreach-writer",
      "matchScore": 0.92,
      "action": "use_existing",
      "model": "claude-sonnet-4-5-20250929",
      "tokensUsed": 847,
      "latencyMs": 2341
    }
  }
}
```

**Response (202) — Async mode (complex tasks):**

```json
{
  "success": true,
  "data": {
    "taskId": "task_def456",
    "status": "processing",
    "pollUrl": "/api/v1/tasks/task_def456"
  }
}
```

---

#### `GET /api/v1/tasks/:taskId`

Get task status and result (for async tasks).

**Response (200):**

```json
{
  "success": true,
  "data": {
    "taskId": "task_def456",
    "status": "completed",        // "processing" | "completed" | "failed"
    "result": "...",
    "routing": { ... },
    "createdAt": "2026-03-21T19:00:00Z",
    "completedAt": "2026-03-21T19:00:03Z"
  }
}
```

---

#### `GET /api/v1/tasks`

List user's task history.

**Query params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `status` | string | — | Filter: `completed`, `failed`, `processing` |
| `skillId` | string | — | Filter by skill used |
| `from` | ISO date | — | Start date filter |
| `to` | ISO date | — | End date filter |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "tasks": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 47,
      "totalPages": 3
    }
  }
}
```

---

### 4.2 Skills — Skill Library Management

#### `GET /api/v1/skills`

List skills available to the tenant.

**Query params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |
| `domain` | string | — | Filter by domain tag |
| `pattern` | string | — | Filter by pattern type |
| `search` | string | — | Full-text search |
| `sort` | string | `use_count` | Sort: `use_count`, `created_at`, `avg_satisfaction` |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "skills": [
      {
        "id": "skill_abc123",
        "name": "cold-outreach-writer",
        "description": "Generates personalized cold outreach emails...",
        "domain": ["sales", "email", "HoReCa"],
        "pattern": "negotiator+creator",
        "personaSummary": "B2B sales copywriter specialized in HoReCa...",
        "stats": {
          "useCount": 14,
          "avgSatisfaction": 4.2,
          "lastUsed": "2026-03-21T18:30:00Z"
        },
        "isSystem": false,
        "isPublic": false,
        "createdAt": "2026-03-21T12:58:46Z"
      }
    ],
    "pagination": { ... }
  }
}
```

---

#### `GET /api/v1/skills/:skillId`

Get full skill details including the prompt template.

---

#### `POST /api/v1/skills`

Manually create a custom skill.

**Request:**

```json
{
  "name": "weekly-report-generator",
  "description": "Generates weekly progress reports from bullet points",
  "domain": ["reporting", "management"],
  "pattern": "processor",
  "template": {
    "persona": "Senior project manager with 15 years experience...",
    "process": ["Parse input bullets", "Group by category", "Write narrative"],
    "outputFormat": "markdown",
    "constraints": ["Never exceed 500 words", "Always include action items"]
  }
}
```

---

#### `PUT /api/v1/skills/:skillId`

Update an existing skill.

---

#### `DELETE /api/v1/skills/:skillId`

Delete a skill (soft delete — sets `deletedAt`).

---

#### `POST /api/v1/skills/:skillId/rate`

Rate a skill after use.

**Request:**

```json
{
  "taskId": "task_abc123",
  "rating": 4,         // 1-5
  "feedback": "Good structure, but tone was too formal"
}
```

---

### 4.3 User & Tenant Management

#### `GET /api/v1/me`

Get current user profile.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "uid": "firebase_uid_123",
    "email": "user@example.com",
    "displayName": "Patryk",
    "tenant": {
      "id": "tenant_abc",
      "name": "My Workspace",
      "tier": "pro",
      "usage": {
        "tasksToday": 12,
        "tasksLimit": 200,
        "tokensToday": 45000,
        "tokensLimit": 500000
      }
    },
    "createdAt": "2026-03-01T00:00:00Z"
  }
}
```

---

#### `PATCH /api/v1/me`

Update user profile.

---

#### `GET /api/v1/me/usage`

Get detailed usage statistics.

**Query params:** `period` = `today` | `week` | `month`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "period": "week",
    "tasks": {
      "total": 47,
      "byDay": [5, 8, 12, 3, 7, 6, 6],
      "bySkill": [
        { "skillId": "skill_abc", "name": "cold-outreach-writer", "count": 14 },
        { "skillId": "skill_def", "name": "food-cost-analyst", "count": 8 }
      ]
    },
    "tokens": {
      "total": 234000,
      "byModel": {
        "claude-sonnet-4-5": 180000,
        "gpt-4o-mini": 54000
      }
    },
    "cost": {
      "estimated": 2.34,
      "currency": "USD"
    }
  }
}
```

---

#### `GET /api/v1/me/api-keys` (v2)

List API keys for M2M access.

#### `POST /api/v1/me/api-keys` (v2)

Create a new API key.

#### `DELETE /api/v1/me/api-keys/:keyId` (v2)

Revoke an API key.

---

### 4.4 Decisions — Audit Trail

#### `GET /api/v1/decisions`

List routing decisions for the tenant.

**Query params:** `page`, `limit`, `from`, `to`, `action` (`use_existing`, `adapt_existing`, `create_new`)

---

### 4.5 Health & Meta

#### `GET /api/v1/health`

**Auth:** None  
**Rate Limit:** None

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 86400,
  "services": {
    "database": "connected",
    "letta": "connected",
    "llm": {
      "claude": "available",
      "gpt": "available",
      "gemini": "degraded"
    }
  }
}
```

---

#### `GET /api/v1/health/ready`

Kubernetes/Cloud Run readiness probe (returns 200 or 503).

#### `GET /api/v1/health/live`

Liveness probe (returns 200 if process is running).

---

## 5. Rate Limiting Strategy

### Implementation

```typescript
// Fastify plugin
app.register(rateLimitPlugin, {
  global: true,
  max: (req) => {
    const tierLimits = { free: 10, pro: 30, team: 60, agency: 120 };
    return tierLimits[req.user?.tier || 'free'];
  },
  timeWindow: '1 minute',
  keyGenerator: (req) => req.user?.uid || req.ip,
  errorResponseBuilder: (req, context) => ({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Rate limit exceeded. Try again in ${context.after}`,
      details: { retryAfter: context.after }
    }
  })
});
```

### Usage Quotas (Separate from Rate Limits)

Daily task and token quotas tracked in MongoDB per tenant. Checked in middleware before task execution.

```typescript
// Usage quota middleware
async function checkUsageQuota(req: FastifyRequest) {
  const usage = await UsageService.getTodayUsage(req.user.tenantId);
  const limits = TIER_LIMITS[req.user.tier];
  
  if (usage.tasks >= limits.tasksPerDay) {
    throw new QuotaExceededError('tasks', limits.tasksPerDay, usage.tasks);
  }
  if (usage.tokens >= limits.tokensPerDay) {
    throw new QuotaExceededError('tokens', limits.tokensPerDay, usage.tokens);
  }
}
```

---

## 6. Request Lifecycle

```
1. Request received
2. → Fastify lifecycle: onRequest
3.   → CORS check
4.   → Request ID generation (x-request-id)
5. → Fastify lifecycle: preValidation
6.   → Firebase JWT verification
7.   → Rate limit check
8. → Fastify lifecycle: preHandler
9.   → Usage quota check (task endpoints only)
10.  → Zod schema validation
11. → Route handler
12.  → Business logic execution
13. → Fastify lifecycle: preSerialization
14.  → Response envelope wrapping
15. → Fastify lifecycle: onSend
16.  → Usage tracking (async, non-blocking)
17.  → Access logging
18. → Response sent
```

---

## 7. WebSocket / SSE (v2)

For real-time task execution streaming:

```
GET /api/v1/tasks/:taskId/stream
Accept: text/event-stream

event: token
data: {"content": "Subject: "}

event: token
data: {"content": "Save 4 hours"}

event: routing
data: {"skillUsed": "cold-outreach-writer", "matchScore": 0.92}

event: complete
data: {"taskId": "task_abc", "tokensUsed": 847}
```

---

## 8. OpenAPI Spec Generation

Auto-generated from Fastify route schemas:

```typescript
app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'AgentForge API',
      version: '1.0.0',
      description: 'Self-Evolving Agent Ecosystem API',
    },
    servers: [
      { url: 'https://api.agentforge.dev/api/v1', description: 'Production' },
      { url: 'https://staging-api.agentforge.dev/api/v1', description: 'Staging' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'Firebase JWT',
        }
      }
    }
  }
});

app.register(fastifySwaggerUi, {
  routePrefix: '/docs',
});
```
