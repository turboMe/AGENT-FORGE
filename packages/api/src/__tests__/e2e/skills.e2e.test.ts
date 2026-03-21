import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestServer, VALID_TOKEN } from './test-helpers.js';

describe('Skill Endpoints (E2E)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestServer();
  });

  afterAll(async () => {
    await app.close();
  });

  const authHeaders = { authorization: `Bearer ${VALID_TOKEN}` };

  // ── GET /skills ────────────────────────────────────
  it('GET /skills returns paginated list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/skills',
      headers: authHeaders,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.skills).toBeInstanceOf(Array);
    expect(body.data.pagination).toBeDefined();
    expect(body.data.pagination.page).toBe(1);
    expect(body.data.pagination.limit).toBe(20);
  });

  // ── GET /skills with query params ──────────────────
  it('GET /skills respects pagination params', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/skills?page=2&limit=5',
      headers: authHeaders,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.pagination.page).toBe(2);
    expect(body.data.pagination.limit).toBe(5);
  });

  // ── GET /skills — limit capping ────────────────────
  it('GET /skills caps limit at 100', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/skills?limit=999',
      headers: authHeaders,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.pagination.limit).toBe(100);
  });

  // ── GET /skills/:skillId ───────────────────────────
  it('GET /skills/:skillId returns skill details', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/skills/skill_abc123',
      headers: authHeaders,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('skill_abc123');
    expect(body.data.name).toBeDefined();
  });

  // ── POST /skills — valid body ──────────────────────
  it('POST /skills creates a skill with valid body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/skills',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        name: 'weekly-report-gen',
        description: 'Generates weekly progress reports from bullet points and notes',
        domain: ['reporting', 'management'],
        pattern: 'processor',
        template: {
          persona: 'Senior project manager with 15 years of experience in tech companies',
          process: ['Parse input bullets', 'Group by category', 'Write narrative'],
          outputFormat: 'markdown',
          constraints: ['Never exceed 500 words', 'Always include action items'],
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toMatch(/^skill_/);
    expect(body.data.name).toBe('weekly-report-gen');
    expect(body.data.domain).toEqual(['reporting', 'management']);
  });

  // ── POST /skills — missing name → 400 ─────────────
  it('POST /skills rejects missing required fields', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/skills',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        description: 'Missing name and other required fields',
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── POST /skills — invalid name format → 400 ──────
  it('POST /skills rejects invalid name format', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/skills',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        name: 'Invalid Name With Spaces!',
        description: 'This should fail because the name has spaces and uppercase letters',
        domain: ['test'],
        pattern: 'processor',
        template: {
          persona: 'A test persona that is at least 10 characters',
          process: ['Step 1'],
          outputFormat: 'text',
          constraints: [],
        },
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── POST /skills — no auth → 401 ──────────────────
  it('POST /skills requires authentication', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/skills',
      headers: { 'content-type': 'application/json' },
      payload: {
        name: 'no-auth-test',
        description: 'This should fail auth check before any other validation',
        domain: ['test'],
        pattern: 'processor',
        template: {
          persona: 'A test persona',
          process: ['Step 1'],
          outputFormat: 'text',
          constraints: [],
        },
      },
    });

    expect(res.statusCode).toBe(401);
  });
});
