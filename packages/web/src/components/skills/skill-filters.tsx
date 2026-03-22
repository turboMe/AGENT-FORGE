"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Filter, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SKILL_DOMAINS, SKILL_PATTERNS } from "@/types/skill";
import type { SkillFilters as SkillFiltersType } from "@/types/skill";

interface SkillFiltersProps {
  filters: SkillFiltersType;
  onChange: (filters: SkillFiltersType) => void;
}

export function SkillFilters({ filters, onChange }: SkillFiltersProps) {
  const [localSearch, setLocalSearch] = useState(filters.search);
  const [showDomainDropdown, setShowDomainDropdown] = useState(false);
  const [showPatternDropdown, setShowPatternDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const domainRef = useRef<HTMLDivElement>(null);
  const patternRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      if (localSearch !== filters.search) {
        onChange({ ...filters, search: localSearch });
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [localSearch, filters, onChange]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (domainRef.current && !domainRef.current.contains(e.target as Node)) {
        setShowDomainDropdown(false);
      }
      if (patternRef.current && !patternRef.current.contains(e.target as Node)) {
        setShowPatternDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const activeFilterCount =
    (filters.domain ? 1 : 0) + (filters.pattern ? 1 : 0);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Search input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Search skills..."
          className={cn(
            "w-full rounded-xl border border-border bg-card pl-10 pr-10 py-2.5",
            "text-sm text-foreground placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50",
            "transition-all duration-200"
          )}
        />
        {localSearch && (
          <button
            type="button"
            onClick={() => {
              setLocalSearch("");
              onChange({ ...filters, search: "" });
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter dropdowns */}
      <div className="flex items-center gap-2">
        {/* Domain filter */}
        <div className="relative" ref={domainRef}>
          <button
            type="button"
            onClick={() => {
              setShowDomainDropdown(!showDomainDropdown);
              setShowPatternDropdown(false);
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-xs font-medium",
              "transition-all duration-200",
              filters.domain
                ? "border-violet-500/50 bg-violet-500/10 text-violet-300"
                : "bg-card text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            {filters.domain ? filters.domain : "Domain"}
            <ChevronDown className={cn("h-3 w-3 transition-transform", showDomainDropdown && "rotate-180")} />
          </button>

          {showDomainDropdown && (
            <div className="absolute right-0 top-full z-50 mt-1.5 w-44 rounded-xl border border-border bg-popover p-1.5 shadow-xl shadow-black/20 animate-in slide-in-from-top-2">
              <button
                type="button"
                onClick={() => {
                  onChange({ ...filters, domain: null });
                  setShowDomainDropdown(false);
                }}
                className={cn(
                  "flex w-full items-center rounded-lg px-3 py-2 text-xs transition-colors",
                  !filters.domain ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50"
                )}
              >
                All Domains
              </button>
              {SKILL_DOMAINS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    onChange({ ...filters, domain: d });
                    setShowDomainDropdown(false);
                  }}
                  className={cn(
                    "flex w-full items-center rounded-lg px-3 py-2 text-xs capitalize transition-colors",
                    filters.domain === d ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pattern filter */}
        <div className="relative" ref={patternRef}>
          <button
            type="button"
            onClick={() => {
              setShowPatternDropdown(!showPatternDropdown);
              setShowDomainDropdown(false);
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-xs font-medium",
              "transition-all duration-200",
              filters.pattern
                ? "border-violet-500/50 bg-violet-500/10 text-violet-300"
                : "bg-card text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {filters.pattern ? filters.pattern : "Pattern"}
            <ChevronDown className={cn("h-3 w-3 transition-transform", showPatternDropdown && "rotate-180")} />
          </button>

          {showPatternDropdown && (
            <div className="absolute right-0 top-full z-50 mt-1.5 w-40 rounded-xl border border-border bg-popover p-1.5 shadow-xl shadow-black/20 animate-in slide-in-from-top-2">
              <button
                type="button"
                onClick={() => {
                  onChange({ ...filters, pattern: null });
                  setShowPatternDropdown(false);
                }}
                className={cn(
                  "flex w-full items-center rounded-lg px-3 py-2 text-xs transition-colors",
                  !filters.pattern ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50"
                )}
              >
                All Patterns
              </button>
              {SKILL_PATTERNS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    onChange({ ...filters, pattern: p });
                    setShowPatternDropdown(false);
                  }}
                  className={cn(
                    "flex w-full items-center rounded-lg px-3 py-2 text-xs capitalize transition-colors",
                    filters.pattern === p ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear all filters */}
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={() => onChange({ search: localSearch, domain: null, pattern: null })}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-violet-400 hover:bg-violet-500/10 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear ({activeFilterCount})
          </button>
        )}
      </div>
    </div>
  );
}
