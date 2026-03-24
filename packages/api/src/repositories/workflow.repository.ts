import type { IWorkflow, IWorkflowRun, WorkflowStatus } from '@agentforge/shared';
import { WorkflowModel, type IWorkflowDocument } from '../models/workflow.model.js';
import { WorkflowRunModel } from '../models/workflow-run.model.js';
import type { FilterQuery } from 'mongoose';

function toPlain(doc: IWorkflowDocument): IWorkflow {
  return {
    _id: String(doc._id),
    tenantId: doc.tenantId,
    name: doc.name,
    description: doc.description,
    status: doc.status as WorkflowStatus,
    skillId: doc.skillId ?? undefined,
    skillName: doc.skillName ?? undefined,
    schedule: doc.schedule ?? undefined,
    parameters: doc.parameters ?? [],
    stats: {
      runCount: doc.stats?.runCount ?? 0,
      successRate: doc.stats?.successRate ?? 0,
      avgDurationMs: doc.stats?.avgDurationMs ?? 0,
      lastRunAt: doc.stats?.lastRunAt ?? undefined,
    },
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    deletedAt: doc.deletedAt ?? undefined,
  };
}

export interface FindWorkflowsOptions {
  status?: string;
  search?: string;
  page: number;
  limit: number;
}

export class WorkflowRepository {
  async findByTenant(
    tenantId: string,
    opts: FindWorkflowsOptions,
  ): Promise<{ workflows: IWorkflow[]; total: number }> {
    const filter: FilterQuery<IWorkflowDocument> = {
      tenantId,
      deletedAt: null,
    };

    if (opts.status) {
      filter.status = opts.status;
    }

    if (opts.search) {
      filter.$or = [
        { name: { $regex: opts.search, $options: 'i' } },
        { description: { $regex: opts.search, $options: 'i' } },
      ];
    }

    const [docs, total] = await Promise.all([
      WorkflowModel.find(filter)
        .sort({ updatedAt: -1 })
        .skip((opts.page - 1) * opts.limit)
        .limit(opts.limit),
      WorkflowModel.countDocuments(filter),
    ]);

    return {
      workflows: docs.map(toPlain),
      total,
    };
  }

  async findById(id: string, tenantId: string): Promise<IWorkflow | null> {
    const doc = await WorkflowModel.findOne({ _id: id, tenantId, deletedAt: null });
    return doc ? toPlain(doc) : null;
  }

  async create(data: {
    tenantId: string;
    createdBy: string;
    name: string;
    description?: string;
    skillId?: string;
    skillName?: string;
    schedule?: string;
    parameters?: IWorkflow['parameters'];
  }): Promise<IWorkflow> {
    const doc = await WorkflowModel.create({
      tenantId: data.tenantId,
      name: data.name,
      description: data.description ?? '',
      status: 'draft' as const,
      skillId: data.skillId,
      skillName: data.skillName,
      schedule: data.schedule,
      parameters: data.parameters ?? [],
      stats: { runCount: 0, successRate: 0, avgDurationMs: 0 },
      createdBy: data.createdBy,
    });
    return toPlain(doc);
  }

  async update(
    id: string,
    tenantId: string,
    updates: Partial<Pick<IWorkflow, 'name' | 'description' | 'parameters' | 'schedule' | 'skillId' | 'skillName'>>,
  ): Promise<IWorkflow | null> {
    const doc = await WorkflowModel.findOneAndUpdate(
      { _id: id, tenantId, deletedAt: null },
      { $set: updates },
      { new: true },
    );
    return doc ? toPlain(doc) : null;
  }

  async updateStatus(id: string, tenantId: string, status: WorkflowStatus): Promise<IWorkflow | null> {
    const doc = await WorkflowModel.findOneAndUpdate(
      { _id: id, tenantId, deletedAt: null },
      { $set: { status } },
      { new: true },
    );
    return doc ? toPlain(doc) : null;
  }

  async softDelete(id: string, tenantId: string): Promise<boolean> {
    const result = await WorkflowModel.updateOne(
      { _id: id, tenantId, deletedAt: null },
      { $set: { deletedAt: new Date() } },
    );
    return result.modifiedCount === 1;
  }

  // ── Runs ────────────────────────────────────────────

  async findRuns(workflowId: string, tenantId: string, limit = 20): Promise<IWorkflowRun[]> {
    const docs = await WorkflowRunModel.find({ workflowId, tenantId })
      .sort({ startedAt: -1 })
      .limit(limit);

    return docs.map((doc) => ({
      _id: String(doc._id),
      workflowId: doc.workflowId,
      tenantId: doc.tenantId,
      status: doc.status as IWorkflowRun['status'],
      startedAt: doc.startedAt,
      completedAt: doc.completedAt ?? undefined,
      durationMs: doc.durationMs,
      output: doc.output ?? undefined,
      error: doc.error ?? undefined,
      triggeredBy: doc.triggeredBy as IWorkflowRun['triggeredBy'],
    }));
  }
}
