import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestServer, VALID_TOKEN } from './test-helpers.js';

describe('Task Endpoints (E2E)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestServer();
  });

  afterAll(async () => {
    await app.close();
  });

  const authHeaders = { authorization: `Bearer ${VALID_TOKEN}` };

  // ── POST /tasks — valid body ───────────────────────
  it('POST /tasks creates a task with valid body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/tasks',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        task: 'Write a professional email to a restaurant owner',
        options: {
          model: 'auto',
          quality: 'balanced',
          language: 'en',
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.taskId).toMatch(/^task_/);
    expect(body.data.result).toBeDefined();
    expect(body.data.routing).toBeDefined();
    expect(body.meta.requestId).toMatch(/^req_/);
    expect(body.meta.latencyMs).toBeTypeOf('number');
  });

  // ── POST /tasks — minimal body (defaults) ─────────
  it('POST /tasks accepts minimal body with defaults', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/tasks',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        task: 'Analyze food cost ratio for my menu',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.taskId).toBeDefined();
  });

  // ── POST /tasks — empty task → 400 ────────────────
  it('POST /tasks rejects empty task string', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/tasks',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        task: '',
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── POST /tasks — missing body → 400 ──────────────
  it('POST /tasks rejects missing body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/tasks',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── POST /tasks — invalid model option → 400 ──────
  it('POST /tasks rejects invalid model option', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/tasks',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        task: 'Write something',
        options: {
          model: 'invalid-model',
        },
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── POST /tasks — no auth → 401 ───────────────────
  it('POST /tasks requires authentication', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/tasks',
      headers: { 'content-type': 'application/json' },
      payload: {
        task: 'Write something',
      },
    });

    expect(res.statusCode).toBe(401);
  });

  // ── GET /tasks/:taskId ─────────────────────────────
  it('GET /tasks/:taskId returns task details', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/tasks/task_test123',
      headers: authHeaders,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.taskId).toBe('task_test123');
    expect(body.data.status).toBe('completed');
  });
});
