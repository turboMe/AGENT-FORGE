"use client";

import {
  Play,
  Pause,
  Trash2,
  Settings2,
  ScrollText,
  Clock,
  CheckCircle2,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Workflow } from "@/types/workflow";
import { STATUS_CONFIG } from "@/types/workflow";

interface WorkflowCardProps {
  workflow: Workflow;
  onPause: (workflow: Workflow) => void;
  onResume: (workflow: Workflow) => void;
  onDelete: (workflow: Workflow) => void;
  onEditParams: (workflow: Workflow) => void;
  onViewLogs: (workflow: Workflow) => void;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const STATUS_GRADIENT: Record<string, string> = {
  active: "from-emerald-500 to-teal-400",
  paused: "from-amber-500 to-orange-400",
  completed: "from-blue-500 to-cyan-400",
  failed: "from-red-500 to-rose-400",
  draft: "from-gray-500 to-slate-400",
};

export function WorkflowCard({
  workflow,
  onPause,
  onResume,
  onDelete,
  onEditParams,
  onViewLogs,
}: WorkflowCardProps) {
  const statusCfg = STATUS_CONFIG[workflow.status];
  const gradient = STATUS_GRADIENT[workflow.status] ?? STATUS_GRADIENT.draft;

  return (
    <div className="workflow-card-glow group flex flex-col rounded-2xl border border-border/50 bg-card overflow-hidden transition-all duration-200 hover:border-border hover:shadow-lg hover:shadow-black/20">
      {/* Gradient top bar */}
      <div className={cn("h-1 w-full bg-gradient-to-r", gradient)} />

      <div className="flex flex-1 flex-col p-5">
        {/* Header row */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground leading-snug truncate">
              {workflow.name}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {workflow.description}
            </p>
          </div>

          {/* Status badge */}
          <div
            className={cn(
              "shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
              statusCfg.bg,
              statusCfg.color
            )}
          >
            {workflow.status === "active" && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
            )}
            {statusCfg.label}
          </div>
        </div>

        {/* Skill + Schedule */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {workflow.skillName && (
            <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-400">
              <Zap className="h-2.5 w-2.5" />
              {workflow.skillName}
            </span>
          )}
          {workflow.schedule && (
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400">
              <Clock className="h-2.5 w-2.5" />
              {workflow.schedule}
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="mt-auto flex items-center gap-4 border-t border-border/30 pt-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1" title="Total runs">
            <CheckCircle2 className="h-3 w-3" />
            {workflow.stats.runCount}
          </span>
          <span className="flex items-center gap-1" title="Success rate">
            <TrendingUp className="h-3 w-3" />
            {workflow.stats.successRate}%
          </span>
          <span className="flex items-center gap-1" title="Avg duration">
            <Clock className="h-3 w-3" />
            {formatDuration(workflow.stats.avgDurationMs)}
          </span>
          <span
            className="ml-auto text-[10px] text-muted-foreground/60"
            title="Last run"
          >
            {formatRelative(workflow.stats.lastRunAt)}
          </span>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between border-t border-border/30 px-3 py-2 bg-secondary/10">
        <div className="flex gap-1">
          {workflow.status === "active" ? (
            <button
              type="button"
              onClick={() => onPause(workflow)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-amber-400 transition-colors hover:bg-amber-400/10"
              title="Pause"
            >
              <Pause className="h-3.5 w-3.5" />
              Pause
            </button>
          ) : workflow.status === "paused" ? (
            <button
              type="button"
              onClick={() => onResume(workflow)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-emerald-400 transition-colors hover:bg-emerald-400/10"
              title="Resume"
            >
              <Play className="h-3.5 w-3.5" />
              Resume
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => onEditParams(workflow)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Edit Parameters"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Params
          </button>

          <button
            type="button"
            onClick={() => onViewLogs(workflow)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="View Logs"
          >
            <ScrollText className="h-3.5 w-3.5" />
            Logs
          </button>
        </div>

        <button
          type="button"
          onClick={() => onDelete(workflow)}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-red-400/70 transition-colors hover:bg-red-500/10 hover:text-red-400"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
