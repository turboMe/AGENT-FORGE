"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarketplaceFilters as FiltersType, MarketplaceSortField } from "@/types/marketplace";
import { MARKETPLACE_CATEGORIES, CATEGORY_ICONS } from "@/types/marketplace";

interface MarketplaceFiltersProps {
  filters: FiltersType;
  sort: MarketplaceSortField;
  onChange: (filters: FiltersType) => void;
  onSortChange: (sort: MarketplaceSortField) => void;
}

const SORT_OPTIONS: { value: MarketplaceSortField; label: string }[] = [
  { value: "downloads", label: "Most Downloaded" },
  { value: "rating", label: "Highest Rated" },
  { value: "newest", label: "Newest" },
];

export function MarketplaceFilters({
  filters,
  sort,
  onChange,
  onSortChange,
}: MarketplaceFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Search + Sort row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search community skills…"
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

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as MarketplaceSortField)}
          className={cn(
            "h-9 rounded-lg border border-border/50 bg-secondary/30 px-3 text-xs text-foreground",
            "focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30",
            "transition-colors cursor-pointer"
          )}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        {MARKETPLACE_CATEGORIES.map((cat) => {
          const isActive =
            cat === "All" ? !filters.category : filters.category === cat;
          const icon = CATEGORY_ICONS[cat];

          return (
            <button
              key={cat}
              type="button"
              onClick={() =>
                onChange({
                  ...filters,
                  category: cat === "All" ? null : cat,
                })
              }
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
                "border transition-all duration-200",
                isActive
                  ? "border-violet-500/50 bg-violet-500/10 text-violet-300 shadow-sm shadow-violet-500/10"
                  : "border-border/50 bg-secondary/30 text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {icon && <span className="text-sm">{icon}</span>}
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
}
