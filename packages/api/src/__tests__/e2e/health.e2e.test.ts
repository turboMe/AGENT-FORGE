import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestServer } from './test-helpers.js';

describe('Health Endpoints (E2E)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestServer();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── GET /api/v1/health ─────────────────────────────
  it('GET /health returns healthy status with services', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('healthy');
    expect(body.version).toBe('0.0.1');
    expect(body.uptime).toBeTypeOf('number');
    expect(body.timestamp).toBeDefined();
    expect(body.services).toBeDefined();
    expect(body.services.database).toBeDefined();
    expect(body.services.llm).toBeDefined();
  });

  // ── GET /api/v1/health/live ────────────────────────
  it('GET /health/live returns alive status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/health/live',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'alive' });
  });

  // ── GET /api/v1/health/ready ───────────────────────
  it('GET /health/ready returns ready status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/health/ready',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ready' });
  });

  // ── No auth required ───────────────────────────────
  it('health endpoints do not require authentication', async () => {
    // No Authorization header — should still return 200
    const endpoints = ['/api/v1/health', '/api/v1/health/live', '/api/v1/health/ready'];

    for (const url of endpoints) {
      const res = await app.inject({ method: 'GET', url });
      expect(res.statusCode).toBe(200);
    }
  });
});
