/**
 * Test helper — builds a Fastify server with mocked Firebase auth.
 * All E2E tests use this helper to avoid real Firebase SDK calls.
 */
import { vi, beforeEach } from 'vitest';
import type { AuthUser } from '../../plugins/firebase-auth.js';

// ── Mock the authenticate middleware ────────────────
// We mock authenticate directly rather than firebase-admin,
// so we skip the entire Firebase SDK dependency in tests.
const mockAuthenticate = vi.fn();

vi.mock('../../middleware/authenticate.js', () => ({
  authenticate: (...args: unknown[]) => mockAuthenticate(...args),
}));

export const MOCK_USER: AuthUser = {
  uid: 'test-user-123',
  email: 'test@agentforge.dev',
  tenantId: 'tenant-test-456',
  tier: 'pro',
};

export const VALID_TOKEN = 'valid-test-token';

/**
 * Configure the mock authenticate middleware behavior.
 * Must be called in beforeEach or beforeAll.
 */
export function setupMockAuth() {
  mockAuthenticate.mockImplementation(
    async (request: { headers: { authorization?: string }; user?: AuthUser }) => {
      const authHeader = request.headers.authorization;

      if (!authHeader?.startsWith('Bearer ')) {
        const { UnauthorizedError } = await import('@agentforge/shared');
        throw new UnauthorizedError('Missing or malformed authorization header');
      }

      const token = authHeader.slice(7);
      if (token !== VALID_TOKEN) {
        const { UnauthorizedError } = await import('@agentforge/shared');
        throw new UnauthorizedError('Invalid or expired token');
      }

      request.user = MOCK_USER;
    },
  );
}

/**
 * Build a fresh Fastify app instance for testing.
 * Imports from app.ts to avoid triggering start().
 */
export async function buildTestServer() {
  setupMockAuth();

  // Dynamic import to ensure mocks are set up first
  const { buildServer } = await import('../../app.js');
  const app = await buildServer();
  await app.ready();
  return app;
}

// Reset mocks before each test
beforeEach(() => {
  setupMockAuth();
});
