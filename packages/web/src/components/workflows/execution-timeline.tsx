"use client";

import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import type { WorkflowRun } from "@/types/workflow";

// ── Lightweight SVG chart (no external dependency for this component) ──
// Full Recharts AreaChart is used in the page-level timeline section.

interface ExecutionTimelineProps {
  runs: WorkflowRun[];
  className?: string;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

const STATUS_COLORS: Record<string, { fill: string; stroke: string }> = {
  success: { fill: "rgba(52, 211, 153, 0.3)", stroke: "rgb(52, 211, 153)" },
  failed: { fill: "rgba(248, 113, 113, 0.3)", stroke: "rgb(248, 113, 113)" },
  running: { fill: "rgba(96, 165, 250, 0.3)", stroke: "rgb(96, 165, 250)" },
  cancelled: { fill: "rgba(156, 163, 175, 0.3)", stroke: "rgb(156, 163, 175)" },
};

export function ExecutionTimeline({ runs, className }: ExecutionTimelineProps) {
  const chartData = useMemo(() => {
    if (runs.length === 0) return { points: [], maxDuration: 0, labels: [] };

    const sorted = [...runs].sort(
      (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
    );

    const maxDuration = Math.max(...sorted.map((r) => r.durationMs), 1);

    const W = 100; // viewbox width percentage
    const H = 100; // viewbox height

    const points = sorted.map((run, i) => ({
      x: sorted.length === 1 ? W / 2 : (i / (sorted.length - 1)) * W,
      y: H - (run.durationMs / maxDuration) * (H * 0.75) - H * 0.1,
      run,
      color: STATUS_COLORS[run.status] ?? STATUS_COLORS.cancelled,
    }));

    return { points, maxDuration, labels: sorted };
  }, [runs]);

  if (runs.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 text-center ${className ?? ""}`}>
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/50">
          <BarChart3 className="h-6 w-6 text-muted-foreground/50" />
        </div>
        <p className="text-xs text-muted-foreground">No execution history yet</p>
      </div>
    );
  }

  const { points, maxDuration } = chartData;

  // Build area path
  const areaPath =
    points.length > 1
      ? `M ${points[0].x} ${points[0].y} ` +
        points
          .slice(1)
          .map((p) => `L ${p.x} ${p.y}`)
          .join(" ") +
        ` L ${points[points.length - 1].x} 95 L ${points[0].x} 95 Z`
      : "";

  const linePath =
    points.length > 1
      ? `M ${points[0].x} ${points[0].y} ` +
        points
          .slice(1)
          .map((p) => `L ${p.x} ${p.y}`)
          .join(" ")
      : "";

  return (
    <div className={`rounded-xl border border-border/50 bg-card p-4 ${className ?? ""}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-foreground">Execution Timeline</h3>
        <span className="text-[10px] text-muted-foreground">
          {runs.length} run{runs.length !== 1 ? "s" : ""} · max{" "}
          {formatDuration(maxDuration)}
        </span>
      </div>

      {/* SVG Chart */}
      <div className="relative h-48 w-full">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-full w-full"
        >
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((frac) => (
            <line
              key={frac}
              x1="0"
              y1={100 - frac * 75 - 10}
              x2="100"
              y2={100 - frac * 75 - 10}
              stroke="currentColor"
              strokeOpacity="0.06"
              strokeWidth="0.3"
            />
          ))}

          {/* Area fill */}
          {areaPath && (
            <path
              d={areaPath}
              fill="url(#timeline-gradient)"
              opacity="0.6"
            />
          )}

          {/* Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="rgb(139, 92, 246)"
              strokeWidth="0.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* Data points */}
          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r="1.5"
                fill={p.color.stroke}
                className="transition-all duration-200"
              />
              {/* Hover target (invisible larger circle) */}
              <circle
                cx={p.x}
                cy={p.y}
                r="4"
                fill="transparent"
                className="cursor-pointer"
              >
                <title>
                  {`${formatDate(p.run.startedAt)} ${formatTime(p.run.startedAt)}\n${p.run.status} · ${formatDuration(p.run.durationMs)}`}
                </title>
              </circle>
            </g>
          ))}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="timeline-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(139, 92, 246)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="rgb(139, 92, 246)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* X-axis labels */}
      <div className="mt-1 flex justify-between text-[9px] text-muted-foreground/60">
        {points.length > 0 && <span>{formatDate(points[0].run.startedAt)}</span>}
        {points.length > 1 && (
          <span>{formatDate(points[points.length - 1].run.startedAt)}</span>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Success
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-400" />
          Failed
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-400" />
          Running
        </span>
      </div>
    </div>
  );
}
