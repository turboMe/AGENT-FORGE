"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Skill } from "@/types/skill";

interface DeleteSkillModalProps {
  skill: Skill;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteSkillModal({
  skill,
  onConfirm,
  onCancel,
}: DeleteSkillModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  // Trap focus
  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm fade-in-0"
        onClick={onCancel}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={cn(
          "relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl shadow-black/30",
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
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-red-400" />
        </div>

        {/* Text */}
        <h3 className="mb-2 text-center text-base font-semibold text-foreground">
          Delete Skill
        </h3>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Are you sure you want to delete{" "}
          <span className="font-medium text-foreground">{skill.name}</span>?
          This action cannot be undone.
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              "flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium",
              "text-muted-foreground hover:bg-secondary hover:text-foreground",
              "transition-all duration-200"
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "flex-1 rounded-xl bg-red-500/90 px-4 py-2.5 text-sm font-medium text-white",
              "hover:bg-red-500 shadow-sm shadow-red-500/20",
              "hover:shadow-md hover:shadow-red-500/30",
              "transition-all duration-200"
            )}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
