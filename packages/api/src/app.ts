import Fastify from 'fastify';
import cors from '@fastify/cors';
import { firebaseAuthPlugin } from './plugins/firebase-auth.js';
import { errorHandlerPlugin } from './plugins/error-handler.js';
import { responseEnvelopePlugin } from './plugins/response-envelope.js';
import { healthRoutes } from './routes/health.js';
import { taskRoutes } from './routes/tasks.js';
import { skillRoutes } from './routes/skills.js';
import { decisionRoutes } from './routes/decisions.js';
import { workflowRoutes } from './routes/workflows.js';
import { credentialRoutes } from './routes/credentials.js';
import { settingsRoutes } from './routes/settings.js';

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: process.env['LOG_LEVEL'] || 'info',
      transport:
        process.env['NODE_ENV'] === 'development'
          ? { target: 'pino-pretty' }
          : undefined,
    },
    requestIdHeader: 'x-request-id',
    genReqId: () =>
      `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
  });

  // ── Plugins ──────────────────────────────────────
  await app.register(cors, {
    origin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
  await app.register(firebaseAuthPlugin);
  await app.register(errorHandlerPlugin);
  await app.register(responseEnvelopePlugin);

  // ── Routes ───────────────────────────────────────
  await app.register(healthRoutes, { prefix: '/api/v1' });
  await app.register(taskRoutes, { prefix: '/api/v1' });
  await app.register(skillRoutes, { prefix: '/api/v1' });
  await app.register(decisionRoutes, { prefix: '/api/v1' });
  await app.register(workflowRoutes, { prefix: '/api/v1' });
  await app.register(credentialRoutes, { prefix: '/api/v1' });
  await app.register(settingsRoutes, { prefix: '/api/v1' });

  return app;
}
