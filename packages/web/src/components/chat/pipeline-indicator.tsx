"use client";

import { useState } from "react";
import {
  Search,
  GitBranch,
  Zap,
  Play,
  Save,
  FileCheck,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PipelineStep, PipelineStepName } from "@/types/chat";

interface PipelineIndicatorProps {
  steps: PipelineStep[];
  visible: boolean;
}

const STEP_ICONS: Record<PipelineStepName, React.ReactNode> = {
  classify: <Search className="h-3.5 w-3.5" />,
  search: <GitBranch className="h-3.5 w-3.5" />,
  route: <Zap className="h-3.5 w-3.5" />,
  execute: <Play className="h-3.5 w-3.5" />,
  save: <Save className="h-3.5 w-3.5" />,
  log: <FileCheck className="h-3.5 w-3.5" />,
};

export function PipelineIndicator({ steps, visible }: PipelineIndicatorProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (!visible || steps.length === 0) return null;

  const allDone = steps.every((s) => s.status === "done");
  const currentStep = steps.find((s) => s.status === "running");

  return (
    <div className="px-4 py-2 animate-in fade-in-0 slide-in-from-top-2 duration-300">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
          {/* Header */}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className="flex items-center gap-2">
              {allDone ? (
                <>
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                    <Check className="h-3 w-3" />
                  </div>
                  <span>Pipeline complete</span>
                </>
              ) : (
                <>
                  <div className="h-2 w-2 rounded-full bg-violet-500 pipeline-pulse" />
                  <span>
                    {currentStep?.label ?? "Starting pipeline..."}
                  </span>
                </>
              )}
            </div>
            {collapsed ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Steps */}
          {!collapsed && (
            <div className="flex items-center gap-1 px-4 pb-3 pt-0.5 overflow-x-auto">
              {steps.map((step, i) => (
                <div key={step.step} className="flex items-center">
                  <div
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-300",
                      step.status === "done" &&
                        "bg-emerald-500/10 text-emerald-400",
                      step.status === "running" &&
                        "bg-violet-500/15 text-violet-400 pipeline-pulse",
                      step.status === "pending" &&
                        "text-muted-foreground/40"
                    )}
                  >
                    {step.status === "done" ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      STEP_ICONS[step.step]
                    )}
                    <span className="hidden sm:inline whitespace-nowrap">
                      {step.label.replace(/^(Classifying|Searching|Deciding|Executing|Saving|Logging)\s+/, '')}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={cn(
                        "mx-0.5 h-px w-3 transition-colors duration-300",
                        step.status === "done"
                          ? "bg-emerald-500/30"
                          : "bg-border/30"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
