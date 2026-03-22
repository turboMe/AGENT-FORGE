"use client";

import { Download, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarketplaceSkill } from "@/types/marketplace";

interface InstallSkillModalProps {
  skill: MarketplaceSkill;
  onConfirm: () => void;
  onCancel: () => void;
}

export function InstallSkillModal({ skill, onConfirm, onCancel }: InstallSkillModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm fade-in-0"
        onClick={onCancel}
      />

      {/* Modal */}
      <div
        className={cn(
          "relative z-10 w-full max-w-md rounded-2xl border border-border/50 bg-card p-6",
          "shadow-2xl shadow-black/30",
          "animate-in slide-in-from-bottom-2"
        )}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
          <Download className="h-6 w-6 text-emerald-400" />
        </div>

        {/* Title */}
        <h3 className="mb-1 text-base font-semibold text-foreground">
          Install {skill.name}?
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">
          This will add{" "}
          <span className="font-medium text-foreground">{skill.name}</span> by{" "}
          <span className="text-foreground">{skill.author.name}</span> to your skill
          library.
        </p>

        {/* Warning */}
        {!skill.isVerified && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-xs text-amber-300/80">
              This skill is not verified by the AgentForge team. Use with caution.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              "flex-1 rounded-lg border border-border/50 bg-secondary/30 px-4 py-2 text-sm font-medium text-muted-foreground",
              "hover:bg-secondary hover:text-foreground transition-colors"
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
              "bg-gradient-to-r from-emerald-500 to-teal-600 text-white",
              "shadow-sm shadow-emerald-500/20",
              "hover:shadow-md hover:shadow-emerald-500/30",
              "transition-all duration-200"
            )}
          >
            <Download className="h-4 w-4" />
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
