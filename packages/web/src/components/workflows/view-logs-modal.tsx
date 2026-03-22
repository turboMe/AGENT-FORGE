"use client";

import { useState } from "react";
import {
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Workflow, WorkflowRun } from "@/types/workflow";
import { RUN_STATUS_CONFIG } from "@/types/workflow";

interface ViewLogsModalProps {
  workflow: Workflow;
  runs: WorkflowRun[];
  onClose: () => void;
}

function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  failed: <XCircle className="h-4 w-4 text-red-400" />,
  running: <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />,
  cancelled: <XCircle className="h-4 w-4 text-gray-400" />,
};

function RunRow({ run }: { run: WorkflowRun }) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = RUN_STATUS_CONFIG[run.status];

  return (
    <div className="border-b border-border/20 last:border-0">
      {/* Collapsed row */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/30 transition-colors"
      >
        {STATUS_ICON[run.status]}

        <span className={cn("text-[10px] font-semibold uppercase w-16", statusCfg.color)}>
          {statusCfg.label}
        </span>

        <span className="flex-1 text-xs text-muted-foreground truncate flex items-center gap-2">
          <Clock className="h-3 w-3 shrink-0" />
          {formatTimestamp(run.startedAt)}
        </span>

        <span className="text-[10px] text-muted-foreground/60 font-mono">
          {formatDuration(run.durationMs)}
        </span>

        <span className="ml-1 text-[10px] text-muted-foreground/40 rounded bg-secondary/50 px-1.5 py-0.5">
          {run.triggeredBy}
        </span>

        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="bg-secondary/10 px-4 py-3 animate-in slide-in-from-top-2">
          {run.output && (
            <div className="mb-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Output
              </p>
              <pre className="max-h-48 overflow-auto rounded-lg bg-secondary/30 border border-border/30 p-3 text-[11px] font-mono text-foreground/80 leading-relaxed scrollbar-thin whitespace-pre-wrap break-words">
                {run.output}
              </pre>
            </div>
          )}

          {run.error && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-red-400/60">
                Error
              </p>
              <pre className="max-h-32 overflow-auto rounded-lg bg-red-500/5 border border-red-500/20 p-3 text-[11px] font-mono text-red-400/90 leading-relaxed scrollbar-thin whitespace-pre-wrap break-words">
                {run.error}
              </pre>
            </div>
          )}

          {!run.output && !run.error && (
            <p className="text-xs text-muted-foreground/50 italic">
              No output recorded for this run.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function ViewLogsModal({
  workflow,
  runs,
  onClose,
}: ViewLogsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm fade-in-0"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl mx-4 animate-in slide-in-from-bottom-2">
        <div className="rounded-2xl border border-border/50 bg-card shadow-2xl shadow-black/40 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/30 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/50">
                <Terminal className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Execution Logs
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {workflow.name} · {runs.length} run{runs.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="max-h-[65vh] overflow-y-auto scrollbar-thin">
            {runs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/50">
                  <Terminal className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="text-xs text-muted-foreground">
                  No execution logs yet
                </p>
              </div>
            ) : (
              runs.map((run) => <RunRow key={run.id} run={run} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
