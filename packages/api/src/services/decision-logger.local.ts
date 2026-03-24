import mongoose, { Schema, type Model } from 'mongoose';
import type { IDecision } from '@agentforge/shared';

// ── Decision Schema (registered on API's mongoose) ──

const DecisionSchema = new Schema(
  {
    tenantId: { type: String, required: true, index: true },
    taskId: { type: String, required: true, index: true, unique: true },
    timestamp: { type: Date, default: Date.now },
    taskSummary: { type: String, required: true },
    taskType: { type: String, enum: ['text', 'automation'], required: true },
    domain: { type: [String], default: [] },
    complexity: { type: String, enum: ['simple', 'medium', 'complex'], required: true },
    searchKeywords: { type: [String], default: [] },
    searchResult: {
      type: String,
      enum: ['exact_match', 'partial_match', 'no_match'],
      required: true,
    },
    matchedSkillId: { type: String },
    matchScore: { type: Number, required: true },
    actionTaken: {
      type: String,
      enum: ['use_existing', 'adapt_existing', 'create_new'],
      required: true,
    },
    newSkillCreated: { type: String },
    executionSuccess: { type: Boolean, default: false },
    costUsd: { type: Number, default: 0 },
    tokens: { type: Number, default: 0 },
    latencyMs: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
    collection: 'decisions',
  },
);

DecisionSchema.index({ tenantId: 1, createdAt: -1 });

function getDecisionModel(): Model<any> {
  if (mongoose.models['Decision']) {
    return mongoose.models['Decision'] as Model<any>;
  }
  return mongoose.model('Decision', DecisionSchema);
}

// ── Local Decision Logger ───────────────────────────

export class LocalDecisionLogger {
  private readonly model: Model<any>;

  constructor() {
    this.model = getDecisionModel();
  }

  async log(decision: IDecision): Promise<IDecision> {
    const doc = await this.model.create({
      tenantId: decision.tenantId,
      taskId: decision.taskId,
      timestamp: decision.timestamp ?? new Date(),
      taskSummary: decision.taskSummary,
      taskType: decision.taskType,
      domain: decision.domain,
      complexity: decision.complexity,
      searchKeywords: decision.searchKeywords,
      searchResult: decision.searchResult,
      matchedSkillId: decision.matchedSkillId,
      matchScore: decision.matchScore,
      actionTaken: decision.actionTaken,
      newSkillCreated: decision.newSkillCreated,
      executionSuccess: decision.executionSuccess,
    });

    return this.toDecision(doc);
  }

  async findByTask(taskId: string): Promise<IDecision | null> {
    const doc = await this.model.findOne({ taskId }).lean();
    return doc ? this.toDecision(doc as any) : null;
  }

  async markSuccess(taskId: string, metrics?: { costUsd?: number; tokens?: number; latencyMs?: number }): Promise<void> {
    const update: Record<string, unknown> = { executionSuccess: true };
    if (metrics?.costUsd !== undefined) update.costUsd = metrics.costUsd;
    if (metrics?.tokens !== undefined) update.tokens = metrics.tokens;
    if (metrics?.latencyMs !== undefined) update.latencyMs = metrics.latencyMs;
    await this.model.updateOne({ taskId }, { $set: update });
  }

  async findByTenant(tenantId: string, limit = 50): Promise<IDecision[]> {
    const docs = await this.model
      .find({ tenantId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return docs.map((d: any) => this.toDecision(d));
  }

  private toDecision(doc: any): IDecision {
    return {
      _id: String(doc._id),
      tenantId: doc.tenantId,
      taskId: doc.taskId,
      timestamp: doc.timestamp,
      taskSummary: doc.taskSummary,
      taskType: doc.taskType,
      domain: doc.domain,
      complexity: doc.complexity,
      searchKeywords: doc.searchKeywords,
      searchResult: doc.searchResult,
      matchedSkillId: doc.matchedSkillId,
      matchScore: doc.matchScore,
      actionTaken: doc.actionTaken,
      newSkillCreated: doc.newSkillCreated,
      executionSuccess: doc.executionSuccess,
      createdAt: doc.createdAt,
    };
  }
}
