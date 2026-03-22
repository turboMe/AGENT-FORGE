# AgentForge — Implementation Plan

> **Version:** 1.0  
> **Date:** 2026-03-21  
> **Author:** blueprint-architect  
> **Status:** Draft — Awaiting Review

---

## 1. Phasing Strategy

The implementation follows a **layered, bottom-up** approach:  
Foundation → Core Engine → API Layer → Quality & Monitoring → Web UI.

Each phase is a Git feature branch, merged only after passing tests.

```
Phase 0 ▸ Monorepo scaffold          ──── 2 days
Phase 1 ▸ Shared types & validation  ──── 1 day
Phase 2 ▸ LLM Gateway               ──── 3 days
Phase 3 ▸ Skill Library              ──── 3 days
Phase 4 ▸ Prompt Architect           ──── 2 days
Phase 5 ▸ Orchestrator               ──── 3 days
Phase 6 ▸ Memory (Letta)             ──── 2 days
Phase 7 ▸ API Gateway (Fastify)      ──── 4 days
Phase 8 ▸ Auth & Multi-Tenancy       ──── 2 days
Phase 9 ▸ Usage Tracking & Quotas    ──── 2 days
Phase 10 ▸ CI/CD & Deploy            ──── 2 days
Phase 11 ▸ PoC Migration             ──── 1 day
Phase 12 ▸ Web UI (v2)               ──── 5-8 days
                                     ──────────────
Total estimated:                      28-31 days solo
```

---

## 2. Phase Details

### Phase 0: Monorepo Scaffold (2 days)

**Branch:** `feat/monorepo-scaffold`

| # | Task | Output |
|---|------|--------|
| 0.1 | Initialize pnpm workspace | `pnpm-workspace.yaml`, root `package.json` |
| 0.2 | Create all package directories | `packages/{api,orchestrator,skill-library,llm-gateway,prompt-architect,memory,shared,web}` |
| 0.3 | Shared TSConfig | `tsconfig.base.json` + per-package `tsconfig.json` |
| 0.4 | ESLint + Prettier setup | Shared config in root, per-package extends |
| 0.5 | Docker Compose (local dev) | MongoDB + Letta containers |
| 0.6 | `.env.example` | All required env vars documented |
| 0.8 | Vitest config | Global setup, per-package test scripts |

**Checkpoint:** Empty monorepo compiles, lints, and tests pass (zero tests, but pipeline works).

**Dependencies:** None

---

### Phase 1: Shared Package (1 day)

**Branch:** `feat/shared-types`

| # | Task | Output |
|---|------|--------|
| 1.1 | TypeScript interfaces | All interfaces from data-model.md |
| 1.2 | Zod validation schemas | Task input, skill creation, rate params |
| 1.3 | Error classes | `AppError`, `UnauthorizedError`, `NotFoundError`, `QuotaExceededError`, `LLMError` |
| 1.4 | Constants | Tier limits, model configs, default patterns |
| 1.5 | Utility functions | ID generators (`task_xxxx`), date helpers |

**Checkpoint:** All packages can import `@agentforge/shared`.

**Dependencies:** Phase 0

---

### Phase 2: LLM Gateway (3 days)

**Branch:** `feat/llm-gateway`

| # | Task | Output |
|---|------|--------|
| 2.1 | Provider interface | `ILLMProvider` with `generate()`, `stream()` |
| 2.2 | Anthropic adapter | Claude API integration with streaming |
| 2.3 | OpenAI adapter | GPT API integration |
| 2.4 | Ollama adapter (local) | Local model support for dev/testing |
| 2.5 | Model router | Cost/quality-based model selection logic |
| 2.6 | Token tracker | Count tokens per request, per provider |
| 2.7 | Circuit breaker | Per-provider circuit breaker with fallback chain |
| 2.8 | Tests | Unit tests for each adapter (mocked), integration test with Ollama |

**Key interface:**

```typescript
interface ILLMGateway {
  generate(params: {
    prompt: string;
    systemPrompt?: string;
    model?: string;           // "auto" uses router
    quality?: 'fast' | 'balanced' | 'best';
    maxTokens?: number;
    temperature?: number;
  }): Promise<{
    content: string;
    model: string;
    provider: string;
    tokensInput: number;
    tokensOutput: number;
    latencyMs: number;
    costEstimate: number;
  }>;
}
```

**Checkpoint:** Can call Claude, GPT, or Ollama through a single interface.

**Dependencies:** Phase 1

---

### Phase 3: Skill Library (3 days)

**Branch:** `feat/skill-library`

| # | Task | Output |
|---|------|--------|
| 3.1 | Mongoose models | `Skill` model with all indexes from data-model.md |
| 3.2 | Repository layer | CRUD operations with tenant isolation |
| 3.3 | Search engine | Combined keyword + text search with scoring |
| 3.4 | Indexer | Background indexing of `searchVector` field |
| 3.5 | Stats tracker | Atomic `use_count` increment, rating aggregation |
| 3.6 | Skill parser | Parse SKILL.md YAML + markdown into `template` |
| 3.7 | Tests | Repository CRUD, search accuracy, stats updates |

**Key interface:**

```typescript
interface ISkillLibrary {
  search(tenantId: ObjectId, keywords: string[], domain?: string[]): Promise<{
    skill: ISkill | null;
    matchScore: number;
    recommendation: 'use' | 'adapt' | 'create';
  }>;
  save(skill: CreateSkillInput): Promise<ISkill>;
  updateStats(skillId: ObjectId, usage: UsageUpdate): Promise<void>;
}
```

**Checkpoint:** Skills searchable by keyword with match scoring.

**Dependencies:** Phase 1

---

### Phase 4: Prompt Architect (2 days)

**Branch:** `feat/prompt-architect`

| # | Task | Output |
|---|------|--------|
| 4.1 | Pattern library | 8 expert patterns as TypeScript objects |
| 4.2 | Skill creator | Generate new skill from task description via LLM |
| 4.3 | Skill adapter | Modify existing skill for new task context |
| 4.4 | Quality evaluator | Score generated output 0-1 via LLM judge |
| 4.5 | Tests | Skill creation with mocked LLM, pattern matching |

**Dependencies:** Phase 1, Phase 2 (LLM Gateway)

---

### Phase 5: Orchestrator (3 days)

**Branch:** `feat/orchestrator`

| # | Task | Output |
|---|------|--------|
| 5.1 | Task classifier | NLP-based classification (domain, complexity, keywords) |
| 5.2 | Router | Decision engine: search → route → execute flow |
| 5.3 | Executor | Skill execution runtime (prompt assembly + LLM call) |
| 5.4 | Quality checker | Auto-evaluate output, retry if below threshold |
| 5.5 | Decision logger | Write to `decisions` collection |
| 5.6 | Integration tests | Full pipeline: classify → search → create → execute → log |

**Key interface:**

```typescript
interface IOrchestrator {
  executeTask(params: {
    tenantId: ObjectId;
    userId: string;
    task: string;
    options?: TaskOptions;
  }): Promise<{
    taskId: string;
    result: string;
    routing: RoutingResult;
    execution: ExecutionResult;
  }>;
}
```

**Checkpoint:** Full pipeline works end-to-end from classify to result delivery.

**Dependencies:** Phase 2, Phase 3, Phase 4

---

### Phase 6: Memory — Letta Integration (2 days)

**Branch:** `feat/letta-memory`

| # | Task | Output |
|---|------|--------|
| 6.1 | Letta REST client | Connect to Letta Docker container |
| 6.2 | Session management | Create/retrieve memory sessions per user |
| 6.3 | Memory injection | Feed relevant memory into skill execution context |
| 6.4 | Graceful fallback | Skip memory if Letta is down (non-critical) |
| 6.5 | Docker config | Custom Letta Dockerfile with persistence volume |

**Dependencies:** Phase 0 (Docker setup)

**Note:** Memory is a non-critical enhancement. The system works without it — skills execute fine without memory context. Letta adds personalization.

---

### Phase 7: API Gateway — Fastify (4 days)

**Branch:** `feat/api-gateway`

| # | Task | Output |
|---|------|--------|
| 7.1 | Fastify server setup | Server bootstrap, plugins registration |
| 7.2 | Mongoose connection plugin | MongoDB Atlas connection with retry |
| 7.3 | Route handlers — Tasks | POST/GET /tasks endpoints |
| 7.4 | Route handlers — Skills | CRUD /skills endpoints |
| 7.5 | Route handlers — User | GET/PATCH /me, GET /me/usage |
| 7.6 | Route handlers — Health | /health, /health/ready, /health/live |
| 7.7 | Route handlers — Decisions | GET /decisions |
| 7.8 | OpenAPI generation | @fastify/swagger + swagger-ui |
| 7.9 | Error handling | Global error handler, response envelope |
| 7.10 | Integration tests | E2E tests for all endpoints |

**Dependencies:** Phase 5 (Orchestrator), Phase 3 (Skill Library)

---

### Phase 8: Auth & Multi-Tenancy (2 days)

**Branch:** `feat/auth-tenancy`

| # | Task | Output |
|---|------|--------|
| 8.1 | Firebase Admin init | Firebase Admin SDK Fastify plugin |
| 8.2 | JWT verification middleware | Decode + validate Firebase ID tokens |
| 8.3 | Tenant resolution | Resolve tenantId from JWT custom claims or user lookup |
| 8.4 | Tenant isolation middleware | Auto-inject tenantId filter into all queries |
| 8.5 | Role-based guards | `requireTier('pro')`, `requireTier('team')`, `requireRole('owner')` |
| 8.6 | Tests | Auth edge cases, multi-tenant isolation verification |

**Dependencies:** Phase 7 (API Gateway)

---

### Phase 9: Usage Tracking & Quotas (2 days)

**Branch:** `feat/usage-quotas`

| # | Task | Output |
|---|------|--------|
| 9.1 | Usage service | Daily aggregation with atomic increments |
| 9.2 | Quota enforcement middleware | Check limits before task execution |
| 9.3 | Rate limiting plugin | @fastify/rate-limit with tier awareness |
| 9.4 | Usage API endpoints | GET /me/usage with period filtering |
| 9.5 | Tests | Quota enforcement, rate limit behavior |

**Dependencies:** Phase 7, Phase 8

---

### Phase 10: CI/CD & Deployment (2 days)

**Branch:** `feat/cicd`

| # | Task | Output |
|---|------|--------|
| 10.1 | GitHub Actions — CI | Lint + typecheck + test on every PR |
| 10.2 | GitHub Actions — Deploy staging | Auto-deploy to staging on `develop` merge |
| 10.3 | GitHub Actions — Deploy prod | Manual deploy to prod on `main` merge |
| 10.4 | Dockerfile | Multi-stage build for `packages/api` |
| 10.5 | Cloud Run config | Service YAML, env vars from Secret Manager |
| 10.6 | Smoke tests | Post-deploy health check script |

**Dependencies:** Phase 7, Phase 8, Phase 9

---

### Phase 11: PoC Migration (1 day)

**Branch:** `feat/poc-migration`

| # | Task | Output |
|---|------|--------|
| 11.1 | Migration script | Parse skill-index.json → skills collection |
| 11.2 | Decision log migration | Parse decisions-log.jsonl → decisions collection |
| 11.3 | Skill file parser | Parse SKILL.md → template field |
| 11.4 | Verification | Compare pre/post counts, search functionality |

**Dependencies:** Phase 3, Phase 7

---

### Phase 12: Web UI (5-8 days) — v2

**Branch:** `feat/web-ui`

| # | Task | Output |
|---|------|--------|
| 12.1 | Next.js app scaffold | `packages/web/` with pages router |
| 12.2 | Auth flow | Firebase Auth login/signup pages |
| 12.3 | Task submission page | Task input form with model/quality options |
| 12.4 | Task history page | Paginated list with filters |
| 12.5 | Skill browser | Grid/list view of skill library |
| 12.6 | Usage dashboard | Charts for usage stats |
| 12.7 | Settings page | Profile, API keys, preferences |
| 12.8 | Responsive design | Mobile-friendly layout |

**Dependencies:** Phases 7-10 (full API available)

---

## 3. Dependency Graph

```
Phase 0 (Scaffold)
    └── Phase 1 (Shared)
            ├── Phase 2 (LLM Gateway)
            │       └── Phase 4 (Prompt Architect)
            │               │
            ├── Phase 3 (Skill Library)
            │       │
            │       └───────┤
            │               ▼
            │       Phase 5 (Orchestrator)
            │               │
            │       Phase 6 (Memory / Letta)
            │               │
            │               ▼
            │       Phase 7 (API Gateway)
            │               │
            │               ├── Phase 8 (Auth)
            │               │       │
            │               │       ▼
            │               ├── Phase 9 (Usage)
            │               │       │
            │               │       ▼
            │               └── Phase 10 (CI/CD)
            │                       │
            │                       ▼
            └────────────── Phase 11 (Migration)
                                    │
                                    ▼
                            Phase 12 (Web UI)
```

---

## 4. Parallel Work Opportunities

| Track A (Core Engine) | Track B (Infrastructure) |
|----------------------|------------------------|
| Phase 2: LLM Gateway | Phase 0: Scaffold (pre-req) |
| Phase 3: Skill Library | Phase 6: Letta/Memory |
| Phase 4: Prompt Architect | Phase 10: CI/CD (partial) |
| Phase 5: Orchestrator | |

With a second developer (or AI pair), Track A and parts of Track B can run in parallel, reducing timeline to ~20 days.

---

## 5. Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Letta API instability | Medium | Low | Graceful fallback — system works without memory |
| LLM cost overrun | High | Medium | Aggressive caching, skill reuse, cheapest model routing |
| MongoDB text search insufficient | Medium | Medium | Upgrade to Atlas Search ($0 on M10+) or add vector search |
| Cloud Run cold start latency | High | Low | Min instances = 1 for prod if traffic justifies |
| Single developer bottleneck | High | High | Prioritize core loop (Phases 2-5) first, defer Web UI |
| Skill quality drift | Medium | Medium | Quality checker with auto-retry, user ratings feedback loop |

---

## 6. Definition of Done

Each phase is complete when:

- [ ] All TypeScript code compiles (`pnpm typecheck`)
- [ ] All tests pass with 80%+ coverage (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Feature branch PR created with description
- [ ] Code reviewed at checkpoint
- [ ] Documentation updated (README, JSDoc)
- [ ] Breaking changes documented
