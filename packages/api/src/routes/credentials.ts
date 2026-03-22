import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';

interface CredentialParams {
  credentialId: string;
}

interface CreateCredentialBody {
  service: string;
  apiKey: string;
}

function maskKey(key: string): string {
  if (key.length <= 8) return '••••••••';
  return '••••' + key.slice(-4);
}

export async function credentialRoutes(app: FastifyInstance) {
  // ── GET /credentials ──────────────────────────────
  app.get(
    '/credentials',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { tenantId } = request.user;

      request.log.info({ tenantId }, 'Listing credentials');

      // Stub: In production, fetches from encrypted credential store
      return reply.success({
        credentials: [],
      });
    },
  );

  // ── POST /credentials ─────────────────────────────
  app.post<{ Body: CreateCredentialBody }>(
    '/credentials',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { service, apiKey } = request.body;
      const { uid, tenantId } = request.user;

      request.log.info(
        { userId: uid, tenantId, service },
        'Creating credential',
      );

      // Stub: In production, encrypts and stores the key
      const credentialId = `cred_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

      return reply.success({
        id: credentialId,
        service,
        maskedKey: maskKey(apiKey),
        createdAt: new Date().toISOString(),
      });
    },
  );

  // ── DELETE /credentials/:credentialId ─────────────
  app.delete<{ Params: CredentialParams }>(
    '/credentials/:credentialId',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { credentialId } = request.params;

      request.log.info(
        { tenantId: request.user.tenantId, credentialId },
        'Deleting credential',
      );

      // Stub: In production, removes from encrypted store
      return reply.success({
        id: credentialId,
        deletedAt: new Date().toISOString(),
      });
    },
  );
}
