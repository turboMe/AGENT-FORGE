import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';

interface UpdateProfileBody {
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  preferences?: {
    theme?: string;
    defaultModel?: string;
    notifications?: {
      email?: boolean;
      push?: boolean;
      weeklyReport?: boolean;
    };
  };
}

export async function settingsRoutes(app: FastifyInstance) {
  // ── GET /settings/profile ─────────────────────────
  app.get(
    '/settings/profile',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { uid, tenantId } = request.user;

      request.log.info({ userId: uid, tenantId }, 'Fetching profile');

      // Stub: In production, fetches from user profile store
      return reply.success({
        displayName: 'Agent User',
        email: request.user.email || 'user@agentforge.ai',
        avatarUrl: null,
        plan: 'free',
        createdAt: '2026-01-01T00:00:00Z',
        preferences: {
          theme: 'dark',
          defaultModel: 'claude-sonnet-4',
          notifications: {
            email: true,
            push: true,
            weeklyReport: false,
          },
        },
      });
    },
  );

  // ── PUT /settings/profile ─────────────────────────
  app.put<{ Body: UpdateProfileBody }>(
    '/settings/profile',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const updates = request.body;
      const { uid, tenantId } = request.user;

      request.log.info(
        { userId: uid, tenantId, fields: Object.keys(updates) },
        'Updating profile',
      );

      // Stub: In production, updates user profile store
      return reply.success({
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    },
  );

  // ── GET /settings/usage ───────────────────────────
  app.get(
    '/settings/usage',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { uid, tenantId } = request.user;

      request.log.info({ userId: uid, tenantId }, 'Fetching usage stats');

      // Stub: In production, aggregates from usage tracking service
      return reply.success({
        apiCalls: { used: 1247, limit: 5000 },
        storage: { used: 128, limit: 512 },
        skills: { used: 9, limit: 25 },
      });
    },
  );
}
