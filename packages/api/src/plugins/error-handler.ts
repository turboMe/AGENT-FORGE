import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { AppError } from '@agentforge/shared';

export interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: {
    requestId: string;
    timestamp: string;
  };
}

function buildErrorEnvelope(
  code: string,
  message: string,
  requestId: string,
  details?: unknown,
): ErrorEnvelope {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  };
}

async function errorHandlerPluginFn(app: FastifyInstance) {
  app.setErrorHandler(
    (error: Error, request: FastifyRequest, reply: FastifyReply) => {
      const requestId = request.id;

      // ── Known operational errors ───────────────
      if (error instanceof AppError) {
        const level = error.statusCode >= 500 ? 'error' : 'warn';
        request.log[level](
          { err: error, code: error.code },
          `AppError: ${error.message}`,
        );

        return reply
          .code(error.statusCode)
          .send(buildErrorEnvelope(error.code, error.message, requestId));
      }

      // ── Fastify validation errors ──────────────
      if ('validation' in error && Array.isArray((error as Record<string, unknown>)['validation'])) {
        request.log.warn({ err: error }, 'Validation error');
        return reply
          .code(400)
          .send(
            buildErrorEnvelope(
              'VALIDATION_ERROR',
              error.message,
              requestId,
              (error as Record<string, unknown>)['validation'],
            ),
          );
      }

      // ── Unknown / unexpected errors ────────────
      request.log.error(
        { err: error, stack: error.stack },
        `Unhandled error: ${error.message}`,
      );

      return reply
        .code(500)
        .send(
          buildErrorEnvelope(
            'INTERNAL_ERROR',
            process.env['NODE_ENV'] === 'production'
              ? 'An unexpected error occurred'
              : error.message,
            requestId,
          ),
        );
    },
  );
}

export const errorHandlerPlugin = fp(errorHandlerPluginFn, {
  name: 'error-handler',
});
