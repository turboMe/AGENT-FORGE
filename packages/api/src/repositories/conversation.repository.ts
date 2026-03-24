import type { IConversation, IConversationMessage } from '@agentforge/shared';
import { ConversationModel, type IConversationDocument } from '../models/conversation.model.js';
import type { FilterQuery } from 'mongoose';

function toPlain(doc: IConversationDocument): IConversation {
  return {
    _id: String(doc._id),
    tenantId: doc.tenantId,
    userId: doc.userId,
    title: doc.title,
    messages: (doc.messages ?? []).map((m) => ({
      role: m.role,
      content: m.content,
      files: m.files ?? undefined,
      timestamp: m.timestamp,
    })),
    lastTaskId: doc.lastTaskId ?? undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    deletedAt: doc.deletedAt ?? undefined,
  };
}

export interface FindConversationsOptions {
  search?: string;
  page: number;
  limit: number;
}

export class ConversationRepository {
  async findByUser(
    tenantId: string,
    userId: string,
    opts: FindConversationsOptions,
  ): Promise<{ conversations: IConversation[]; total: number }> {
    const filter: FilterQuery<IConversationDocument> = {
      tenantId,
      userId,
      deletedAt: null,
    };

    if (opts.search) {
      filter.title = { $regex: opts.search, $options: 'i' };
    }

    const [docs, total] = await Promise.all([
      ConversationModel.find(filter)
        .sort({ updatedAt: -1 })
        .skip((opts.page - 1) * opts.limit)
        .limit(opts.limit)
        // Return only metadata, not full messages (for list view)
        .select('-messages'),
      ConversationModel.countDocuments(filter),
    ]);

    return {
      conversations: docs.map(toPlain),
      total,
    };
  }

  async findById(id: string, tenantId: string, userId: string): Promise<IConversation | null> {
    const doc = await ConversationModel.findOne({
      _id: id,
      tenantId,
      userId,
      deletedAt: null,
    });
    return doc ? toPlain(doc) : null;
  }

  async create(data: {
    tenantId: string;
    userId: string;
    title?: string;
  }): Promise<IConversation> {
    const doc = await ConversationModel.create({
      tenantId: data.tenantId,
      userId: data.userId,
      title: data.title ?? '',
      messages: [],
    });
    return toPlain(doc);
  }

  async addMessage(
    id: string,
    tenantId: string,
    userId: string,
    message: IConversationMessage,
  ): Promise<IConversation | null> {
    const doc = await ConversationModel.findOneAndUpdate(
      { _id: id, tenantId, userId, deletedAt: null },
      {
        $push: { messages: message },
        $set: { updatedAt: new Date() },
      },
      { new: true },
    );
    return doc ? toPlain(doc) : null;
  }

  async updateTitle(id: string, tenantId: string, userId: string, title: string): Promise<IConversation | null> {
    const doc = await ConversationModel.findOneAndUpdate(
      { _id: id, tenantId, userId, deletedAt: null },
      { $set: { title } },
      { new: true },
    );
    return doc ? toPlain(doc) : null;
  }

  async updateLastTaskId(id: string, tenantId: string, taskId: string): Promise<void> {
    await ConversationModel.updateOne(
      { _id: id, tenantId, deletedAt: null },
      { $set: { lastTaskId: taskId } },
    );
  }

  async softDelete(id: string, tenantId: string, userId: string): Promise<boolean> {
    const result = await ConversationModel.updateOne(
      { _id: id, tenantId, userId, deletedAt: null },
      { $set: { deletedAt: new Date() } },
    );
    return result.modifiedCount === 1;
  }
}
