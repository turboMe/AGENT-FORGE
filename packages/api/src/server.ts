import { buildServer } from './app.js';

export { buildServer };

const PORT = Number(process.env['PORT']) || 3000;
const HOST = process.env['HOST'] || '0.0.0.0';

async function start() {
  const app = await buildServer();

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`🚀 AgentForge API running on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
