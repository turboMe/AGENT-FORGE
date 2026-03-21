import type { FastifyInstance, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

export interface SuccessEnvelope<T = unknown> {
  success: true;
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
    latencyMs: number;
  };
}

declare module 'fastify' {
  interface FastifyReply {
    success: <T>(data: T) => FastifyReply;
  }
}

async function responseEnvelopePluginFn(app: FastifyInstance) {
  app.decorateReply('success', function <T>(this: FastifyReply, data: T) {
    // `this.request` contains the request that produced this reply
    const startTime = this.request.startTime ?? Date.now();
    const envelope: SuccessEnvelope<T> = {
      success: true,
      data,
      meta: {
        requestId: this.request.id,
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - startTime,
      },
    };
    return this.code(200).send(envelope);
  });

  // Track request start time
  app.addHook('onRequest', async (request) => {
    request.startTime = Date.now();
  });
}

declare module 'fastify' {
  interface FastifyRequest {
    startTime: number;
  }
}

export const responseEnvelopePlugin = fp(responseEnvelopePluginFn, {
  name: 'response-envelope',
});
