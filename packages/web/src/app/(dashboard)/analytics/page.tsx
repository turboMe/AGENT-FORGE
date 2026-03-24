"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Sparkles, TrendingUp, Target, DollarSign, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DecisionLogTable } from "@/components/analytics/decision-log-table";
import { DecisionFilters } from "@/components/analytics/decision-filters";
import {
  SkillsCreatedChart,
  HitRateChart,
  TopSkillsChart,
  CostChart,
} from "@/components/analytics/chart-cards";
import type { DecisionFilters as FiltersType } from "@/types/analytics";
import { fetchDecisions, fetchAnalyticsOverview } from "@/lib/api";

type TabKey = "overview" | "decisions";

export default function AnalyticsPage() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [filters, setFilters] = useState<FiltersType>({
    search: "",
    action: null,
    dateFrom: null,
    dateTo: null,
    success: null,
  });

  // ── Fetch Analytics Overview ──────────────────────
  const { data: overview, isLoading: isOverviewLoading } = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: fetchAnalyticsOverview,
  });

  // ── Fetch Decisions ───────────────────────────────
  const { data: decisionsData, isLoading: isDecisionsLoading } = useQuery({
    queryKey: [
      "analytics",
      "decisions",
      filters.search,
      filters.action,
      filters.success,
      filters.dateFrom,
      filters.dateTo,
    ],
    queryFn: () =>
      fetchDecisions({
        page: 1, // Add proper pagination state later if needed
        limit: 100, // Fetch up to 100 for the log view
        search: filters.search || undefined,
        action: filters.action || undefined,
        success: filters.success ?? undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      }),
  });

  const decisions = decisionsData?.decisions ?? [];
  const totals = overview?.totals ?? {
    totalDecisions: 0,
    totalSkills: 0,
    avgHitRate: 0,
    totalCost: 0,
  };

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-xl px-6 py-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Analytics</h1>
            <p className="text-xs text-muted-foreground">
              Pipeline insights and decision history
            </p>
          </div>
        </div>

        {/* Stat badges */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/30 px-3 py-1.5">
            <BarChart3 className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{totals.totalDecisions}</span> decisions
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/30 px-3 py-1.5">
            <Target className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{totals.avgHitRate}%</span> success rate
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/30 px-3 py-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{totals.totalSkills}</span> distinct skills used
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/30 px-3 py-1.5">
            <DollarSign className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">${totals.totalCost.toFixed(4)}</span> total cost
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-secondary/30 p-1 w-fit">
          {(["overview", "decisions"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "rounded-md px-4 py-1.5 text-xs font-medium transition-all duration-200",
                tab === t
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "overview" ? "Overview" : "Decision Log"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 relative">
        {(isOverviewLoading || isDecisionsLoading) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {tab === "overview" ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 stagger-in">
            <SkillsCreatedChart data={overview?.skillsCreatedOverTime ?? []} />
            <HitRateChart data={overview?.retrievalHitRate ?? []} />
            <TopSkillsChart data={overview?.topSkills ?? []} />
            <CostChart data={overview?.costOverTime ?? []} />
          </div>
        ) : (
          <div className="space-y-4">
            <DecisionFilters filters={filters} onChange={setFilters} />
            <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
              <DecisionLogTable decisions={decisions} />
            </div>
            <p className="text-center text-xs text-muted-foreground/60">
              Showing {decisions.length} of {decisionsData?.pagination.total ?? 0} decisions
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
