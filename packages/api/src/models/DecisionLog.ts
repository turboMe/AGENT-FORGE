import mongoose, { type Document, type Model } from 'mongoose';
import type { IDecision } from '@agentforge/shared';

// We map IDecision exactly, excluding the MongoDB _id string type
export interface IDecisionLogDoc extends Omit<IDecision, '_id'>, Document {
  tenantId: string;
  costUsd: number;
  tokens: number;
  latencyMs: number;
}

const decisionLogSchema = new mongoose.Schema<IDecisionLogDoc>(
  {
    tenantId: { type: String, required: true, index: true },
    taskId: { type: String, required: true },
    taskSummary: { type: String, required: true },
    taskType: { type: String, enum: ['text', 'automation'], required: true },
    domain: { type: [String], default: [] },
    complexity: { type: String, enum: ['simple', 'medium', 'complex'], required: true },
    searchKeywords: { type: [String], default: [] },
    searchResult: { type: String, enum: ['exact_match', 'partial_match', 'no_match'], required: true },
    matchedSkillId: { type: String, default: null },
    matchScore: { type: Number, required: true },
    actionTaken: {
      type: String,
      enum: ['create_new', 'use_existing', 'adapt_existing'],
      required: true,
    },
    newSkillCreated: { type: String, default: null },
    executionSuccess: { type: Boolean, required: true },
    costUsd: { type: Number, default: 0 },
    tokens: { type: Number, default: 0 },
    latencyMs: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    collection: 'decisions',
  },
);

// Indexes for analytics/filters
decisionLogSchema.index({ tenantId: 1, createdAt: -1 });
decisionLogSchema.index({ tenantId: 1, actionTaken: 1 });
decisionLogSchema.index({ tenantId: 1, executionSuccess: 1 });

export const DecisionLog: Model<IDecisionLogDoc> =
  mongoose.models.DecisionLog || mongoose.model<IDecisionLogDoc>('DecisionLog', decisionLogSchema);
