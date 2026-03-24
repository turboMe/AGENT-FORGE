import mongoose, { Schema, Document, type Model } from 'mongoose';
import type { IWorkflowRun } from '@agentforge/shared';

export interface IWorkflowRunDocument extends Omit<IWorkflowRun, '_id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const WorkflowRunSchema = new Schema<IWorkflowRunDocument>(
  {
    workflowId: { type: String, required: true, index: true },
    tenantId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['success', 'failed', 'running', 'cancelled'],
      required: true,
    },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date, default: null },
    durationMs: { type: Number, default: 0 },
    output: { type: String, default: null },
    error: { type: String, default: null },
    triggeredBy: {
      type: String,
      enum: ['schedule', 'manual'],
      default: 'manual',
    },
  },
  {
    timestamps: false,
  },
);

// Compound index for listing runs per workflow sorted by time
WorkflowRunSchema.index({ workflowId: 1, startedAt: -1 });
WorkflowRunSchema.index({ tenantId: 1, startedAt: -1 });

export const WorkflowRunModel: Model<IWorkflowRunDocument> =
  mongoose.models.WorkflowRun || mongoose.model<IWorkflowRunDocument>('WorkflowRun', WorkflowRunSchema);
