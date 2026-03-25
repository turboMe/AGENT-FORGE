"use client";

import { useState, useEffect, useCallback } from "react";
import { Workflow as WorkflowIcon, Sparkles } from "lucide-react";
import { WorkflowCard } from "@/components/workflows/workflow-card";
import { ExecutionTimeline } from "@/components/workflows/execution-timeline";
import { EditParametersModal } from "@/components/workflows/edit-parameters-modal";
import { ViewLogsModal } from "@/components/workflows/view-logs-modal";
import {
  fetchWorkflows,
  fetchWorkflowRuns,
  pauseWorkflow,
  resumeWorkflow,
  deleteWorkflow,
  updateWorkflowParams,
} from "@/lib/api";
import type {
  Workflow,
  WorkflowRun,
  WorkflowParameter,
  WorkflowStatus,
} from "@/types/workflow";

// ── Skeleton ────────────────────────────────────────

function WorkflowCardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl border border-border/50 bg-card overflow-hidden animate-pulse">
      <div className="h-1 w-full bg-secondary" />
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="h-4 w-3/4 rounded bg-secondary" />
            <div className="mt-2 h-3 w-full rounded bg-secondary/60" />
            <div className="mt-1 h-3 w-2/3 rounded bg-secondary/60" />
          </div>
          <div className="h-5 w-14 rounded-full bg-secondary" />
        </div>
        <div className="mb-4 flex gap-1.5">
          <div className="h-4 w-20 rounded-md bg-secondary" />
          <div className="h-4 w-16 rounded-md bg-secondary" />
        </div>
        <div className="mt-auto flex gap-4 border-t border-border/30 pt-3">
          <div className="h-3 w-10 rounded bg-secondary" />
          <div className="h-3 w-8 rounded bg-secondary" />
          <div className="h-3 w-14 rounded bg-secondary" />
        </div>
      </div>
      <div className="h-11 border-t border-border/30 bg-secondary/20" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/50">
        <WorkflowIcon className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="mb-1 text-sm font-medium text-foreground">
        No workflows yet
      </h3>
      <p className="text-xs text-muted-foreground">
        Create a workflow to automate repetitive tasks with your skills.
      </p>
    </div>
  );
}

// ── Delete confirmation ─────────────────────────────

function DeleteWorkflowModal({
  workflow,
  onConfirm,
  onCancel,
}: {
  workflow: Workflow;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm fade-in-0"
        onClick={onCancel}
      />
      <div className="relative z-10 mx-4 w-full max-w-sm animate-in slide-in-from-bottom-2">
        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-2xl shadow-black/40">
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            Delete Workflow
          </h3>
          <p className="mb-5 text-xs text-muted-foreground leading-relaxed">
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">{workflow.name}</span>?
            This action cannot be undone. All execution logs will be preserved.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 transition-colors shadow-lg shadow-red-600/20"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Status filter tabs ──────────────────────────────

const STATUS_TABS: { label: string; value: WorkflowStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Paused", value: "paused" },
  { label: "Failed", value: "failed" },
  { label: "Completed", value: "completed" },
  { label: "Draft", value: "draft" },
];

// ── Page ────────────────────────────────────────────

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [allRuns, setAllRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | "all">("all");

  // Modal state
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [logsWorkflow, setLogsWorkflow] = useState<Workflow | null>(null);
  const [logsRuns, setLogsRuns] = useState<WorkflowRun[]>([]);
  const [, setLogsLoading] = useState(false);
  const [deletingWorkflow, setDeletingWorkflow] = useState<Workflow | null>(null);

  // ── Load workflows from API ─────────────────────
  const loadWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchWorkflows({
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: 50,
      });
      setWorkflows(data.workflows);

      // Load runs for all workflows for the timeline
      const runPromises = data.workflows.map((w) =>
        fetchWorkflowRuns(w.id, 5).catch(() => [])
      );
      const runsPerWorkflow = await Promise.all(runPromises);
      const merged = runsPerWorkflow
        .flat()
        .sort(
          (a, b) =>
            new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
        );
      setAllRuns(merged);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  // Filter workflows (client-side as backup if statusFilter was "all")
  const filtered =
    statusFilter === "all"
      ? workflows
      : workflows.filter((w) => w.status === statusFilter);

  // ── Handlers ────────────────────────────────────

  const handlePause = useCallback(
    async (workflow: Workflow) => {
      // Optimistic update
      setWorkflows((prev) =>
        prev.map((w) =>
          w.id === workflow.id
            ? { ...w, status: "paused" as WorkflowStatus, updatedAt: new Date().toISOString() }
            : w
        )
      );
      try {
        await pauseWorkflow(workflow.id);
      } catch {
        // Revert on failure
        loadWorkflows();
      }
    },
    [loadWorkflows]
  );

  const handleResume = useCallback(
    async (workflow: Workflow) => {
      setWorkflows((prev) =>
        prev.map((w) =>
          w.id === workflow.id
            ? { ...w, status: "active" as WorkflowStatus, updatedAt: new Date().toISOString() }
            : w
        )
      );
      try {
        await resumeWorkflow(workflow.id);
      } catch {
        loadWorkflows();
      }
    },
    [loadWorkflows]
  );

  const handleDelete = useCallback(async () => {
    if (!deletingWorkflow) return;
    const target = deletingWorkflow;
    setDeletingWorkflow(null);
    setWorkflows((prev) => prev.filter((w) => w.id !== target.id));
    try {
      await deleteWorkflow(target.id);
    } catch {
      loadWorkflows();
    }
  }, [deletingWorkflow, loadWorkflows]);

  const handleSaveParams = useCallback(
    async (workflowId: string, parameters: WorkflowParameter[]) => {
      setWorkflows((prev) =>
        prev.map((w) =>
          w.id === workflowId
            ? { ...w, parameters, updatedAt: new Date().toISOString() }
            : w
        )
      );
      setEditingWorkflow(null);
      try {
        await updateWorkflowParams(workflowId, parameters);
      } catch {
        loadWorkflows();
      }
    },
    [loadWorkflows]
  );

  const handleViewLogs = useCallback(async (workflow: Workflow) => {
    setLogsWorkflow(workflow);
    setLogsLoading(true);
    try {
      const runs = await fetchWorkflowRuns(workflow.id, 50);
      setLogsRuns(runs);
    } catch {
      setLogsRuns([]);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  // Status counts
  const counts = workflows.reduce(
    (acc, w) => {
      acc[w.status] = (acc[w.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-xl px-6 py-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Workflows</h1>
            <p className="text-xs text-muted-foreground">
              {filtered.length} workflow{filtered.length !== 1 ? "s" : ""}{" "}
              {statusFilter !== "all" ? `(${statusFilter})` : "total"} ·{" "}
              {counts.active || 0} active
            </p>
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-thin pb-1">
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.value;
            const count =
              tab.value === "all"
                ? workflows.length
                : counts[tab.value] || 0;

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className="ml-1.5 text-[10px] text-muted-foreground/60">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Error banner */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400">
            Failed to load workflows: {error}
            <button
              type="button"
              onClick={loadWorkflows}
              className="ml-2 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Execution Timeline — global overview */}
        {allRuns.length > 0 && <ExecutionTimeline runs={allRuns} />}

        {/* Workflow Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 stagger-in">
            {Array.from({ length: 6 }).map((_, i) => (
              <WorkflowCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 stagger-in">
            {filtered.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                onPause={handlePause}
                onResume={handleResume}
                onDelete={(w) => setDeletingWorkflow(w)}
                onEditParams={(w) => setEditingWorkflow(w)}
                onViewLogs={handleViewLogs}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ────────────────────────────────── */}

      {editingWorkflow && (
        <EditParametersModal
          workflow={editingWorkflow}
          onSave={handleSaveParams}
          onCancel={() => setEditingWorkflow(null)}
        />
      )}

      {logsWorkflow && (
        <ViewLogsModal
          workflow={logsWorkflow}
          runs={logsRuns}
          onClose={() => {
            setLogsWorkflow(null);
            setLogsRuns([]);
          }}
        />
      )}

      {deletingWorkflow && (
        <DeleteWorkflowModal
          workflow={deletingWorkflow}
          onConfirm={handleDelete}
          onCancel={() => setDeletingWorkflow(null)}
        />
      )}
    </div>
  );
}
