import type { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => ({
    status: 'healthy',
    version: '0.0.1',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }));

  app.get('/health/live', async (_req, reply) => {
    reply.code(200).send({ status: 'alive' });
  });

  app.get('/health/ready', async (_req, reply) => {
    // TODO: Check MongoDB, Letta connectivity
    reply.code(200).send({ status: 'ready' });
  });
}
