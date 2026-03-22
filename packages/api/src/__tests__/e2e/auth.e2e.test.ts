import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestServer, VALID_TOKEN } from './test-helpers.js';

describe('Authentication (E2E)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestServer();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Missing token → 401 ────────────────────────────
  it('returns 401 when no Authorization header is provided', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/skills',
    });

    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  // ── Malformed token → 401 ──────────────────────────
  it('returns 401 when Authorization header is malformed', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/skills',
      headers: {
        authorization: 'Basic abc123',
      },
    });

    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  // ── Invalid token → 401 ────────────────────────────
  it('returns 401 when token verification fails', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/skills',
      headers: {
        authorization: 'Bearer invalid-token-abc',
      },
    });

    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  // ── Valid token → passes auth ──────────────────────
  it('passes authentication with a valid token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/skills',
      headers: {
        authorization: `Bearer ${VALID_TOKEN}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
  });

  // ── Error envelope has requestId ───────────────────
  it('error responses include requestId in meta', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/skills',
    });

    const body = res.json();
    expect(body.meta).toBeDefined();
    expect(body.meta.requestId).toBeDefined();
    expect(body.meta.requestId).toMatch(/^req_/);
  });
});
