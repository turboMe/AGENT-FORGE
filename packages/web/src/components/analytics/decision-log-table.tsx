"use client";

import { CheckCircle, XCircle, Clock, DollarSign, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Decision } from "@/types/analytics";
import { ACTION_LABELS } from "@/types/analytics";

interface DecisionLogTableProps {
  decisions: Decision[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DecisionLogTable({ decisions }: DecisionLogTableProps) {
  if (decisions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/50">
          <Clock className="h-6 w-6 text-muted-foreground/50" />
        </div>
        <p className="text-sm text-muted-foreground">No decisions found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 text-left text-xs text-muted-foreground">
            <th className="px-4 py-3 font-medium">Task</th>
            <th className="px-4 py-3 font-medium">Action</th>
            <th className="px-4 py-3 font-medium">Skill</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium text-right">Latency</th>
            <th className="px-4 py-3 font-medium text-right">Cost</th>
            <th className="px-4 py-3 font-medium text-right">When</th>
          </tr>
        </thead>
        <tbody>
          {decisions.map((d, i) => {
            const action = ACTION_LABELS[d.actionTaken] ?? {
              label: d.actionTaken,
              color: "text-muted-foreground",
            };

            return (
              <tr
                key={d.id}
                className={cn(
                  "border-b border-border/20 transition-colors hover:bg-secondary/20",
                  i % 2 === 0 ? "bg-card" : "bg-card/50"
                )}
              >
                <td className="max-w-[200px] truncate px-4 py-3 text-foreground">
                  {d.taskSummary}
                </td>
                <td className="px-4 py-3">
                  <span className={cn("text-xs font-medium", action.color)}>
                    {action.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {d.skillUsed ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {d.executionSuccess ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                      <CheckCircle className="h-3 w-3" />
                      Success
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-red-400">
                      <XCircle className="h-3 w-3" />
                      Failed
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Zap className="h-3 w-3 text-amber-400" />
                    {d.latencyMs}ms
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <DollarSign className="h-3 w-3 text-emerald-400" />
                    ${d.costUsd.toFixed(3)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-xs text-muted-foreground/70">
                  {formatDate(d.createdAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
