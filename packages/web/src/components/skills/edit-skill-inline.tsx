"use client";

import { useState } from "react";
import { Save, X, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SKILL_PATTERNS, SKILL_DOMAINS } from "@/types/skill";
import type { Skill, SkillUpdatePayload } from "@/types/skill";

interface EditSkillInlineProps {
  skill: Skill;
  onSave: (id: string, data: SkillUpdatePayload) => void;
  onCancel: () => void;
}

export function EditSkillInline({ skill, onSave, onCancel }: EditSkillInlineProps) {
  const [name, setName] = useState(skill.name);
  const [description, setDescription] = useState(skill.description);
  const [domains, setDomains] = useState<string[]>([...skill.domain]);
  const [pattern, setPattern] = useState(skill.pattern);
  const [domainInput, setDomainInput] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(skill.template?.systemPrompt ?? "");
  const [persona, setPersona] = useState(skill.template?.persona ?? "");
  const [showTemplate, setShowTemplate] = useState(true);

  const handleAddDomain = () => {
    const trimmed = domainInput.trim().toLowerCase();
    if (trimmed && !domains.includes(trimmed)) {
      setDomains([...domains, trimmed]);
      setDomainInput("");
    }
  };

  const handleRemoveDomain = (d: string) => {
    setDomains(domains.filter((x) => x !== d));
  };

  const handleSubmit = () => {
    const payload: SkillUpdatePayload = {
      name: name.trim(),
      description: description.trim(),
      domain: domains,
      pattern,
    };

    // Include template updates if changed
    const templateChanged =
      systemPrompt !== (skill.template?.systemPrompt ?? "") ||
      persona !== (skill.template?.persona ?? "");

    if (templateChanged) {
      payload.template = {
        ...skill.template,
        systemPrompt: systemPrompt.trim(),
        persona: persona.trim(),
      };
    }

    onSave(skill.id, payload);
  };

  const isDirty =
    name !== skill.name ||
    description !== skill.description ||
    pattern !== skill.pattern ||
    JSON.stringify(domains) !== JSON.stringify(skill.domain) ||
    systemPrompt !== (skill.template?.systemPrompt ?? "") ||
    persona !== (skill.template?.persona ?? "");

  return (
    <div className="rounded-2xl border border-violet-500/30 bg-card p-5 shadow-lg shadow-violet-500/5 animate-in slide-in-from-bottom-2">
      {/* Name */}
      <div className="mb-3">
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={cn(
            "w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground",
            "focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50",
            "transition-all duration-200"
          )}
        />
      </div>

      {/* Description */}
      <div className="mb-3">
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className={cn(
            "w-full resize-none rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground",
            "focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50",
            "transition-all duration-200"
          )}
        />
      </div>

      {/* Template Section (collapsible) */}
      <div className="mb-3">
        <button
          type="button"
          onClick={() => setShowTemplate(!showTemplate)}
          className="flex items-center gap-1.5 mb-2 text-[11px] font-medium uppercase tracking-wider text-violet-400 hover:text-violet-300 transition-colors"
        >
          {showTemplate ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Prompt Template
        </button>

        {showTemplate && (
          <div className="space-y-3 rounded-lg border border-border/50 bg-secondary/20 p-3">
            {/* System Prompt */}
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                System Prompt
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={8}
                placeholder="Full system prompt for this skill..."
                className={cn(
                  "w-full resize-y rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground font-mono",
                  "focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50",
                  "transition-all duration-200 min-h-[120px]"
                )}
              />
            </div>

            {/* Persona */}
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Persona / Identity
              </label>
              <textarea
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                rows={3}
                placeholder="AI persona description..."
                className={cn(
                  "w-full resize-y rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50",
                  "transition-all duration-200"
                )}
              />
            </div>
          </div>
        )}
      </div>

      {/* Domains (tag input) */}
      <div className="mb-3">
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Domains
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {domains.map((d) => (
            <span
              key={d}
              className="inline-flex items-center gap-1 rounded-md bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-300"
            >
              {d}
              <button
                type="button"
                onClick={() => handleRemoveDomain(d)}
                className="hover:text-red-400 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1.5">
          <select
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          >
            <option value="">Select domain...</option>
            {SKILL_DOMAINS.filter((d) => !domains.includes(d)).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAddDomain}
            disabled={!domainInput}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Pattern */}
      <div className="mb-4">
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Pattern
        </label>
        <select
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground capitalize focus:outline-none focus:ring-2 focus:ring-violet-500/40"
        >
          {SKILL_PATTERNS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium",
            "text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
          )}
        >
          <X className="h-3.5 w-3.5" />
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isDirty || !name.trim()}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium",
            "bg-gradient-to-r from-violet-500 to-indigo-600 text-white",
            "shadow-sm shadow-violet-500/20 hover:shadow-md hover:shadow-violet-500/30",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "transition-all duration-200"
          )}
        >
          <Save className="h-3.5 w-3.5" />
          Save Changes
        </button>
      </div>
    </div>
  );
}
