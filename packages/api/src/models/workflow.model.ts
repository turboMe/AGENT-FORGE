import mongoose, { Schema, Document, type Model } from 'mongoose';
import type { IWorkflow } from '@agentforge/shared';

export interface IWorkflowDocument extends Omit<IWorkflow, '_id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const WorkflowParameterSchema = new Schema(
  {
    key: { type: String, required: true },
    value: { type: String, default: '' },
    type: { type: String, enum: ['string', 'number', 'boolean', 'select'], default: 'string' },
    label: { type: String, required: true },
    description: { type: String },
    options: [{ type: String }],
  },
  { _id: false },
);

const WorkflowSchema = new Schema<IWorkflowDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'failed', 'draft'],
      default: 'draft',
    },
    skillId: { type: String, default: null },
    skillName: { type: String, default: null },
    schedule: { type: String, default: null },
    parameters: [WorkflowParameterSchema],
    stats: {
      runCount: { type: Number, default: 0 },
      successRate: { type: Number, default: 0 },
      avgDurationMs: { type: Number, default: 0 },
      lastRunAt: { type: Date, default: null },
    },
    createdBy: { type: String, required: true },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

// Indexes
WorkflowSchema.index({ tenantId: 1, status: 1 });
WorkflowSchema.index({ tenantId: 1, createdAt: -1 });

export const WorkflowModel: Model<IWorkflowDocument> =
  mongoose.models.Workflow || mongoose.model<IWorkflowDocument>('Workflow', WorkflowSchema);
