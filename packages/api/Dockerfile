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
