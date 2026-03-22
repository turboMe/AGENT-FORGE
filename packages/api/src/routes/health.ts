import type { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  // ── GET /health ────────────────────────────────────
  app.get('/health', async () => ({
    status: 'healthy',
    version: '0.0.1',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown', // TODO: Check MongoDB connectivity
      letta: 'unknown',    // TODO: Check Letta connectivity
      llm: {
        claude: 'unknown',
        gpt: 'unknown',
        gemini: 'unknown',
      },
    },
  }));

  // ── GET /health/live ───────────────────────────────
  app.get('/health/live', async (_req, reply) => {
    reply.code(200).send({ status: 'alive' });
  });

  // ── GET /health/ready ──────────────────────────────
  app.get('/health/ready', async (_req, reply) => {
    // TODO: Check MongoDB, Letta connectivity before reporting ready
    reply.code(200).send({ status: 'ready' });
  });
}
