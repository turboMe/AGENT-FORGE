import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import { CredentialRepository } from '../repositories/credential.repository.js';

interface CredentialParams {
  credentialId: string;
}

interface CreateCredentialBody {
  service: string;
  apiKey: string;
}

export async function credentialRoutes(app: FastifyInstance) {
  const credentialRepo = new CredentialRepository();

  // ── GET /credentials ──────────────────────────────
  app.get(
    '/credentials',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { tenantId } = request.user;

      request.log.info({ tenantId }, 'Listing credentials');

      const credentials = await credentialRepo.findByTenant(tenantId);
      
      const mappedCredentials = credentials.map(c => ({
        id: c._id,
        service: c.service,
        maskedKey: c.maskedKey,
        createdAt: c.createdAt.toISOString()
      }));

      return reply.success({
        credentials: mappedCredentials,
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

      const credential = await credentialRepo.create({
        tenantId,
        userId: uid,
        service,
        apiKey,
      });

      return reply.success({
        id: credential._id,
        service: credential.service,
        maskedKey: credential.maskedKey,
        createdAt: credential.createdAt.toISOString(),
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
      const { tenantId } = request.user;

      request.log.info(
        { tenantId, credentialId },
        'Deleting credential',
      );

      const success = await credentialRepo.delete(credentialId, tenantId);

      if (!success) {
        return reply.status(404).send({
          success: false,
          error: { message: 'Credential not found or unauthorized' }
        });
      }

      return reply.success({
        id: credentialId,
        deletedAt: new Date().toISOString(),
      });
    },
  );
}
