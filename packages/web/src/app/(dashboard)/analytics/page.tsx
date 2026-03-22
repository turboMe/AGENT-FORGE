"use client";

import { useState, useMemo } from "react";
import { BarChart3, Sparkles, TrendingUp, Target, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { DecisionLogTable } from "@/components/analytics/decision-log-table";
import { DecisionFilters } from "@/components/analytics/decision-filters";
import {
  SkillsCreatedChart,
  HitRateChart,
  TopSkillsChart,
  CostChart,
} from "@/components/analytics/chart-cards";
import type { Decision, DecisionFilters as FiltersType } from "@/types/analytics";

// ── Mock data ───────────────────────────────────────

function generateMockDecisions(): Decision[] {
  const actions = ["create_new", "use_existing", "adapt_existing", "reject"] as const;
  const skills = [
    "Prompt Architect",
    "Code Review Assistant",
    "Cold Outreach Writer",
    "Food Cost Analyst",
    "SEO Optimizer",
    "Test Generator",
    null,
  ];
  const tasks = [
    "Write blog post about Next.js 15",
    "Review pull request #42",
    "Generate cold email for restaurant chain",
    "Analyze food cost for Italian menu",
    "Create Kubernetes deployment manifest",
    "Debug authentication middleware",
    "Optimize database queries",
    "Design landing page wireframe",
    "Build data pipeline architecture",
    "Write API documentation",
    "Generate penetration test report",
    "Create social media content calendar",
    "Refactor user authentication flow",
    "Implement real-time notifications",
    "Analyze competitor pricing strategy",
  ];

  const now = new Date();
  return Array.from({ length: 40 }, (_, i) => {
    const d = new Date(now);
    d.setHours(d.getHours() - i * 3);
    const action = actions[Math.floor(Math.random() * actions.length)]!;
    return {
      id: `dec_${(i + 1).toString().padStart(3, "0")}`,
      taskId: `task_${(i + 1).toString().padStart(3, "0")}`,
      taskSummary: tasks[i % tasks.length]!,
      actionTaken: action,
      skillUsed: action === "reject" ? null : skills[Math.floor(Math.random() * skills.length)]!,
      executionSuccess: Math.random() > 0.15,
      latencyMs: Math.floor(Math.random() * 3000) + 200,
      costUsd: parseFloat((Math.random() * 0.15 + 0.005).toFixed(4)),
      createdAt: d.toISOString(),
    };
  });
}

function generateMockOverview() {
  const now = new Date();
  return {
    skillsCreatedOverTime: Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (29 - i));
      return { date: d.toISOString().slice(0, 10), count: Math.floor(Math.random() * 5) + 1 };
    }),
    retrievalHitRate: Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (29 - i));
      return {
        date: d.toISOString().slice(0, 10),
        hitRate: Math.floor(Math.random() * 30) + 60,
        totalQueries: Math.floor(Math.random() * 50) + 20,
      };
    }),
    topSkills: [
      { name: "Prompt Architect", useCount: 256, satisfaction: 4.9 },
      { name: "Code Review", useCount: 198, satisfaction: 4.7 },
      { name: "Cold Outreach", useCount: 142, satisfaction: 4.6 },
      { name: "API Doc Gen", useCount: 112, satisfaction: 4.5 },
      { name: "Food Cost", useCount: 87, satisfaction: 4.8 },
      { name: "SEO Optimizer", useCount: 76, satisfaction: 4.3 },
      { name: "Business Coach", useCount: 63, satisfaction: 4.4 },
      { name: "Security Scan", useCount: 45, satisfaction: 4.1 },
    ],
    costOverTime: Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (29 - i));
      return {
        date: d.toISOString().slice(0, 10),
        cost: parseFloat((Math.random() * 2.5 + 0.3).toFixed(2)),
        tokens: Math.floor(Math.random() * 50000) + 5000,
      };
    }),
  };
}

const MOCK_DECISIONS = generateMockDecisions();
const MOCK_OVERVIEW = generateMockOverview();

// ── Page Component ──────────────────────────────────

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

  // ── Filter decisions ──────────────────────────────

  const filteredDecisions = useMemo(() => {
    let result = [...MOCK_DECISIONS];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (d) =>
          d.taskSummary.toLowerCase().includes(q) ||
          d.skillUsed?.toLowerCase().includes(q)
      );
    }

    if (filters.action) {
      result = result.filter((d) => d.actionTaken === filters.action);
    }

    if (filters.success !== null) {
      result = result.filter((d) => d.executionSuccess === filters.success);
    }

    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      result = result.filter((d) => new Date(d.createdAt) >= from);
    }

    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((d) => new Date(d.createdAt) <= to);
    }

    return result;
  }, [filters]);

  // ── Stat badges ───────────────────────────────────

  const totalDecisions = MOCK_DECISIONS.length;
  const successRate = Math.round(
    (MOCK_DECISIONS.filter((d) => d.executionSuccess).length / totalDecisions) * 100
  );
  const totalCost = MOCK_DECISIONS.reduce((s, d) => s + d.costUsd, 0);
  const avgLatency = Math.round(
    MOCK_DECISIONS.reduce((s, d) => s + d.latencyMs, 0) / totalDecisions
  );

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
              <span className="font-semibold text-foreground">{totalDecisions}</span> decisions
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/30 px-3 py-1.5">
            <Target className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{successRate}%</span> success rate
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/30 px-3 py-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{avgLatency}ms</span> avg latency
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/30 px-3 py-1.5">
            <DollarSign className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">${totalCost.toFixed(2)}</span> total cost
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
      <div className="flex-1 overflow-y-auto p-6">
        {tab === "overview" ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 stagger-in">
            <SkillsCreatedChart data={MOCK_OVERVIEW.skillsCreatedOverTime} />
            <HitRateChart data={MOCK_OVERVIEW.retrievalHitRate} />
            <TopSkillsChart data={MOCK_OVERVIEW.topSkills} />
            <CostChart data={MOCK_OVERVIEW.costOverTime} />
          </div>
        ) : (
          <div className="space-y-4">
            <DecisionFilters filters={filters} onChange={setFilters} />
            <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
              <DecisionLogTable decisions={filteredDecisions} />
            </div>
            <p className="text-center text-xs text-muted-foreground/60">
              Showing {filteredDecisions.length} of {totalDecisions} decisions
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
