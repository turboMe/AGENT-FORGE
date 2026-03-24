import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/authenticate.js';
import { ConversationRepository } from '../repositories/conversation.repository.js';

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

interface ConversationParams {
  id: string;
}

interface CreateConversationBody {
  title?: string;
}

interface UpdateTitleBody {
  title: string;
}

interface AddMessageBody {
  role: 'user' | 'assistant';
  content: string;
  files?: { name: string; type: string; size: number; content?: string }[];
}

export async function conversationRoutes(app: FastifyInstance) {
  const repo = new ConversationRepository();

  // ── GET /conversations ─────────────────────────────
  app.get<{ Querystring: { page?: string; limit?: string; search?: string } }>(
    '/conversations',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { uid, tenantId } = request.user;
      const page = Math.max(1, Number(request.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 50));
      const search = request.query.search;

      const result = await repo.findByUser(tenantId, uid, { page, limit, search });

      return reply.success({
        conversations: result.conversations,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    },
  );

  // ── POST /conversations ────────────────────────────
  app.post<{ Body: CreateConversationBody }>(
    '/conversations',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { uid, tenantId } = request.user;
      const { title } = request.body ?? {};

      const conversation = await repo.create({
        tenantId,
        userId: uid,
        title,
      });

      request.log.info({ conversationId: conversation._id }, 'Conversation created');

      return reply.success(conversation);
    },
  );

  // ── GET /conversations/:id ─────────────────────────
  app.get<{ Params: ConversationParams }>(
    '/conversations/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { uid, tenantId } = request.user;
      const { id } = request.params;

      if (!isValidObjectId(id)) {
        return reply.status(400).send({ success: false, error: { message: 'Invalid conversation ID' } });
      }

      const conversation = await repo.findById(id, tenantId, uid);
      if (!conversation) {
        return reply.status(404).send({
          success: false,
          error: { message: 'Conversation not found' },
        });
      }

      return reply.success(conversation);
    },
  );

  // ── POST /conversations/:id/messages ───────────────
  app.post<{ Params: ConversationParams; Body: AddMessageBody }>(
    '/conversations/:id/messages',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { uid, tenantId } = request.user;
      const { id } = request.params;
      const { role, content, files } = request.body;

      if (!isValidObjectId(id)) {
        return reply.status(400).send({ success: false, error: { message: 'Invalid conversation ID' } });
      }

      const conversation = await repo.addMessage(id, tenantId, uid, {
        role,
        content,
        files,
        timestamp: new Date(),
      });

      if (!conversation) {
        return reply.status(404).send({
          success: false,
          error: { message: 'Conversation not found' },
        });
      }

      return reply.success({ ok: true });
    },
  );

  // ── PUT /conversations/:id/title ───────────────────
  app.put<{ Params: ConversationParams; Body: UpdateTitleBody }>(
    '/conversations/:id/title',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { uid, tenantId } = request.user;
      const { id } = request.params;
      const { title } = request.body;

      if (!isValidObjectId(id)) {
        return reply.status(400).send({ success: false, error: { message: 'Invalid conversation ID' } });
      }

      const conversation = await repo.updateTitle(id, tenantId, uid, title);
      if (!conversation) {
        return reply.status(404).send({
          success: false,
          error: { message: 'Conversation not found' },
        });
      }

      return reply.success({ ok: true });
    },
  );

  // ── DELETE /conversations/:id ──────────────────────
  app.delete<{ Params: ConversationParams }>(
    '/conversations/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { uid, tenantId } = request.user;
      const { id } = request.params;

      if (!isValidObjectId(id)) {
        return reply.status(400).send({ success: false, error: { message: 'Invalid conversation ID' } });
      }

      const deleted = await repo.softDelete(id, tenantId, uid);
      if (!deleted) {
        return reply.status(404).send({
          success: false,
          error: { message: 'Conversation not found' },
        });
      }

      request.log.info({ conversationId: id }, 'Conversation deleted');

      return reply.success({ id, deletedAt: new Date().toISOString() });
    },
  );
}
