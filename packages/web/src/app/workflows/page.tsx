"use client";

import { useState, useCallback } from "react";
import { Workflow as WorkflowIcon, Sparkles } from "lucide-react";
import { WorkflowCard } from "@/components/workflows/workflow-card";
import { ExecutionTimeline } from "@/components/workflows/execution-timeline";
import { EditParametersModal } from "@/components/workflows/edit-parameters-modal";
import { ViewLogsModal } from "@/components/workflows/view-logs-modal";
import type {
  Workflow,
  WorkflowRun,
  WorkflowParameter,
  WorkflowStatus,
} from "@/types/workflow";

// ── Mock data ──────────────────────────────────────

const MOCK_RUNS: WorkflowRun[] = [
  {
    id: "run_001",
    workflowId: "wf_001",
    status: "success",
    startedAt: "2026-03-22T10:00:00Z",
    completedAt: "2026-03-22T10:00:12Z",
    durationMs: 12340,
    output:
      "Processed 45 outreach leads.\n\nGenerated 45 personalized cold emails.\nAvg confidence: 0.92\nDelivered to queue: 45/45",
    error: null,
    triggeredBy: "schedule",
  },
  {
    id: "run_002",
    workflowId: "wf_001",
    status: "success",
    startedAt: "2026-03-22T06:00:00Z",
    completedAt: "2026-03-22T06:00:08Z",
    durationMs: 8200,
    output: "Processed 32 outreach leads.\nGenerated 32 personalized cold emails.",
    error: null,
    triggeredBy: "schedule",
  },
  {
    id: "run_003",
    workflowId: "wf_001",
    status: "failed",
    startedAt: "2026-03-21T22:00:00Z",
    completedAt: "2026-03-21T22:00:03Z",
    durationMs: 3100,
    output: null,
    error:
      "Error: Rate limit exceeded for Anthropic API.\n  at LLMGateway.call (llm-gateway/src/index.ts:142)\n  at Orchestrator.execute (orchestrator/src/index.ts:87)",
    triggeredBy: "schedule",
  },
  {
    id: "run_004",
    workflowId: "wf_001",
    status: "success",
    startedAt: "2026-03-21T18:00:00Z",
    completedAt: "2026-03-21T18:00:15Z",
    durationMs: 15420,
    output: "Processed 58 outreach leads.\nGenerated 58 personalized cold emails.",
    error: null,
    triggeredBy: "schedule",
  },
  {
    id: "run_005",
    workflowId: "wf_001",
    status: "success",
    startedAt: "2026-03-21T14:00:00Z",
    completedAt: "2026-03-21T14:00:10Z",
    durationMs: 10100,
    output: "Processed 41 outreach leads.",
    error: null,
    triggeredBy: "manual",
  },
  {
    id: "run_006",
    workflowId: "wf_002",
    status: "success",
    startedAt: "2026-03-22T09:00:00Z",
    completedAt: "2026-03-22T09:00:25Z",
    durationMs: 25300,
    output:
      "Menu analysis complete.\n\n3 high-cost items identified:\n- Wagyu Burger (FC: 42%)\n- Lobster Bisque (FC: 38%)\n- Truffle Risotto (FC: 35%)\n\nRecommendations generated.",
    error: null,
    triggeredBy: "schedule",
  },
  {
    id: "run_007",
    workflowId: "wf_002",
    status: "success",
    startedAt: "2026-03-21T09:00:00Z",
    completedAt: "2026-03-21T09:00:22Z",
    durationMs: 22100,
    output: "Menu analysis complete. 2 high-cost items identified.",
    error: null,
    triggeredBy: "schedule",
  },
  {
    id: "run_008",
    workflowId: "wf_003",
    status: "success",
    startedAt: "2026-03-22T12:30:00Z",
    completedAt: "2026-03-22T12:30:45Z",
    durationMs: 45200,
    output:
      "Code review complete.\n\nFiles reviewed: 12\nIssues found: 3 (1 critical, 2 minor)\n\nCritical: SQL injection in user input handler\nMinor: Unused imports, missing error boundary",
    error: null,
    triggeredBy: "manual",
  },
  {
    id: "run_009",
    workflowId: "wf_004",
    status: "failed",
    startedAt: "2026-03-22T08:00:00Z",
    completedAt: "2026-03-22T08:00:02Z",
    durationMs: 2100,
    output: null,
    error: "Error: Connection timeout to vulnerability database.\n  at SecurityScanner.connect (scanner/src/db.ts:34)",
    triggeredBy: "schedule",
  },
  {
    id: "run_010",
    workflowId: "wf_005",
    status: "success",
    startedAt: "2026-03-22T11:00:00Z",
    completedAt: "2026-03-22T11:01:30Z",
    durationMs: 90200,
    output:
      "Pipeline design complete.\n\nSource: PostgreSQL (3 tables)\nTransform: 4 stages (clean → normalize → enrich → aggregate)\nSink: BigQuery\nEstimated throughput: ~10k rows/min",
    error: null,
    triggeredBy: "manual",
  },
];

const MOCK_WORKFLOWS: Workflow[] = [
  {
    id: "wf_001",
    name: "Daily Outreach Generator",
    description:
      "Generates personalized cold outreach emails for new leads every 4 hours using the Cold Outreach Writer skill.",
    status: "active",
    skillId: "sk_001",
    skillName: "Cold Outreach Writer",
    schedule: "0 */4 * * *",
    parameters: [
      {
        key: "max_leads",
        value: "50",
        type: "number",
        label: "Max Leads per Run",
        description: "Maximum number of leads to process in a single execution.",
      },
      {
        key: "tone",
        value: "professional",
        type: "select",
        label: "Email Tone",
        description: "The tone of generated emails.",
        options: ["professional", "casual", "friendly", "urgent"],
      },
      {
        key: "include_followup",
        value: "true",
        type: "boolean",
        label: "Include Follow-up",
        description: "Generate a follow-up email template for non-responders.",
      },
    ],
    stats: {
      runCount: 142,
      successRate: 96,
      avgDurationMs: 11200,
      lastRunAt: "2026-03-22T10:00:00Z",
    },
    createdBy: "user_001",
    createdAt: "2026-02-15T10:00:00Z",
    updatedAt: "2026-03-22T10:00:00Z",
  },
  {
    id: "wf_002",
    name: "Menu Cost Watchdog",
    description:
      "Daily analysis of restaurant menu food costs. Alerts when any item exceeds 35% food cost ratio.",
    status: "active",
    skillId: "sk_002",
    skillName: "Food Cost Analyst",
    schedule: "0 9 * * *",
    parameters: [
      {
        key: "threshold",
        value: "35",
        type: "number",
        label: "Cost Threshold (%)",
        description: "Alert when food cost ratio exceeds this percentage.",
      },
      {
        key: "report_format",
        value: "detailed",
        type: "select",
        label: "Report Format",
        options: ["summary", "detailed", "executive"],
      },
    ],
    stats: {
      runCount: 87,
      successRate: 100,
      avgDurationMs: 23700,
      lastRunAt: "2026-03-22T09:00:00Z",
    },
    createdBy: "user_001",
    createdAt: "2026-02-20T09:00:00Z",
    updatedAt: "2026-03-22T09:00:00Z",
  },
  {
    id: "wf_003",
    name: "PR Code Reviewer",
    description:
      "Automatically reviews pull requests on push events. Checks for security issues, performance, and best practices.",
    status: "paused",
    skillId: "sk_005",
    skillName: "Code Review Assistant",
    schedule: null,
    parameters: [
      {
        key: "severity_filter",
        value: "medium",
        type: "select",
        label: "Min Severity",
        description: "Only report issues at or above this severity level.",
        options: ["low", "medium", "high", "critical"],
      },
      {
        key: "auto_approve",
        value: "false",
        type: "boolean",
        label: "Auto-approve Clean PRs",
        description: "Automatically approve PRs with no issues found.",
      },
    ],
    stats: {
      runCount: 198,
      successRate: 99,
      avgDurationMs: 45200,
      lastRunAt: "2026-03-22T12:30:00Z",
    },
    createdBy: "user_001",
    createdAt: "2026-02-10T14:00:00Z",
    updatedAt: "2026-03-20T10:00:00Z",
  },
  {
    id: "wf_004",
    name: "Nightly Security Scan",
    description:
      "Scans the entire codebase for security vulnerabilities every night at 2 AM. Cross-references OWASP Top 10.",
    status: "failed",
    skillId: "sk_009",
    skillName: "Security Scanner",
    schedule: "0 2 * * *",
    parameters: [
      {
        key: "scan_depth",
        value: "full",
        type: "select",
        label: "Scan Depth",
        options: ["quick", "standard", "full"],
      },
    ],
    stats: {
      runCount: 45,
      successRate: 78,
      avgDurationMs: 120300,
      lastRunAt: "2026-03-22T08:00:00Z",
    },
    createdBy: "user_001",
    createdAt: "2026-02-25T08:00:00Z",
    updatedAt: "2026-03-22T08:00:00Z",
  },
  {
    id: "wf_005",
    name: "Data Pipeline Blueprint",
    description:
      "Generates ETL pipeline designs from natural language specs. Outputs architecture docs and config files.",
    status: "completed",
    skillId: "sk_006",
    skillName: "Data Pipeline Designer",
    schedule: null,
    parameters: [
      {
        key: "output_format",
        value: "markdown",
        type: "select",
        label: "Output Format",
        options: ["markdown", "yaml", "json"],
      },
    ],
    stats: {
      runCount: 12,
      successRate: 92,
      avgDurationMs: 88400,
      lastRunAt: "2026-03-22T11:00:00Z",
    },
    createdBy: "user_001",
    createdAt: "2026-03-05T09:00:00Z",
    updatedAt: "2026-03-22T11:00:00Z",
  },
  {
    id: "wf_006",
    name: "SEO Content Optimizer (Draft)",
    description:
      "Batch-optimize blog posts and landing pages for search ranking. Analyzes keyword density, meta tags, and internal links.",
    status: "draft",
    skillId: "sk_007",
    skillName: "SEO Content Optimizer",
    schedule: null,
    parameters: [
      {
        key: "target_keywords",
        value: "",
        type: "string",
        label: "Target Keywords",
        description: "Comma-separated list of primary keywords to optimize for.",
      },
      {
        key: "max_pages",
        value: "10",
        type: "number",
        label: "Max Pages per Run",
      },
    ],
    stats: {
      runCount: 0,
      successRate: 0,
      avgDurationMs: 0,
      lastRunAt: null,
    },
    createdBy: "user_001",
    createdAt: "2026-03-20T16:00:00Z",
    updatedAt: "2026-03-20T16:00:00Z",
  },
];

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
  const [workflows, setWorkflows] = useState<Workflow[]>(MOCK_WORKFLOWS);
  const [loading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | "all">("all");

  // Modal state
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [logsWorkflow, setLogsWorkflow] = useState<Workflow | null>(null);
  const [deletingWorkflow, setDeletingWorkflow] = useState<Workflow | null>(null);

  // Filter workflows
  const filtered =
    statusFilter === "all"
      ? workflows
      : workflows.filter((w) => w.status === statusFilter);

  // Get runs for a specific workflow
  const getWorkflowRuns = useCallback(
    (workflowId: string) =>
      MOCK_RUNS.filter((r) => r.workflowId === workflowId).sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      ),
    []
  );

  // All runs for the global timeline
  const allRuns = MOCK_RUNS.sort(
    (a, b) =>
      new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
  );

  // ── Handlers ────────────────────────────────────

  const handlePause = useCallback((workflow: Workflow) => {
    setWorkflows((prev) =>
      prev.map((w) =>
        w.id === workflow.id
          ? { ...w, status: "paused" as WorkflowStatus, updatedAt: new Date().toISOString() }
          : w
      )
    );
    // pauseWorkflow(workflow.id).catch(console.error);
  }, []);

  const handleResume = useCallback((workflow: Workflow) => {
    setWorkflows((prev) =>
      prev.map((w) =>
        w.id === workflow.id
          ? { ...w, status: "active" as WorkflowStatus, updatedAt: new Date().toISOString() }
          : w
      )
    );
    // resumeWorkflow(workflow.id).catch(console.error);
  }, []);

  const handleDelete = useCallback(() => {
    if (!deletingWorkflow) return;
    setWorkflows((prev) => prev.filter((w) => w.id !== deletingWorkflow.id));
    setDeletingWorkflow(null);
    // deleteWorkflow(deletingWorkflow.id).catch(console.error);
  }, [deletingWorkflow]);

  const handleSaveParams = useCallback(
    (workflowId: string, parameters: WorkflowParameter[]) => {
      setWorkflows((prev) =>
        prev.map((w) =>
          w.id === workflowId
            ? { ...w, parameters, updatedAt: new Date().toISOString() }
            : w
        )
      );
      setEditingWorkflow(null);
      // updateWorkflowParams(workflowId, parameters).catch(console.error);
    },
    []
  );

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
        {/* Execution Timeline — global overview */}
        <ExecutionTimeline runs={allRuns} />

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
                onViewLogs={(w) => setLogsWorkflow(w)}
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
          runs={getWorkflowRuns(logsWorkflow.id)}
          onClose={() => setLogsWorkflow(null)}
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
