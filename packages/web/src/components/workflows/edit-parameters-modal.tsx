"use client";

import { useState } from "react";
import { X, Save } from "lucide-react";
import type { Workflow, WorkflowParameter } from "@/types/workflow";

interface EditParametersModalProps {
  workflow: Workflow;
  onSave: (workflowId: string, parameters: WorkflowParameter[]) => void;
  onCancel: () => void;
}

export function EditParametersModal({
  workflow,
  onSave,
  onCancel,
}: EditParametersModalProps) {
  const [params, setParams] = useState<WorkflowParameter[]>(
    workflow.parameters.map((p) => ({ ...p }))
  );

  const updateParam = (index: number, value: string) => {
    setParams((prev) =>
      prev.map((p, i) => (i === index ? { ...p, value } : p))
    );
  };

  const handleSave = () => {
    onSave(workflow.id, params);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm fade-in-0"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg mx-4 animate-in slide-in-from-bottom-2">
        <div className="rounded-2xl border border-border/50 bg-card shadow-2xl shadow-black/40 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/30 px-6 py-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Edit Parameters
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {workflow.name}
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="max-h-[60vh] overflow-y-auto px-6 py-5 space-y-4 scrollbar-thin">
            {params.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">
                This workflow has no configurable parameters.
              </p>
            ) : (
              params.map((param, index) => (
                <div key={param.key}>
                  <label className="mb-1.5 flex items-baseline gap-1.5">
                    <span className="text-xs font-medium text-foreground">
                      {param.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 font-mono">
                      {param.key}
                    </span>
                  </label>

                  {param.description && (
                    <p className="mb-2 text-[10px] text-muted-foreground leading-relaxed">
                      {param.description}
                    </p>
                  )}

                  {param.type === "select" && param.options ? (
                    <select
                      value={param.value}
                      onChange={(e) => updateParam(index, e.target.value)}
                      className="w-full rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 text-xs text-foreground outline-none transition-colors focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
                    >
                      {param.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : param.type === "boolean" ? (
                    <button
                      type="button"
                      onClick={() =>
                        updateParam(
                          index,
                          param.value === "true" ? "false" : "true"
                        )
                      }
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        param.value === "true"
                          ? "bg-violet-500"
                          : "bg-secondary"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform shadow-sm ${
                          param.value === "true"
                            ? "translate-x-5"
                            : "translate-x-0"
                        }`}
                      />
                    </button>
                  ) : (
                    <input
                      type={param.type === "number" ? "number" : "text"}
                      value={param.value}
                      onChange={(e) => updateParam(index, e.target.value)}
                      className="w-full rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none transition-colors focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
                    />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-border/30 px-6 py-3 bg-secondary/10">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-500 shadow-lg shadow-violet-600/20"
            >
              <Save className="h-3.5 w-3.5" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
