import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestServer, VALID_TOKEN } from './test-helpers.js';

describe('Decision Endpoints (E2E)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestServer();
  });

  afterAll(async () => {
    await app.close();
  });

  const authHeaders = { authorization: `Bearer ${VALID_TOKEN}` };

  // ── GET /decisions ─────────────────────────────────
  it('GET /decisions returns paginated list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/decisions',
      headers: authHeaders,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.decisions).toBeInstanceOf(Array);
    expect(body.data.pagination).toBeDefined();
    expect(body.data.pagination.page).toBe(1);
    expect(body.data.pagination.limit).toBe(20);
  });

  // ── GET /decisions with query params ───────────────
  it('GET /decisions respects pagination params', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/decisions?page=3&limit=10',
      headers: authHeaders,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.pagination.page).toBe(3);
    expect(body.data.pagination.limit).toBe(10);
  });

  // ── GET /decisions — limit capping at 100 ──────────
  it('GET /decisions caps limit at 100', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/decisions?limit=500',
      headers: authHeaders,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.pagination.limit).toBe(100);
  });

  // ── GET /decisions with filter params ──────────────
  it('GET /decisions accepts filter query params', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/decisions?action=create_new&from=2026-03-01&to=2026-03-21',
      headers: authHeaders,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
  });

  // ── GET /decisions/:decisionId ─────────────────────
  it('GET /decisions/:decisionId returns decision details', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/decisions/dec_test123',
      headers: authHeaders,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('dec_test123');
    expect(body.data.actionTaken).toBeDefined();
  });

  // ── GET /decisions — no auth → 401 ────────────────
  it('GET /decisions requires authentication', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/decisions',
    });

    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  // ── envelope structure ─────────────────────────────
  it('success responses have proper envelope structure', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/decisions',
      headers: authHeaders,
    });

    const body = res.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('meta');
    expect(body.meta).toHaveProperty('requestId');
    expect(body.meta).toHaveProperty('timestamp');
    expect(body.meta).toHaveProperty('latencyMs');
    expect(body.meta.requestId).toMatch(/^req_/);
  });
});
