import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { ISkill } from '@agentforge/shared';

// ── Extended interface with embedding (internal) ────
export interface ISkillDocument extends Omit<ISkill, '_id'>, Document {
  embedding?: number[];
}

// ── Sub-schemas ─────────────────────────────────────

const ExampleSchema = new Schema(
  {
    input: { type: String, required: true },
    output: { type: String, required: true },
  },
  { _id: false },
);

const TemplateSchema = new Schema(
  {
    persona: { type: String, required: true },
    process: { type: [String], required: true },
    outputFormat: { type: String, required: true },
    constraints: { type: [String], default: [] },
    examples: { type: [ExampleSchema], default: undefined },
    systemPrompt: { type: String, required: true },
  },
  { _id: false },
);

const StatsSchema = new Schema(
  {
    useCount: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
    avgSatisfaction: { type: Number, default: null },
    lastUsedAt: { type: Date, default: undefined },
  },
  { _id: false },
);

// ── Main schema ─────────────────────────────────────

const SkillSchema = new Schema<ISkillDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String, required: true },
    domain: { type: [String], default: [] },
    pattern: { type: String, required: true },
    tags: { type: [String], default: [] },
    template: { type: TemplateSchema, required: true },
    version: { type: Number, default: 1 },
    parentSkillId: { type: String, default: undefined },
    isSystem: { type: Boolean, default: false },
    isPublic: { type: Boolean, default: false },
    stats: { type: StatsSchema, default: () => ({}) },
    searchVector: { type: String, default: undefined },
    embedding: { type: [Number], default: undefined, select: false },
    createdBy: { type: String, required: true },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

// ── Indexes ─────────────────────────────────────────

SkillSchema.index({ tenantId: 1, slug: 1 }, { unique: true });
SkillSchema.index({ tenantId: 1, domain: 1 });
SkillSchema.index({ tenantId: 1, tags: 1 });
SkillSchema.index({ tenantId: 1, 'stats.useCount': -1 });
SkillSchema.index({ searchVector: 'text' });
SkillSchema.index({ tenantId: 1, isPublic: 1 });

// ── Model ───────────────────────────────────────────

export const SkillModel: Model<ISkillDocument> =
  mongoose.models['Skill'] as Model<ISkillDocument> ??
  mongoose.model<ISkillDocument>('Skill', SkillSchema, 'skills');
