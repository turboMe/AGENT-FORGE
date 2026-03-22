import type { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import type { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '@agentforge/shared';

/**
 * Factory that creates a Fastify preHandler hook for Zod body validation.
 * Replaces `req.body` with the parsed (and defaulted) result.
 */
export function zodValidate(schema: ZodSchema): preHandlerHookHandler {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      const zodError = result.error as ZodError;
      const details = zodError.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));

      request.log.warn({ validationErrors: details }, 'Request validation failed');

      const error = new ValidationError(
        `Validation failed: ${details.map((d) => d.message).join('; ')}`,
      );
      // Attach details for the error handler
      (error as ValidationError & { details: unknown }).details = details;
      throw error;
    }

    // Replace body with parsed + defaulted values
    request.body = result.data;
  };
}
