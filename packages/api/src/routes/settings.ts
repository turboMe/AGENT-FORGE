import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import { UserProfileRepository } from '../repositories/user-profile.repository.js';

interface UpdateProfileBody {
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    defaultModel?: string;
    notifications?: {
      email?: boolean;
      push?: boolean;
      weeklyReport?: boolean;
    };
  };
}

const repo = new UserProfileRepository();

export async function settingsRoutes(app: FastifyInstance) {
  // ── GET /settings/profile ─────────────────────────
  app.get(
    '/settings/profile',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { uid, tenantId, email } = request.user;

      request.log.info({ userId: uid, tenantId }, 'Fetching profile');

      const profile = await repo.findOrCreate(uid, tenantId, email);
      return reply.success(profile);
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

      const profile = await repo.update(uid, tenantId, updates as any);
      return reply.success(profile);
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

      const usage = await repo.getUsageStats(tenantId);
      return reply.success(usage);
    },
  );
}
