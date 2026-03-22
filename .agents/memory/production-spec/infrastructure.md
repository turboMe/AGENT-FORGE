# AgentForge — Infrastructure

> **Version:** 1.0  
> **Date:** 2026-03-21  
> **Author:** blueprint-architect  
> **Status:** Draft — Awaiting Review

---

## 1. Overview

All infrastructure runs on Google Cloud Platform (GCP) with GitHub Actions for CI/CD. The design optimizes for **minimal operational overhead** and **scale-to-zero cost efficiency** — ideal for a solo developer.

---

## 2. Docker Configuration

### 2.1 API Dockerfile (Multi-Stage)

```dockerfile
# ── Stage 1: Builder ───────────────────────────────────
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy workspace config first (cache layer)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
COPY packages/orchestrator/package.json packages/orchestrator/
COPY packages/skill-library/package.json packages/skill-library/
COPY packages/llm-gateway/package.json packages/llm-gateway/
COPY packages/prompt-architect/package.json packages/prompt-architect/
COPY packages/memory/package.json packages/memory/

# Install dependencies (cached unless package.json changes)
RUN pnpm install --frozen-lockfile --prod=false

# Copy source
COPY packages/ packages/
COPY tsconfig.base.json ./

# Build all packages
RUN pnpm --filter @agentforge/shared build && \
    pnpm --filter @agentforge/llm-gateway build && \
    pnpm --filter @agentforge/skill-library build && \
    pnpm --filter @agentforge/prompt-architect build && \
    pnpm --filter @agentforge/orchestrator build && \
    pnpm --filter @agentforge/memory build && \
    pnpm --filter @agentforge/api build

# ── Stage 2: Production ───────────────────────────────
FROM node:20-alpine AS production

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
COPY packages/orchestrator/package.json packages/orchestrator/
COPY packages/skill-library/package.json packages/skill-library/
COPY packages/llm-gateway/package.json packages/llm-gateway/
COPY packages/prompt-architect/package.json packages/prompt-architect/
COPY packages/memory/package.json packages/memory/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built output
COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/packages/llm-gateway/dist packages/llm-gateway/dist
COPY --from=builder /app/packages/skill-library/dist packages/skill-library/dist
COPY --from=builder /app/packages/prompt-architect/dist packages/prompt-architect/dist
COPY --from=builder /app/packages/orchestrator/dist packages/orchestrator/dist
COPY --from=builder /app/packages/memory/dist packages/memory/dist
COPY --from=builder /app/packages/api/dist packages/api/dist

# Security: non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup
USER appuser

# Cloud Run expects PORT env var
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/v1/health/live || exit 1

CMD ["node", "packages/api/dist/server.js"]
```

**Expected image size:** ~180MB (Alpine + prod deps only)

---

### 2.2 Docker Compose — Local Development

```yaml
# docker/docker-compose.yml
version: '3.9'

services:
  # ── MongoDB (local dev, mirrors Atlas) ─────────
  mongodb:
    image: mongo:7
    container_name: agentforge-mongo
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    environment:
      MONGO_INITDB_DATABASE: agentforge
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ── Letta (MemGPT) ────────────────────────────
  letta:
    image: letta/letta:latest
    container_name: agentforge-letta
    ports:
      - "8283:8283"
    volumes:
      - letta-data:/root/.letta
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      mongodb:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8283/v1/health"]
      interval: 15s
      timeout: 5s
      retries: 3

  # ── n8n (v2 — tool execution) ─────────────────
  # n8n:
  #   image: n8nio/n8n:latest
  #   container_name: agentforge-n8n
  #   ports:
  #     - "5678:5678"
  #   volumes:
  #     - n8n-data:/home/node/.n8n
  #   environment:
  #     - N8N_BASIC_AUTH_ACTIVE=true
  #     - N8N_BASIC_AUTH_USER=${N8N_USER}
  #     - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}

volumes:
  mongo-data:
  letta-data:
  # n8n-data:
```

---

## 3. Google Cloud Run Configuration

### 3.1 Service Configuration

```yaml
# cloud-run-service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: agentforge-api
  annotations:
    run.googleapis.com/description: "AgentForge API — Self-Evolving Agent Ecosystem"
spec:
  template:
    metadata:
      annotations:
        # Scale to zero when idle
        autoscaling.knative.dev/minScale: "0"
        autoscaling.knative.dev/maxScale: "10"
        # CPU only allocated during request processing (cost savings)
        run.googleapis.com/cpu-throttling: "true"
        # Startup CPU boost for cold starts
        run.googleapis.com/startup-cpu-boost: "true"
        # Max concurrent requests per instance
        autoscaling.knative.dev/target: "80"
    spec:
      containerConcurrency: 100
      timeoutSeconds: 300
      containers:
        - image: gcr.io/PROJECT_ID/agentforge-api:latest
          ports:
            - containerPort: 8080
          resources:
            limits:
              cpu: "1"
              memory: "1Gi"
          env:
            - name: NODE_ENV
              value: "production"
            - name: PORT
              value: "8080"
            - name: MONGODB_URI
              valueFrom:
                secretKeyRef:
                  name: mongodb-uri
                  key: latest
            - name: FIREBASE_PROJECT_ID
              value: "agentforge-prod"
            - name: ANTHROPIC_API_KEY
              valueFrom:
                secretKeyRef:
                  name: anthropic-api-key
                  key: latest
            - name: OPENAI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: openai-api-key
                  key: latest
            - name: LETTA_BASE_URL
              value: "https://agentforge-letta-xxxxx.run.app"
          startupProbe:
            httpGet:
              path: /api/v1/health/live
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 10
          livenessProbe:
            httpGet:
              path: /api/v1/health/live
              port: 8080
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /api/v1/health/ready
              port: 8080
            periodSeconds: 10
```

### 3.2 Letta Cloud Run Service

Letta runs as a separate Cloud Run service (not a sidecar) for independent scaling:

```bash
gcloud run deploy agentforge-letta \
  --image letta/letta:latest \
  --port 8283 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 2 \
  --cpu-throttling \
  --set-env-vars "OPENAI_API_KEY=$(gcloud secrets versions access latest --secret=openai-api-key)" \
  --allow-unauthenticated=false \
  --service-account agentforge-letta@PROJECT_ID.iam.gserviceaccount.com
```

**Note:** Letta-to-API communication uses IAM-based authentication (no public access).

---

## 4. CI/CD — GitHub Actions

### 4.1 CI Pipeline (Every PR)

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
    branches: [develop, main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Lint
        run: pnpm lint
      
      - name: Type check
        run: pnpm typecheck
      
      - name: Test
        run: pnpm test -- --coverage
      
      - name: Coverage threshold
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 80% threshold"
            exit 1
          fi
      
      - name: Build
        run: pnpm build
```

---

### 4.2 Deploy Staging (Auto on develop merge)

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy Staging
on:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: staging
    permissions:
      contents: read
      id-token: write     # For Workload Identity Federation
    
    steps:
      - uses: actions/checkout@v4
      
      - id: auth
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}
      
      - uses: google-github-actions/setup-gcloud@v2
      
      - name: Build & Push Docker image
        run: |
          gcloud auth configure-docker gcr.io
          docker build -t gcr.io/${{ secrets.GCP_PROJECT }}/agentforge-api:staging-${{ github.sha }} .
          docker push gcr.io/${{ secrets.GCP_PROJECT }}/agentforge-api:staging-${{ github.sha }}
      
      - name: Deploy to Cloud Run (staging)
        run: |
          gcloud run deploy agentforge-api-staging \
            --image gcr.io/${{ secrets.GCP_PROJECT }}/agentforge-api:staging-${{ github.sha }} \
            --region europe-west1 \
            --min-instances 0 \
            --max-instances 3 \
            --memory 512Mi \
            --cpu 1 \
            --cpu-throttling \
            --set-env-vars "NODE_ENV=staging" \
            --update-secrets "MONGODB_URI=mongodb-uri-staging:latest,ANTHROPIC_API_KEY=anthropic-api-key:latest,OPENAI_API_KEY=openai-api-key:latest"
      
      - name: Smoke test
        run: |
          URL=$(gcloud run services describe agentforge-api-staging --region europe-west1 --format 'value(status.url)')
          curl -f "$URL/api/v1/health" || exit 1
          echo "✅ Staging deploy successful"
```

---

### 4.3 Deploy Production (Manual trigger on main)

```yaml
# .github/workflows/deploy-prod.yml
name: Deploy Production
on:
  push:
    branches: [main]
  workflow_dispatch:      # Manual trigger as safety net

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production    # Requires approval in GitHub
    permissions:
      contents: read
      id-token: write
    
    steps:
      - uses: actions/checkout@v4
      
      - id: auth
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}
      
      - uses: google-github-actions/setup-gcloud@v2
      
      - name: Build & Push Docker image
        run: |
          gcloud auth configure-docker gcr.io
          docker build -t gcr.io/${{ secrets.GCP_PROJECT }}/agentforge-api:${{ github.sha }} .
          docker build -t gcr.io/${{ secrets.GCP_PROJECT }}/agentforge-api:latest .
          docker push gcr.io/${{ secrets.GCP_PROJECT }}/agentforge-api:${{ github.sha }}
          docker push gcr.io/${{ secrets.GCP_PROJECT }}/agentforge-api:latest
      
      - name: Deploy to Cloud Run (production)
        run: |
          gcloud run deploy agentforge-api \
            --image gcr.io/${{ secrets.GCP_PROJECT }}/agentforge-api:${{ github.sha }} \
            --region europe-west1 \
            --min-instances 0 \
            --max-instances 10 \
            --memory 1Gi \
            --cpu 1 \
            --cpu-throttling \
            --startup-cpu-boost \
            --set-env-vars "NODE_ENV=production" \
            --update-secrets "MONGODB_URI=mongodb-uri:latest,ANTHROPIC_API_KEY=anthropic-api-key:latest,OPENAI_API_KEY=openai-api-key:latest,FIREBASE_SERVICE_ACCOUNT=firebase-sa:latest"
      
      - name: Smoke test
        run: |
          URL=$(gcloud run services describe agentforge-api --region europe-west1 --format 'value(status.url)')
          curl -f "$URL/api/v1/health" || exit 1
          echo "✅ Production deploy successful"
      
      - name: Notify (optional — via GitHub status)
        if: success()
        run: echo "🚀 AgentForge deployed to production"
```

---

## 5. Environment Variables

### 5.1 Complete `.env.example`

```bash
# ── Server ──────────────────────────────────────────
NODE_ENV=development
PORT=3000
API_VERSION=v1
LOG_LEVEL=debug                    # debug | info | warn | error

# ── MongoDB ─────────────────────────────────────────
MONGODB_URI=mongodb://localhost:27017/agentforge
# Production: mongodb+srv://user:pass@cluster.mongodb.net/agentforge

# ── Firebase Auth ───────────────────────────────────
FIREBASE_PROJECT_ID=agentforge-dev
FIREBASE_SERVICE_ACCOUNT_PATH=./credentials/firebase-sa.json
# Production: uses FIREBASE_SERVICE_ACCOUNT secret (JSON string)

# ── LLM Providers ──────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=AI...
OLLAMA_BASE_URL=http://localhost:11434   # Local models

# ── LLM Defaults ───────────────────────────────────
DEFAULT_MODEL=auto                  # auto | claude-sonnet-4-5 | gpt-4o-mini
DEFAULT_QUALITY=balanced            # fast | balanced | best
MAX_TOKENS_DEFAULT=4096
TEMPERATURE_DEFAULT=0.7

# ── Letta (Memory) ─────────────────────────────────
LETTA_BASE_URL=http://localhost:8283
LETTA_API_KEY=                     # If Letta requires auth

# ── Rate Limiting ───────────────────────────────────
RATE_LIMIT_FREE=10                 # requests/minute
RATE_LIMIT_PRO=30
RATE_LIMIT_TEAM=60
RATE_LIMIT_AGENCY=120

# ── CORS ────────────────────────────────────────────
CORS_ORIGIN=http://localhost:3001   # Web UI origin
# Production: https://app.agentforge.dev

# ── n8n (v2) ───────────────────────────────────────
# N8N_BASE_URL=http://localhost:5678
# N8N_API_KEY=
```

### 5.2 Secret Management (Production)

All secrets stored in **Google Secret Manager**:

| Secret Name | Description |
|-------------|-------------|
| `mongodb-uri` | Atlas connection string (SRV format) |
| `mongodb-uri-staging` | Staging Atlas connection string |
| `anthropic-api-key` | Anthropic Claude API key |
| `openai-api-key` | OpenAI API key |
| `google-ai-api-key` | Google AI API key |
| `firebase-sa` | Firebase service account JSON |
| `letta-api-key` | Letta server API key (if auth enabled) |

Access in Cloud Run via `--update-secrets` flag (zero-code secret injection).

---

## 6. MongoDB Atlas Configuration

### 6.1 Cluster Timeline

| Phase | Tier | Cost | Max Connections | Storage |
|-------|------|------|-----------------|---------|
| Dev / PoC | M0 (Free) | $0 | 500 | 512 MB |
| Launch (< 100 users) | M2 (Shared) | $9/mo | 500 | 2 GB |
| Growth (100-1k users) | M5 (Shared) | $25/mo | 500 | 5 GB |
| Scale (1k+ users) | M10 (Dedicated) | $57/mo | 1,500 | 10 GB |

### 6.2 Network Security

```
Cloud Run (europe-west1) ──→ MongoDB Atlas (europe-west1)
         │
         └── IP Access List: Cloud Run egress IPs
             OR
             Private Endpoint (M10+ only)
```

For M0-M5 (shared tier):
- Use Atlas IP Access List with Cloud Run's NAT IP
- Set up Serverless VPC Connector for stable egress IP

For M10+ (dedicated):
- Use VPC Peering or Private Endpoint for zero-exposure

### 6.3 Indexes

All indexes defined in `data-model.md`. Create via:

```bash
# Migration script creates indexes on first run
pnpm --filter @agentforge/api run migrate:indexes
```

---

## 7. Cost Estimates

### 7.1 Infrastructure Costs (Monthly)

| Component | 100 users | 1,000 users | 10,000 users |
|-----------|-----------|-------------|--------------|
| **Cloud Run (API)** | $0-5 (scale-to-zero) | $10-30 | $50-150 |
| **Cloud Run (Letta)** | $0-3 | $5-15 | $20-50 |
| **MongoDB Atlas** | $0 (M0) | $9-25 (M2-M5) | $57+ (M10) |
| **Firebase Auth** | $0 (free tier) | $0 (50k MAU free) | $0 |
| **Artifact Registry** | $0.10/GB | $0.10/GB | $0.10/GB |
| **Secret Manager** | $0-1 | $0-1 | $0-1 |
| **Cloud Logging** | $0 (50GB free) | $0-5 | $10-30 |
| **Subtotal (Infra)** | **$0-10** | **$25-75** | **$140-280** |

### 7.2 LLM API Costs (Variable — Biggest Cost Driver)

| Scenario | Avg tokens/task | Tasks/day | Model | Daily cost | Monthly |
|----------|----------------|-----------|-------|------------|---------|
| 100 users, casual | 1,000 | 50 | Sonnet (auto) | $0.15 | $4.50 |
| 100 users, active | 1,500 | 200 | Mixed | $0.90 | $27 |
| 1,000 users, balanced | 1,200 | 1,000 | Mixed | $3.60 | $108 |
| 10,000 users, heavy | 1,500 | 10,000 | Mixed | $36 | $1,080 |

**Cost optimization levers:**

1. **Skill cache hit ratio** — Every cache hit skips skill creation (~40% token savings)
2. **Model routing** — Use GPT-4o-mini for simple tasks (10x cheaper than Claude)
3. **Response caching** — Identical task inputs return cached results
4. **Token budgets** — Per-tier max tokens enforce spending caps

### 7.3 Total Monthly Cost

| Scale | Infra | LLM | Total |
|-------|-------|-----|-------|
| 100 users (MVP) | $0-10 | $5-27 | **$5-37** |
| 1,000 users | $25-75 | $50-108 | **$75-183** |
| 10,000 users | $140-280 | $500-1,080 | **$640-1,360** |

---

## 8. Monitoring & Alerting

### 8.1 Built-in Monitoring

| Tool | What It Monitors | Cost |
|------|-----------------|------|
| Cloud Run metrics | Request count, latency, error rate, instance count | Free |
| Cloud Logging | Structured logs (Pino JSON output) | 50GB free |
| MongoDB Atlas monitoring | Query performance, connections, ops/sec | Free |
| Firebase console | Auth events, active users | Free |

### 8.2 Custom Metrics Endpoint

```
GET /api/v1/health → Detailed service status

{
  "status": "healthy",
  "metrics": {
    "uptime_seconds": 86400,
    "tasks_today": 142,
    "cache_hit_ratio": 0.73,
    "avg_latency_ms": 2100,
    "error_rate_1h": 0.02,
    "active_providers": ["anthropic", "openai"]
  }
}
```

### 8.3 Alert Rules

| Condition | Severity | Action |
|-----------|----------|--------|
| Error rate > 5% (5min window) | Critical | PagerDuty / email |
| P95 latency > 10s | Warning | Email |
| MongoDB connections > 80% | Warning | Scale alert |
| LLM provider circuit open | Critical | Auto-fallback + email |
| Daily cost > $50 | Warning | Email + Slack |

---

## 9. Disaster Recovery

| Scenario | RTO | RPO | Recovery Plan |
|----------|-----|-----|---------------|
| Cloud Run service crash | 30s | 0 | Auto-restart (managed) |
| MongoDB connection loss | 60s | 0 | Retry with exponential backoff |
| LLM API outage (single) | 0 | 0 | Auto-fallback to next provider |
| LLM API outage (all) | — | 0 | Return 502 with retry-after header |
| Data corruption | 1h | 1min | Atlas PITR restore |
| Full region outage | 4h | 1h | Re-deploy to backup region |

**RTO** = Recovery Time Objective  
**RPO** = Recovery Point Objective
