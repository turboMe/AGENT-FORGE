import mongoose from 'mongoose';
import type { IUserProfile } from '@agentforge/shared';
import { UserProfileModel } from '../models/user-profile.model.js';

/**
 * Get or register the Skill model on the API's own mongoose connection.
 * Same pattern as skills.ts and marketplace.ts.
 */
function getSkillModel() {
  if (mongoose.models['Skill']) {
    return mongoose.models['Skill'];
  }
  // If not registered yet, the Skills route registers it first.
  // Just return null — we'll handle gracefully.
  return null;
}

function getDecisionModel() {
  if (mongoose.models['Decision'] || mongoose.models['DecisionLog']) {
    return mongoose.models['Decision'] || mongoose.models['DecisionLog'];
  }
  return null;
}

export class UserProfileRepository {
  /**
   * Find existing profile or create a new one with sensible defaults.
   * This is the core "auto-provision" pattern — first visit creates the profile.
   */
  async findOrCreate(
    firebaseUid: string,
    tenantId: string,
    email: string,
  ): Promise<IUserProfile> {
    const doc = await UserProfileModel.findOneAndUpdate(
      { firebaseUid, tenantId },
      {
        $setOnInsert: {
          firebaseUid,
          tenantId,
          displayName: email.split('@')[0] ?? 'User',
          email,
          plan: 'free',
          preferences: {
            theme: 'dark',
            defaultModel: 'claude-sonnet-4',
            notifications: { email: true, push: true, weeklyReport: false },
          },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return this.toJSON(doc);
  }

  /**
   * Partial update of profile fields (displayName, email, preferences, avatarUrl).
   */
  async update(
    firebaseUid: string,
    tenantId: string,
    updates: Partial<Pick<IUserProfile, 'displayName' | 'email' | 'avatarUrl' | 'preferences'>>,
  ): Promise<IUserProfile> {
    // Flatten nested preferences for $set so we don't overwrite the whole object
    const setFields: Record<string, unknown> = {};

    if (updates.displayName !== undefined) setFields['displayName'] = updates.displayName;
    if (updates.email !== undefined) setFields['email'] = updates.email;
    if (updates.avatarUrl !== undefined) setFields['avatarUrl'] = updates.avatarUrl;

    if (updates.preferences) {
      const p = updates.preferences;
      if (p.theme !== undefined) setFields['preferences.theme'] = p.theme;
      if (p.defaultModel !== undefined) setFields['preferences.defaultModel'] = p.defaultModel;
      if (p.notifications) {
        if (p.notifications.email !== undefined)
          setFields['preferences.notifications.email'] = p.notifications.email;
        if (p.notifications.push !== undefined)
          setFields['preferences.notifications.push'] = p.notifications.push;
        if (p.notifications.weeklyReport !== undefined)
          setFields['preferences.notifications.weeklyReport'] = p.notifications.weeklyReport;
      }
    }

    const doc = await UserProfileModel.findOneAndUpdate(
      { firebaseUid, tenantId },
      { $set: setFields },
      { new: true },
    );

    if (!doc) {
      // Profile doesn't exist yet — auto-provision
      return this.findOrCreate(firebaseUid, tenantId, updates.email ?? '');
    }

    return this.toJSON(doc);
  }

  /**
   * Aggregate real usage stats from existing collections.
   */
  async getUsageStats(tenantId: string): Promise<{
    apiCalls: { used: number; limit: number };
    storage: { used: number; limit: number };
    skills: { used: number; limit: number };
  }> {
    let decisionsCount = 0;
    let skillsCount = 0;

    const DecisionModel = getDecisionModel();
    if (DecisionModel) {
      decisionsCount = await DecisionModel.countDocuments({ tenantId });
    }

    const SkillModel = getSkillModel();
    if (SkillModel) {
      skillsCount = await SkillModel.countDocuments({ tenantId, deletedAt: null });
    }

    return {
      apiCalls: { used: decisionsCount, limit: 5000 },
      storage: { used: 0, limit: 512 },
      skills: { used: skillsCount, limit: 25 },
    };
  }

  private toJSON(doc: InstanceType<typeof UserProfileModel>): IUserProfile {
    return {
      _id: String(doc._id),
      firebaseUid: doc.firebaseUid,
      tenantId: doc.tenantId,
      displayName: doc.displayName,
      email: doc.email,
      avatarUrl: doc.avatarUrl ?? undefined,
      plan: doc.plan,
      preferences: {
        theme: doc.preferences.theme,
        defaultModel: doc.preferences.defaultModel,
        notifications: {
          email: doc.preferences.notifications.email,
          push: doc.preferences.notifications.push,
          weeklyReport: doc.preferences.notifications.weeklyReport,
        },
      },
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
