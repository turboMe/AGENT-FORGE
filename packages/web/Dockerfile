# ═══════════════════════════════════════════════════════
#  AgentForge Web — Multi-stage Alpine build
# ═══════════════════════════════════════════════════════

# ── Stage 1: Install dependencies ─────────────────────
FROM node:20-alpine AS deps

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy workspace config & lockfile
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy all package.json files
COPY packages/api/package.json          packages/api/package.json
COPY packages/shared/package.json       packages/shared/package.json
COPY packages/orchestrator/package.json packages/orchestrator/package.json
COPY packages/skill-library/package.json packages/skill-library/package.json
COPY packages/llm-gateway/package.json  packages/llm-gateway/package.json
COPY packages/prompt-architect/package.json packages/prompt-architect/package.json
COPY packages/memory/package.json       packages/memory/package.json
COPY packages/web/package.json          packages/web/package.json

RUN pnpm install --frozen-lockfile


# ── Stage 2: Build Web ────────────────────────────────
FROM deps AS build

# Copy all source files
COPY tsconfig.base.json ./
COPY packages/ packages/

ENV NEXT_TELEMETRY_DISABLED=1

# Build web package
RUN pnpm --filter @agentforge/web run build


# ── Stage 3: Production runner ────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy static files
COPY --from=build /app/packages/web/public ./packages/web/public

# Standalone output (handles monorepo structure automatically)
COPY --from=build --chown=nextjs:nodejs /app/packages/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/packages/web/.next/static ./packages/web/.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "packages/web/server.js"]
