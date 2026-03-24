import mongoose, { Schema, Document, type Model } from 'mongoose';
import type { IUserProfile } from '@agentforge/shared';

export interface IUserProfileDocument extends Omit<IUserProfile, '_id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const UserProfileSchema = new Schema<IUserProfileDocument>(
  {
    firebaseUid: { type: String, required: true, index: true },
    tenantId: { type: String, required: true, index: true },
    displayName: { type: String, default: '' },
    email: { type: String, default: '' },
    avatarUrl: { type: String, default: null },
    plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
    preferences: {
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'dark' },
      defaultModel: { type: String, default: 'claude-sonnet-4' },
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        weeklyReport: { type: Boolean, default: false },
      },
    },
  },
  {
    timestamps: true,
  },
);

// Unique compound index — one profile per user per tenant
UserProfileSchema.index({ firebaseUid: 1, tenantId: 1 }, { unique: true });

export const UserProfileModel: Model<IUserProfileDocument> =
  mongoose.models.UserProfile || mongoose.model<IUserProfileDocument>('UserProfile', UserProfileSchema);
