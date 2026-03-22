"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DecisionFilters as FiltersType } from "@/types/analytics";
import { ACTION_OPTIONS } from "@/types/analytics";

interface DecisionFiltersProps {
  filters: FiltersType;
  onChange: (filters: FiltersType) => void;
}

export function DecisionFilters({ filters, onChange }: DecisionFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search tasks…"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className={cn(
            "h-9 w-full rounded-lg border border-border/50 bg-secondary/30 pl-9 pr-8 text-sm text-foreground",
            "placeholder:text-muted-foreground/60",
            "focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30",
            "transition-colors"
          )}
        />
        {filters.search && (
          <button
            type="button"
            onClick={() => onChange({ ...filters, search: "" })}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Action dropdown */}
      <select
        value={filters.action ?? ""}
        onChange={(e) =>
          onChange({ ...filters, action: e.target.value || null })
        }
        className={cn(
          "h-9 rounded-lg border border-border/50 bg-secondary/30 px-3 text-xs text-foreground",
          "focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30",
          "transition-colors cursor-pointer"
        )}
      >
        <option value="">All Actions</option>
        {ACTION_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Success filter */}
      <select
        value={filters.success === null ? "" : String(filters.success)}
        onChange={(e) =>
          onChange({
            ...filters,
            success: e.target.value === "" ? null : e.target.value === "true",
          })
        }
        className={cn(
          "h-9 rounded-lg border border-border/50 bg-secondary/30 px-3 text-xs text-foreground",
          "focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30",
          "transition-colors cursor-pointer"
        )}
      >
        <option value="">All Status</option>
        <option value="true">Success</option>
        <option value="false">Failed</option>
      </select>

      {/* Date from */}
      <input
        type="date"
        value={filters.dateFrom ?? ""}
        onChange={(e) =>
          onChange({ ...filters, dateFrom: e.target.value || null })
        }
        className={cn(
          "h-9 rounded-lg border border-border/50 bg-secondary/30 px-3 text-xs text-foreground",
          "focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30",
          "transition-colors cursor-pointer"
        )}
        placeholder="From"
      />

      {/* Date to */}
      <input
        type="date"
        value={filters.dateTo ?? ""}
        onChange={(e) =>
          onChange({ ...filters, dateTo: e.target.value || null })
        }
        className={cn(
          "h-9 rounded-lg border border-border/50 bg-secondary/30 px-3 text-xs text-foreground",
          "focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30",
          "transition-colors cursor-pointer"
        )}
        placeholder="To"
      />
    </div>
  );
}
