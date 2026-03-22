"use client";

import { AlertTriangle } from "lucide-react";
import type { Credential } from "@/types/credential";
import { CREDENTIAL_SERVICES } from "@/types/credential";

interface DeleteCredentialModalProps {
  credential: Credential;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteCredentialModal({
  credential,
  onConfirm,
  onCancel,
}: DeleteCredentialModalProps) {
  const serviceInfo = CREDENTIAL_SERVICES.find((s) => s.value === credential.service);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm fade-in-0"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border/50 bg-card p-6 shadow-2xl animate-in slide-in-from-bottom-2">
        {/* Warning icon */}
        <div className="mb-4 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
        </div>

        {/* Title */}
        <h2 className="mb-2 text-center text-base font-semibold text-foreground">
          Delete Credential
        </h2>

        {/* Description */}
        <p className="mb-1 text-center text-sm text-muted-foreground">
          Are you sure you want to delete this credential?
        </p>
        <div className="mb-5 flex items-center justify-center gap-2 rounded-lg bg-secondary/50 px-3 py-2">
          <span className="text-base">{serviceInfo?.icon ?? "🔑"}</span>
          <span className="text-sm font-medium text-foreground">
            {serviceInfo?.label ?? credential.service}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {credential.maskedKey}
          </span>
        </div>
        <p className="mb-5 text-center text-xs text-muted-foreground/70">
          Any workflows or skills using this key will stop working.
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
