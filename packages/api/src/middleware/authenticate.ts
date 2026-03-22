import type { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError } from '@agentforge/shared';
import { verifyToken } from '../plugins/firebase-auth.js';

/**
 * Fastify preHandler hook — extracts Bearer token, verifies with Firebase Admin.
 * Sets `req.user` on success, throws `UnauthorizedError` on failure.
 */
export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed authorization header');
  }

  const token = authHeader.slice(7); // 'Bearer '.length

  if (!token) {
    throw new UnauthorizedError('Missing token');
  }

  try {
    request.user = await verifyToken(token);
  } catch (err) {
    request.log.warn({ err }, 'Token verification failed');
    throw new UnauthorizedError('Invalid or expired token');
  }
}
