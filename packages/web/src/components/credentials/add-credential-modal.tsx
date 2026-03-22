"use client";

import { useState } from "react";
import { X, Plus, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { CREDENTIAL_SERVICES } from "@/types/credential";

interface AddCredentialModalProps {
  onSave: (service: string, apiKey: string) => void;
  onCancel: () => void;
}

export function AddCredentialModal({ onSave, onCancel }: AddCredentialModalProps) {
  const [service, setService] = useState<string>(CREDENTIAL_SERVICES[0].value);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    setSaving(true);
    onSave(service, apiKey.trim());
  };

  const selectedService = CREDENTIAL_SERVICES.find((s) => s.value === service);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm fade-in-0"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border/50 bg-card p-6 shadow-2xl animate-in slide-in-from-bottom-2">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/20">
              <KeyRound className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Add Credential</h2>
              <p className="text-xs text-muted-foreground">Securely store an API key</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Service Dropdown */}
          <div>
            <label htmlFor="credential-service" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Service
            </label>
            <div className="relative">
              <select
                id="credential-service"
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full appearance-none rounded-xl border border-border/50 bg-secondary/50 px-4 py-2.5 pr-10 text-sm text-foreground outline-none transition-colors focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
              >
                {CREDENTIAL_SERVICES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.icon} {s.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* API Key Input — always type="password" */}
          <div>
            <label htmlFor="credential-key" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              API Key
            </label>
            <input
              id="credential-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`Enter your ${selectedService?.label ?? ''} API key`}
              autoComplete="off"
              className="w-full rounded-xl border border-border/50 bg-secondary/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground/70">
              Your key is encrypted at rest and never exposed in plaintext.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!apiKey.trim() || saving}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all",
                apiKey.trim()
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
                  : "bg-secondary text-muted-foreground cursor-not-allowed"
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Add Credential"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
