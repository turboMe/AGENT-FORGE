"use client";

import { Trash2 } from "lucide-react";
import type { Credential } from "@/types/credential";
import { CREDENTIAL_SERVICES, SERVICE_COLORS } from "@/types/credential";

interface CredentialRowProps {
  credential: Credential;
  onDelete: (credential: Credential) => void;
}

export function CredentialRow({ credential, onDelete }: CredentialRowProps) {
  const serviceInfo = CREDENTIAL_SERVICES.find(
    (s) => s.value === credential.service
  );
  const gradientClass =
    SERVICE_COLORS[credential.service] ?? "from-gray-500 to-slate-400";

  const createdDate = new Date(credential.createdAt).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );

  return (
    <div className="group credential-row-glow relative flex items-center gap-4 rounded-xl border border-border/50 bg-card px-5 py-4 transition-all hover:border-border/80 hover:bg-card/80">
      {/* Service icon badge */}
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradientClass} text-lg shadow-sm`}
      >
        {serviceInfo?.icon ?? "🔑"}
      </div>

      {/* Service name + masked key */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {serviceInfo?.label ?? credential.service}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono tracking-wider">
            {credential.maskedKey}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span>Added {createdDate}</span>
        </div>
      </div>

      {/* Delete button */}
      <button
        type="button"
        onClick={() => onDelete(credential)}
        className="rounded-lg p-2 text-muted-foreground/50 opacity-0 transition-all group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
        aria-label={`Delete ${serviceInfo?.label ?? credential.service} credential`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
