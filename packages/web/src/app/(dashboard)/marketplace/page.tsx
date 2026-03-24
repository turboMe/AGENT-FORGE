"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Store, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { MarketplaceCard } from "@/components/marketplace/marketplace-card";
import { MarketplaceFilters } from "@/components/marketplace/marketplace-filters";
import { InstallSkillModal } from "@/components/marketplace/install-skill-modal";
import { fetchMarketplaceSkills, installMarketplaceSkill } from "@/lib/api";
import type {
  MarketplaceSkill,
  MarketplaceFilters as FiltersType,
  MarketplaceSortField,
} from "@/types/marketplace";

// ── Skeleton card ───────────────────────────────────

function MarketplaceCardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl border border-border/50 bg-card overflow-hidden animate-pulse">
      <div className="h-1 w-full bg-secondary" />
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-secondary" />
          <div className="flex-1">
            <div className="h-4 w-3/4 rounded bg-secondary" />
            <div className="mt-1.5 h-3 w-1/2 rounded bg-secondary/60" />
          </div>
        </div>
        <div className="mb-3 space-y-1.5">
          <div className="h-3 w-full rounded bg-secondary/60" />
          <div className="h-3 w-2/3 rounded bg-secondary/60" />
        </div>
        <div className="mb-4 flex gap-1.5">
          <div className="h-5 w-14 rounded-md bg-secondary" />
          <div className="h-5 w-12 rounded-md bg-secondary" />
        </div>
        <div className="mt-auto flex gap-4 border-t border-border/30 pt-3">
          <div className="h-3 w-12 rounded bg-secondary" />
          <div className="h-3 w-10 rounded bg-secondary" />
        </div>
      </div>
      <div className="h-11 border-t border-border/30 bg-secondary/20" />
    </div>
  );
}

// ── Empty state ─────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/50">
        <Store className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="mb-1 text-sm font-medium text-foreground">
        No skills match your search
      </h3>
      <p className="text-xs text-muted-foreground">
        Try adjusting your search or selecting a different category.
      </p>
    </div>
  );
}

// ── Error state ─────────────────────────────────────

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
        <AlertCircle className="h-8 w-8 text-red-400" />
      </div>
      <h3 className="mb-1 text-sm font-medium text-foreground">
        Failed to load marketplace
      </h3>
      <p className="mb-4 text-xs text-muted-foreground">{message}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 rounded-lg border border-border/50 px-3 py-1.5 text-xs font-medium hover:bg-secondary/50 transition-colors"
      >
        <RefreshCw className="h-3 w-3" />
        Retry
      </button>
    </div>
  );
}

// ── Page Component ──────────────────────────────────

export default function MarketplacePage() {
  const [skills, setSkills] = useState<MarketplaceSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FiltersType>({
    search: "",
    category: null,
  });
  const [sort, setSort] = useState<MarketplaceSortField>("downloads");
  const [installingSkill, setInstallingSkill] = useState<MarketplaceSkill | null>(null);

  // ── Fetch skills from API ─────────────────────────

  const loadSkills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMarketplaceSkills({
        search: filters.search || undefined,
        category: filters.category || undefined,
        sort,
        limit: 50,
      });
      setSkills(data.skills ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("Failed to load marketplace:", err);
    } finally {
      setLoading(false);
    }
  }, [filters.search, filters.category, sort]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSkills();
    }, filters.search ? 300 : 0); // Debounce search

    return () => clearTimeout(timer);
  }, [loadSkills, filters.search]);

  // ── Client-side filtering (for instant category/sort) ──

  const filteredSkills = useMemo(() => {
    let result = [...skills];

    // Client-side category filter (supplement server-side)
    if (filters.category) {
      result = result.filter((s) => s.category === filters.category);
    }

    result.sort((a, b) => {
      switch (sort) {
        case "rating":
          return b.rating - a.rating;
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "downloads":
        default:
          return b.downloads - a.downloads;
      }
    });

    return result;
  }, [skills, filters.category, sort]);

  // ── Handlers ──────────────────────────────────────

  const handleInstallClick = useCallback((skill: MarketplaceSkill) => {
    setInstallingSkill(skill);
  }, []);

  const handleInstallConfirm = useCallback(async () => {
    if (!installingSkill) return;

    const skillId = installingSkill.id;

    // Optimistic: set installing
    setSkills((prev) =>
      prev.map((s) =>
        s.id === skillId ? { ...s, installStatus: "installing" as const } : s
      )
    );
    setInstallingSkill(null);

    try {
      await installMarketplaceSkill(skillId);
      setSkills((prev) =>
        prev.map((s) =>
          s.id === skillId
            ? { ...s, installStatus: "installed" as const, downloads: s.downloads + 1 }
            : s
        )
      );
    } catch (err) {
      console.error("Install failed:", err);
      // Revert on failure
      setSkills((prev) =>
        prev.map((s) =>
          s.id === skillId ? { ...s, installStatus: "available" as const } : s
        )
      );
    }
  }, [installingSkill]);

  const totalSkills = skills.length;
  const installedCount = skills.filter((s) => s.installStatus === "installed").length;

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-xl px-6 py-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Marketplace</h1>
            <p className="text-xs text-muted-foreground">
              {filteredSkills.length} of {totalSkills} community skills · {installedCount} installed
            </p>
          </div>
        </div>

        <MarketplaceFilters
          filters={filters}
          sort={sort}
          onChange={setFilters}
          onSortChange={setSort}
        />
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 stagger-in">
            {Array.from({ length: 9 }).map((_, i) => (
              <MarketplaceCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={loadSkills} />
        ) : filteredSkills.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 stagger-in">
            {filteredSkills.map((skill) => (
              <MarketplaceCard
                key={skill.id}
                skill={skill}
                onInstall={handleInstallClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Install Modal */}
      {installingSkill && (
        <InstallSkillModal
          skill={installingSkill}
          onConfirm={handleInstallConfirm}
          onCancel={() => setInstallingSkill(null)}
        />
      )}
    </div>
  );
}
