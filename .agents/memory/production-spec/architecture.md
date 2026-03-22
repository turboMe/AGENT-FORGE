# AgentForge — Production Architecture

> **Version:** 1.0  
> **Date:** 2026-03-21  
> **Author:** blueprint-architect  
> **Status:** Draft — Awaiting Review

---

## 1. System Overview

AgentForge is a **self-evolving agent ecosystem** that automatically creates, retrieves, and improves specialized AI agents. The core loop:

1. User submits a task via REST API
2. Orchestrator classifies the task and searches the Skill Library  
3. If a matching skill exists → execute it. If not → Prompt Architect creates one
4. Task executes through the matched/created skill using the LLM Gateway
5. Result is delivered. Skill is persisted. Metrics are logged
6. System improves over time: low-performing skills are flagged, adapted, or retired

### Design Principles

| # | Principle | Implication |
|---|-----------|-------------|
| 1 | **Solo-developer maintainable** | No Kubernetes. Minimal infrastructure. Everything runnable locally with `docker compose up` |
| 2 | **Monetization-ready** | Multi-tenant from day 1. Usage tracking per user. Tier-based gating |
| 3 | **Cost-optimized** | Cloud Run with scale-to-zero. Cheapest capable LLM per task. MongoDB Atlas shared tier |
| 4 | **Graceful degradation** | Every external dependency has timeout, retry, circuit breaker, and fallback |
| 5 | **Build on what exists** | MongoDB Atlas, Cloud Run, Firebase Auth, pnpm — all proven in GastroBridge |

---

## 2. Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                  │
│   Web UI (React/Next.js)  │  CLI  │  REST API consumers        │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY (Fastify)                        │
│  packages/api                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │  Auth    │ │  Rate    │ │  Usage   │ │  Request         │  │
│  │  Guard   │ │  Limiter │ │  Tracker │ │  Validator       │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
┌──────────────────┐ ┌──────────────┐ ┌─────────────────┐
│   ORCHESTRATOR   │ │  SKILL MGMT  │ │   USER/TENANT   │
│  packages/       │ │  packages/   │ │   MANAGEMENT    │
│  orchestrator    │ │  skill-      │ │   packages/api  │
│                  │ │  library     │ │   (routes)      │
│ • Task classify  │ │              │ │                 │
│ • Route decide   │ │ • CRUD       │ │ • Profiles      │
│ • Execute flow   │ │ • Search     │ │ • API keys      │
│ • Quality check  │ │ • Index      │ │ • Usage quotas  │
│ • Decision log   │ │ • Stats      │ │ • Billing hooks │
└────────┬─────────┘ └──────┬───────┘ └─────────────────┘
         │                   │
         ▼                   ▼
┌──────────────────────────────────────────────────────────────┐
│                    CORE SERVICES LAYER                        │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │   LLM GATEWAY    │  │ PROMPT ARCHITECT │                 │
│  │   packages/      │  │ packages/        │                 │
│  │   llm-gateway    │  │ prompt-architect │                 │
│  │                  │  │                  │                 │
│  │ • Multi-model    │  │ • Skill creation │                 │
│  │ • Cost routing   │  │ • Skill adapt    │                 │
│  │ • Token tracking │  │ • Pattern match  │                 │
│  │ • Retry/fallback │  │ • Quality eval   │                 │
│  └──────────────────┘  └──────────────────┘                 │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │   MEMORY (Letta) │  │   SHARED/TYPES   │                 │
│  │   packages/      │  │   packages/      │                 │
│  │   memory         │  │   shared         │                 │
│  │                  │  │                  │                 │
│  │ • Context window │  │ • TS interfaces  │                 │
│  │ • Session memory │  │ • Validators     │                 │
│  │ • Long-term mem  │  │ • Constants      │                 │
│  │ • Memory search  │  │ • Error types    │                 │
│  └──────────────────┘  └──────────────────┘                 │
└──────────────────────────────────────────────────────────────┘
         │                   │
         ▼                   ▼
┌──────────────────────────────────────────────────────────────┐
│                    DATA & EXTERNAL SERVICES                   │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ MongoDB Atlas│  │ Firebase Auth│  │ LLM APIs          │  │
│  │ (primary DB) │  │ (authn)      │  │ Claude / GPT /    │  │
│  │              │  │              │  │ Gemini / Ollama   │  │
│  └──────────────┘  └──────────────┘  └───────────────────┘  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │ Letta Server │  │ n8n (v2)     │                         │
│  │ (Docker)     │  │ (tool exec)  │                         │
│  └──────────────┘  └──────────────┘                         │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Monorepo Structure

```
AGENT-FORGE/
├── packages/
│   ├── api/                    # REST API — Fastify server
│   │   ├── src/
│   │   │   ├── routes/         # Route handlers by domain
│   │   │   ├── middleware/     # Auth, rate-limit, usage-tracking
│   │   │   ├── plugins/       # Fastify plugins (mongo, auth, etc.)
│   │   │   └── server.ts      # Entry point
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── orchestrator/           # Task routing and execution engine
│   │   ├── src/
│   │   │   ├── classifier.ts      # Task classification (NLP-based)
│   │   │   ├── router.ts          # Routing decision engine
│   │   │   ├── executor.ts        # Skill execution runtime
│   │   │   ├── quality-checker.ts # Output quality scoring
│   │   │   └── decision-logger.ts # Decision audit trail
│   │   └── package.json
│   │
│   ├── skill-library/          # Skill CRUD, search, indexing
│   │   ├── src/
│   │   │   ├── repository.ts      # MongoDB-backed storage
│   │   │   ├── search.ts          # Semantic + keyword search
│   │   │   ├── indexer.ts         # Skill indexing pipeline
│   │   │   └── stats.ts           # Usage statistics tracker
│   │   └── package.json
│   │
│   ├── llm-gateway/            # Multi-model LLM abstraction
│   │   ├── src/
│   │   │   ├── providers/         # Claude, GPT, Gemini, Ollama adapters
│   │   │   ├── router.ts          # Model selection (cost/quality)
│   │   │   ├── token-tracker.ts   # Usage & billing tracking
│   │   │   └── circuit-breaker.ts # Fault tolerance
│   │   └── package.json
│   │
│   ├── prompt-architect/       # Automatic skill creation & adaptation
│   │   ├── src/
│   │   │   ├── creator.ts         # New skill generation
│   │   │   ├── adapter.ts         # Existing skill adaptation
│   │   │   ├── patterns.ts        # 8 expert pattern templates
│   │   │   └── evaluator.ts       # Skill quality evaluation
│   │   └── package.json
│   │
│   ├── memory/                 # Letta integration for persistent memory
│   │   ├── src/
│   │   │   ├── client.ts          # Letta REST API client
│   │   │   ├── session.ts         # Session memory management
│   │   │   └── search.ts          # Memory retrieval
│   │   └── package.json
│   │
│   └── shared/                 # Shared types, utilities, constants
│       ├── src/
│       │   ├── types/             # TypeScript interfaces
│       │   ├── errors/            # Custom error classes
│       │   ├── validators/        # Zod schemas
│       │   └── constants.ts       # System-wide constants
│       └── package.json
│
│
│   └── web/                    # Web UI (v2 — Next.js)
│       └── ...
│
├── docker/
│   ├── docker-compose.yml      # Local dev: Letta + MongoDB + n8n
│   ├── docker-compose.prod.yml # Prod: service orchestration
│   └── letta/
│       └── Dockerfile          # Custom Letta config
│
├── .github/
│   └── workflows/
│       ├── ci.yml              # Lint + type-check + test
│       ├── deploy-staging.yml  # Deploy to staging Cloud Run
│       └── deploy-prod.yml    # Deploy to prod Cloud Run (manual)
│
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .env.example
└── package.json
```

---

## 4. Data Flow — Task Execution

```
┌──────┐
│Client│
└──┬───┘
   │ POST /api/v1/tasks
   ▼
┌──────────────────────────────┐
│ API Gateway                  │
│ 1. Validate Firebase JWT     │
│ 2. Check rate limits         │
│ 3. Check usage quota         │
│ 4. Parse & validate body     │
└──────────┬───────────────────┘
           │ TaskInput { task, options? }
           ▼
┌──────────────────────────────┐
│ Orchestrator                 │
│ 1. CLASSIFY task             │
│    → domain, complexity,     │
│      keywords, task_type     │
│                              │
│ 2. SEARCH skill library      │──── Skill Library ──── MongoDB
│    → match_score, skill?     │        (search)
│                              │
│ 3. DECIDE routing            │
│    score >= 0.90 → use       │
│    score 0.65-0.89 → adapt   │
│    score < 0.65 → create     │
└──────────┬───────────────────┘
           │
    ┌──────┴──────┐
    ▼             ▼
 [EXISTING]    [CREATE NEW]
    │             │
    │      ┌──────▼──────────┐
    │      │ Prompt Architect │
    │      │ → new skill YAML │
    │      │ → save to DB     │
    │      └──────┬──────────┘
    │             │
    └──────┬──────┘
           │ skill loaded
           ▼
┌──────────────────────────────┐
│ Executor                     │
│ 1. Build LLM prompt from    │
│    skill template + task     │
│ 2. Select model via          │
│    LLM Gateway (cost/qual)  │
│ 3. Call LLM                  │
│ 4. Parse response            │
│ 5. Quality check             │
│    → retry if score < 0.7    │
└──────────┬───────────────────┘
           │
           ▼ (parallel)
┌────────────────┐  ┌────────────────┐  ┌──────────────┐
│ Decision Logger│  │ Usage Tracker  │  │ Skill Stats  │
│ → decisions    │  │ → user_usage   │  │ → use_count  │
│   collection   │  │   collection   │  │   +1         │
└────────────────┘  └────────────────┘  └──────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Response to Client           │
│ { result, meta: {           │
│     skill_used, model,      │
│     tokens, latency_ms      │
│   }                          │
│ }                            │
└──────────────────────────────┘
```

---

## 5. Deployment Topology

```
┌─────────────────────────────────────────────────────────┐
│                   Google Cloud Platform                  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │           Cloud Run (Managed)                    │   │
│  │                                                  │   │
│  │  ┌────────────────┐  ┌────────────────────────┐ │   │
│  │  │ agentforge-api │  │ agentforge-api         │ │   │
│  │  │ (staging)      │  │ (production)           │ │   │
│  │  │ min=0, max=3   │  │ min=0, max=10         │ │   │
│  │  │ 512MB / 1 CPU  │  │ 1GB / 1 CPU           │ │   │
│  │  └────────────────┘  └────────────────────────┘ │   │
│  │                                                  │   │
│  │  ┌────────────────────────────────────────────┐ │   │
│  │  │ letta-server                               │ │   │
│  │  │ (sidecar or separate Cloud Run service)    │ │   │
│  │  │ min=0, max=2 | 1GB / 1 CPU                │ │   │
│  │  └────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────┐  ┌──────────────────────────────┐    │
│  │ Cloud Build  │  │ Artifact Registry            │    │
│  │ (CI trigger) │  │ (Docker images)              │    │
│  └──────────────┘  └──────────────────────────────┘    │
│                                                         │
│  ┌──────────────┐                                      │
│  │ Secret Mgr   │ ← API keys, tokens, credentials     │
│  └──────────────┘                                      │
└─────────────────────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────┐
│ MongoDB Atlas    │  │ Firebase Auth    │
│ (M0/M2 cluster)  │  │ (Google managed) │
│ europe-west1     │  │                  │
└──────────────────┘  └──────────────────┘

┌──────────────────────────────────────────┐
│ External LLM APIs                        │
│ Anthropic │ OpenAI │ Google AI │ Ollama  │
│ (primary)  (fallback) (option)  (local)  │
└──────────────────────────────────────────┘
```

### Environment Strategy

| Environment | Purpose | Cloud Run Min Instances | MongoDB Tier |
|-------------|---------|------------------------|--------------|
| `local`     | Development | — (docker compose) | Local container or Atlas free |
| `staging`   | Pre-prod testing, PR previews | 0 | Atlas M0 (free) |
| `production`| Live traffic | 0 (scale-to-zero) | Atlas M2/M5 |

---

## 6. Cross-Cutting Concerns

### 6.1 Authentication & Authorization

```
Client → Firebase Auth → JWT token
  ↓
API Gateway → Verify Firebase JWT → Extract uid + custom claims
  ↓
Middleware → Resolve tenant (from custom claims or user.tenantId)
  ↓
Route handler → Tenant-scoped data access
```

- **AuthN:** Firebase Auth (email/password, Google, GitHub OAuth)
- **AuthZ:** Role-based (free / pro / team / agency) via Firebase custom claims
- Multi-tenant: Every DB query includes `tenantId` filter

### 6.2 Rate Limiting

| Tier    | Requests/min | Tasks/day | LLM tokens/day |
|---------|-------------|-----------|-----------------|
| Free    | 10          | 20        | 50,000          |
| Pro     | 30          | 100       | 250,000         |
| Team    | 60          | 500       | 1,000,000       |
| Agency  | 120         | unlimited | unlimited       |

Implementation: Fastify `@fastify/rate-limit` with Redis-compatible store (or in-memory for initial launch).

### 6.3 Error Handling Strategy

Every component follows the circuit-breaker pattern:

```typescript
interface ServiceConfig {
  timeout_ms: number;        // Max wait time
  retry_count: number;       // Max retries
  retry_delay_ms: number;    // Base delay (exponential backoff)
  circuit_threshold: number; // Failures before circuit opens
  circuit_reset_ms: number;  // Time before half-open retry
  fallback: () => Promise<any>; // What to do when circuit is open
}
```

| Service | Timeout | Retries | Fallback |
|---------|---------|---------|----------|
| LLM API (Claude) | 30s | 2 | Switch to GPT-4o-mini |
| LLM API (OpenAI) | 30s | 1 | Return error with queue option |
| Letta Memory | 5s | 1 | Skip memory, log warning |
| MongoDB | 5s | 2 | Return cached response if available |
| Skill Search | 2s | 0 | Create new skill (no-match path) |

### 6.4 Observability

- **Structured logging:** Pino (built into Fastify) with JSON output
- **Request tracing:** Correlation ID (`x-request-id`) propagated through all services
- **Metrics:** Custom `/metrics` endpoint — tasks/min, LLM latency, error rate, cache hit ratio
- **Alerts:** Cloud Run native monitoring + Cloud Logging alerts on error spikes

### 6.5 Multi-Tenancy Model

```
Every document in MongoDB includes:
{
  tenantId: ObjectId,  // References tenants collection
  ...domainFields
}

Every query enforced by middleware:
query.tenantId = req.user.tenantId
```

- Shared database, shared collections (row-level isolation)
- Cheap at small scale, migration path to dedicated clusters later
- Index on `tenantId` as prefix on all compound indexes

---

## 7. Technology Decisions & Rationale

| Decision | Choice | Why | Alternative Considered |
|----------|--------|-----|----------------------|
| API Framework | Fastify | Proven fast, plugin ecosystem, familiar from GastroBridge | Express (slower, no schema validation) |
| Database | MongoDB Atlas | Document model fits skill YAML, existing expertise | PostgreSQL (schema overhead for evolving data) |
| Auth | Firebase Auth | Existing, free tier generous, handles OAuth | Auth0 (cost at scale), custom JWT (maintenance) |
| Hosting | Cloud Run | Scale-to-zero = $0 idle cost, familiar | ECS/Fargate (AWS lock-in), VMs (always-on cost) |
| Memory | Letta (MemGPT) | Purpose-built for agent memory, open source | Custom vector DB (build time), Pinecone (cost) |
| Monorepo | pnpm workspaces | Simple, zero-config, native Node.js workspace support | Turborepo (overhead for <10 packages), Nx (heavier), Lerna (outdated) |
| LLM routing | Custom LLM Gateway | Full control over model selection, cost optimization | LangChain (overhead), LiteLLM (less control) |
| Testing | Vitest | Fast, TS-native, ESM support | Jest (slower, config overhead) |
| Validation | Zod | Runtime + static types from one schema | Joi (no TS inference), class-validator (decorators) |

---

## 8. Security Boundaries

```
┌─────────────────────────────────────────────┐
│ TRUST BOUNDARY: Internet                    │
│                                             │
│  Client → HTTPS → Cloud Run (TLS)          │
│                                             │
├─────────────────────────────────────────────┤
│ TRUST BOUNDARY: API Layer                   │
│                                             │
│  Firebase JWT verification                  │
│  Rate limiting                              │
│  Input validation (Zod schemas)             │
│  Request size limits (1MB default)          │
│                                             │
├─────────────────────────────────────────────┤
│ TRUST BOUNDARY: Service Layer               │
│                                             │
│  Tenant isolation (query middleware)        │
│  LLM prompt injection guards               │
│  Skill content sanitization                 │
│  Memory isolation per tenant                │
│                                             │
├─────────────────────────────────────────────┤
│ TRUST BOUNDARY: Data Layer                  │
│                                             │
│  MongoDB Atlas network peering              │
│  Cloud Run → Atlas via private endpoint     │
│  Secrets in Google Secret Manager           │
│  No credentials in code or env files        │
└─────────────────────────────────────────────┘
```

---

## 9. Scalability Path

| Users | Architecture | Monthly Cost Est. |
|-------|-------------|-------------------|
| 0–100 | Single Cloud Run service, Atlas M0, single Letta instance | $5–20 |
| 100–1,000 | Cloud Run auto-scale (max 5), Atlas M2, Letta with persistent volume | $30–80 |
| 1,000–10,000 | Cloud Run max 10+, Atlas M5+, Redis cache, CDN for Web UI | $150–400 |
| 10,000+ | Dedicated Atlas cluster, multiple Cloud Run services, background workers | $500+ |

Cost drivers: **LLM API calls** dominate. Skill cache hit ratio directly reduces costs — every cached skill is a skipped LLM call for skill creation.
