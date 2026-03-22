# ═══════════════════════════════════════════════════════
#  AgentForge API — Multi-stage Alpine build
# ═══════════════════════════════════════════════════════

# ── Stage 1: Install dependencies ─────────────────────
FROM node:20-alpine AS deps

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy workspace config & lockfile
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy all package.json files (preserving directory structure)
COPY packages/api/package.json          packages/api/package.json
COPY packages/shared/package.json       packages/shared/package.json
COPY packages/orchestrator/package.json packages/orchestrator/package.json
COPY packages/skill-library/package.json packages/skill-library/package.json
COPY packages/llm-gateway/package.json  packages/llm-gateway/package.json
COPY packages/prompt-architect/package.json packages/prompt-architect/package.json
COPY packages/memory/package.json       packages/memory/package.json

RUN pnpm install --frozen-lockfile


# ── Stage 2: Build TypeScript ─────────────────────────
FROM deps AS build

# Copy all source files
COPY tsconfig.base.json ./
COPY packages/ packages/

# Build all packages (project references resolve order)
RUN pnpm run build


# ── Stage 3: Production runner ────────────────────────
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

RUN apk add --no-cache wget

WORKDIR /app

# Copy workspace config for pnpm
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy all package.json files
COPY packages/api/package.json          packages/api/package.json
COPY packages/shared/package.json       packages/shared/package.json
COPY packages/orchestrator/package.json packages/orchestrator/package.json
COPY packages/skill-library/package.json packages/skill-library/package.json
COPY packages/llm-gateway/package.json  packages/llm-gateway/package.json
COPY packages/prompt-architect/package.json packages/prompt-architect/package.json
COPY packages/memory/package.json       packages/memory/package.json

# Install production deps only
RUN pnpm install --frozen-lockfile --prod

# Copy compiled output from build stage
COPY --from=build /app/packages/api/dist          packages/api/dist
COPY --from=build /app/packages/shared/dist       packages/shared/dist
COPY --from=build /app/packages/orchestrator/dist packages/orchestrator/dist
COPY --from=build /app/packages/skill-library/dist packages/skill-library/dist
COPY --from=build /app/packages/llm-gateway/dist  packages/llm-gateway/dist
COPY --from=build /app/packages/prompt-architect/dist packages/prompt-architect/dist
COPY --from=build /app/packages/memory/dist       packages/memory/dist

# Non-root user
USER node

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --spider http://localhost:3000/api/v1/health/live || exit 1

CMD ["node", "packages/api/dist/server.js"]
