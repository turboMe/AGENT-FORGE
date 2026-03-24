import mongoose, { Schema, Document, type Model } from 'mongoose';
import type { IConversation } from '@agentforge/shared';

export interface IConversationDocument extends Omit<IConversation, '_id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const ConversationFileSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
    size: { type: Number, required: true },
    content: { type: String },
  },
  { _id: false },
);

const ConversationMessageSchema = new Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    files: [ConversationFileSchema],
    timestamp: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const ConversationSchema = new Schema<IConversationDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, default: '' },
    messages: [ConversationMessageSchema],
    lastTaskId: { type: String, default: null },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

// Compound indexes for user-scoped queries
ConversationSchema.index({ tenantId: 1, userId: 1, updatedAt: -1 });
ConversationSchema.index({ tenantId: 1, userId: 1, deletedAt: 1 });

export const ConversationModel: Model<IConversationDocument> =
  mongoose.models.Conversation || mongoose.model<IConversationDocument>('Conversation', ConversationSchema);
