import type { IDecision } from '@agentforge/shared';
import type { IDecisionLogger } from './types.js';
import mongoose, { Schema, type Model } from 'mongoose';

// ── Decision Schema ─────────────────────────────────

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
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
    collection: 'decisions',
  },
);

// Compound index for tenant-scoped queries
DecisionSchema.index({ tenantId: 1, createdAt: -1 });

// ── Model factory (testable) ────────────────────────

export function getDecisionModel(connection?: mongoose.Connection): Model<any> {
  const conn = connection ?? mongoose;
  if (conn.models['Decision']) {
    return conn.models['Decision'] as Model<any>;
  }
  return conn.model('Decision', DecisionSchema);
}

// ── Lean Decision Type (for .lean() queries) ────────

interface LeanDecision {
  _id: unknown;
  tenantId: string;
  taskId: string;
  timestamp: Date;
  taskSummary: string;
  taskType: 'text' | 'automation';
  domain: string[];
  complexity: 'simple' | 'medium' | 'complex';
  searchKeywords: string[];
  searchResult: 'exact_match' | 'partial_match' | 'no_match';
  matchedSkillId?: string;
  matchScore: number;
  actionTaken: 'use_existing' | 'adapt_existing' | 'create_new';
  newSkillCreated?: string;
  executionSuccess: boolean;
  createdAt: Date;
}

// ── Decision Logger ─────────────────────────────────

export class DecisionLogger implements IDecisionLogger {
  private readonly model: Model<any>;

  constructor(connection?: mongoose.Connection) {
    this.model = getDecisionModel(connection);
  }

  /**
   * Log a routing decision to MongoDB.
   */
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

  /**
   * Find a decision by its associated task ID.
   */
  async findByTask(taskId: string): Promise<IDecision | null> {
    const doc = (await this.model.findOne({ taskId }).lean()) as LeanDecision | null;
    return doc ? this.toDecision(doc) : null;
  }

  /**
   * Find decisions for a tenant, sorted by newest first.
   */
  async findByTenant(tenantId: string, limit = 50): Promise<IDecision[]> {
    const docs = (await this.model
      .find({ tenantId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()) as unknown as LeanDecision[];

    return docs.map((d) => this.toDecision(d));
  }

  /**
   * Convert lean document to IDecision.
   */
  private toDecision(doc: LeanDecision): IDecision {
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
