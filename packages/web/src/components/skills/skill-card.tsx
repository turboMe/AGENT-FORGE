"use client";

import { useState } from "react";
import { Play, Pencil, Trash2, Star, Zap, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Skill } from "@/types/skill";
import { DOMAIN_COLORS } from "@/types/skill";

interface SkillCardProps {
  skill: Skill;
  onUse: (skill: Skill) => void;
  onEdit: (skill: Skill) => void;
  onDelete: (skill: Skill) => void;
}

function getDomainGradient(domains: string[]): string {
  const d = domains[0] ?? "engineering";
  return DOMAIN_COLORS[d] ?? "from-violet-500 to-indigo-400";
}

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return "Just now";
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function SkillCard({ skill, onUse, onEdit, onDelete }: SkillCardProps) {
  const [hovered, setHovered] = useState(false);
  const gradient = getDomainGradient(skill.domain);

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-2xl border border-border/50 bg-card overflow-hidden",
        "transition-all duration-300 ease-out",
        "hover:border-border hover:shadow-xl hover:shadow-violet-500/5 hover:-translate-y-1"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Gradient accent bar */}
      <div
        className={cn(
          "h-1 w-full bg-gradient-to-r transition-all duration-300",
          gradient,
          hovered && "h-1.5"
        )}
      />

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {skill.name}
            </h3>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {skill.description}
            </p>
          </div>
          {skill.isSystem && (
            <span className="shrink-0 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-400">
              System
            </span>
          )}
        </div>

        {/* Domain + Pattern badges */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {skill.domain.slice(0, 3).map((d) => (
            <span
              key={d}
              className={cn(
                "inline-flex items-center rounded-md bg-gradient-to-r px-2 py-0.5 text-[10px] font-medium text-white/90",
                DOMAIN_COLORS[d] ?? "from-gray-500 to-gray-400"
              )}
            >
              {d}
            </span>
          ))}
          <span className="inline-flex items-center rounded-md border border-border/70 bg-secondary/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {skill.pattern}
          </span>
        </div>

        {/* Stats */}
        <div className="mt-auto flex items-center gap-4 border-t border-border/30 pt-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1" title="Uses">
            <Zap className="h-3 w-3 text-amber-400" />
            <span>{skill.stats.useCount}</span>
          </div>
          <div className="flex items-center gap-1" title="Satisfaction">
            <Star className="h-3 w-3 text-yellow-400" />
            <span>
              {skill.stats.avgSatisfaction
                ? `${skill.stats.avgSatisfaction.toFixed(1)}`
                : "–"}
            </span>
          </div>
          <div className="flex items-center gap-1" title="Last used">
            <Clock className="h-3 w-3 text-blue-400" />
            <span>{formatDate(skill.stats.lastUsedAt)}</span>
          </div>
        </div>
      </div>

      {/* Actions footer */}
      <div
        className={cn(
          "flex items-center gap-1 border-t border-border/30 bg-secondary/20 px-3 py-2",
          "transition-all duration-200"
        )}
      >
        <button
          type="button"
          onClick={() => onUse(skill)}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
            "bg-gradient-to-r from-violet-500 to-indigo-600 text-white",
            "shadow-sm shadow-violet-500/20",
            "hover:shadow-md hover:shadow-violet-500/30 hover:scale-[1.02]",
            "transition-all duration-200"
          )}
        >
          <Play className="h-3 w-3" />
          Use
        </button>
        <button
          type="button"
          onClick={() => onEdit(skill)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          aria-label="Edit skill"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(skill)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-red-400 transition-colors"
          aria-label="Delete skill"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
