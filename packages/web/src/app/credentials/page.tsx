"use client";

import { useState, useCallback } from "react";
import { KeyRound, Plus, ShieldCheck } from "lucide-react";
import type { Credential } from "@/types/credential";
import { CredentialRow } from "@/components/credentials/credential-row";
import { AddCredentialModal } from "@/components/credentials/add-credential-modal";
import { DeleteCredentialModal } from "@/components/credentials/delete-credential-modal";

// ── Mock data ───────────────────────────────────────

const MOCK_CREDENTIALS: Credential[] = [
  {
    id: "cred_001",
    service: "openai",
    maskedKey: "••••sk-Ab3x",
    createdAt: "2026-02-15T10:00:00Z",
  },
  {
    id: "cred_002",
    service: "anthropic",
    maskedKey: "••••k-9f2Q",
    createdAt: "2026-03-01T14:30:00Z",
  },
  {
    id: "cred_003",
    service: "voyage-ai",
    maskedKey: "••••pa-L7mN",
    createdAt: "2026-03-10T08:15:00Z",
  },
  {
    id: "cred_004",
    service: "github",
    maskedKey: "••••hp_xK2J",
    createdAt: "2026-03-18T16:00:00Z",
  },
];

// ── Empty state ─────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/50">
        <ShieldCheck className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="mb-1 text-sm font-medium text-foreground">
        No credentials stored
      </h3>
      <p className="text-xs text-muted-foreground">
        Add an API key to connect external services to your workflows.
      </p>
    </div>
  );
}

// ── Page Component ──────────────────────────────────

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<Credential[]>(MOCK_CREDENTIALS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingCredential, setDeletingCredential] = useState<Credential | null>(null);

  // ── Handlers ────────────────────────────────────

  const handleAdd = useCallback(
    (service: string, apiKey: string) => {
      const maskedKey = "••••" + apiKey.slice(-4);
      const newCred: Credential = {
        id: `cred_${Date.now().toString(36)}`,
        service,
        maskedKey,
        createdAt: new Date().toISOString(),
      };
      setCredentials((prev) => [newCred, ...prev]);
      setShowAddModal(false);
      // Fire API call (non-blocking)
      // createCredential({ service, apiKey }).catch(console.error);
    },
    []
  );

  const handleDelete = useCallback((credential: Credential) => {
    setDeletingCredential(credential);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!deletingCredential) return;
    setCredentials((prev) => prev.filter((c) => c.id !== deletingCredential.id));
    setDeletingCredential(null);
    // Fire API call (non-blocking)
    // deleteCredential(deletingCredential.id).catch(console.error);
  }, [deletingCredential]);

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-xl px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
              <KeyRound className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Credential Manager</h1>
              <p className="text-xs text-muted-foreground">
                {credentials.length} credential{credentials.length !== 1 ? "s" : ""} stored
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40"
          >
            <Plus className="h-4 w-4" />
            Add Credential
          </button>
        </div>

        {/* Security note */}
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
          <p className="text-xs text-emerald-300/90">
            All credentials are encrypted at rest using AES-256 and never exposed in plaintext.
          </p>
        </div>
      </div>

      {/* Credential list */}
      <div className="flex-1 overflow-y-auto p-6">
        {credentials.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-2 stagger-in">
            {credentials.map((credential) => (
              <CredentialRow
                key={credential.id}
                credential={credential}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddCredentialModal
          onSave={handleAdd}
          onCancel={() => setShowAddModal(false)}
        />
      )}
      {deletingCredential && (
        <DeleteCredentialModal
          credential={deletingCredential}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingCredential(null)}
        />
      )}
    </div>
  );
}
