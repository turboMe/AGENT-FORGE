"use client";

import { useState } from "react";
import { Download, Star, CheckCircle, ShieldCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarketplaceSkill } from "@/types/marketplace";
import { CATEGORY_COLORS } from "@/types/marketplace";

interface MarketplaceCardProps {
  skill: MarketplaceSkill;
  onInstall: (skill: MarketplaceSkill) => void;
}

export function MarketplaceCard({ skill, onInstall }: MarketplaceCardProps) {
  const [hovered, setHovered] = useState(false);
  const gradient = CATEGORY_COLORS[skill.category] ?? "from-violet-500 to-indigo-400";

  const isInstalled = skill.installStatus === "installed";
  const isInstalling = skill.installStatus === "installing";

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
        {/* Author row */}
        <div className="mb-3 flex items-center gap-2.5">
          <img
            src={skill.author.avatar}
            alt={skill.author.name}
            className="h-8 w-8 rounded-full bg-secondary ring-2 ring-border/30"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-sm font-semibold text-foreground">
                {skill.name}
              </h3>
              {skill.isVerified && (
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-blue-400" />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              by {skill.author.name} · v{skill.version}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {skill.description}
        </p>

        {/* Category + Tags */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          <span
            className={cn(
              "inline-flex items-center rounded-md bg-gradient-to-r px-2 py-0.5 text-[10px] font-medium text-white/90",
              gradient
            )}
          >
            {skill.category}
          </span>
          {skill.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-md border border-border/70 bg-secondary/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-auto flex items-center gap-4 border-t border-border/30 pt-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1" title="Downloads">
            <Download className="h-3 w-3 text-emerald-400" />
            <span>{skill.downloads.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1" title="Rating">
            <Star className="h-3 w-3 text-yellow-400" />
            <span>
              {skill.rating.toFixed(1)}{" "}
              <span className="text-muted-foreground/50">({skill.totalRatings})</span>
            </span>
          </div>
        </div>
      </div>

      {/* Install footer */}
      <div className="flex items-center border-t border-border/30 bg-secondary/20 px-3 py-2">
        <button
          type="button"
          onClick={() => !isInstalled && !isInstalling && onInstall(skill)}
          disabled={isInstalled || isInstalling}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
            "transition-all duration-200",
            isInstalled
              ? "bg-emerald-500/10 text-emerald-400 cursor-default"
              : isInstalling
                ? "bg-secondary text-muted-foreground cursor-wait"
                : "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/20 hover:shadow-md hover:shadow-emerald-500/30 hover:scale-[1.02]"
          )}
        >
          {isInstalled ? (
            <>
              <CheckCircle className="h-3 w-3" />
              Installed
            </>
          ) : isInstalling ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Installing…
            </>
          ) : (
            <>
              <Download className="h-3 w-3" />
              Install
            </>
          )}
        </button>
      </div>
    </div>
  );
}
