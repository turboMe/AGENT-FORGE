"use client";

import { useState, useCallback, useMemo } from "react";
import { Store, Sparkles } from "lucide-react";
import { MarketplaceCard } from "@/components/marketplace/marketplace-card";
import { MarketplaceFilters } from "@/components/marketplace/marketplace-filters";
import { InstallSkillModal } from "@/components/marketplace/install-skill-modal";
import type {
  MarketplaceSkill,
  MarketplaceFilters as FiltersType,
  MarketplaceSortField,
} from "@/types/marketplace";

// ── Mock data ───────────────────────────────────────

const MOCK_MARKETPLACE: MarketplaceSkill[] = [
  {
    id: "mkt_001", name: "GPT Prompt Optimizer", slug: "gpt-prompt-optimizer",
    description: "Automatically optimizes and refines your prompts for better LLM output quality. Supports chain-of-thought, few-shot, and instruction tuning patterns.",
    author: { name: "PromptLab", avatar: "https://api.dicebear.com/9.x/initials/svg?seed=PL" },
    category: "AI / ML", tags: ["prompt", "optimization", "gpt"], version: "1.2.0",
    downloads: 3420, rating: 4.8, totalRatings: 156, installStatus: "available", isVerified: true,
    createdAt: "2025-11-10T08:00:00Z", updatedAt: "2026-03-15T12:00:00Z",
  },
  {
    id: "mkt_002", name: "Kubernetes Deployer", slug: "kubernetes-deployer",
    description: "Generates Kubernetes manifests, Helm charts, and CI/CD pipeline configs from natural language descriptions of your infrastructure.",
    author: { name: "CloudCraft", avatar: "https://api.dicebear.com/9.x/initials/svg?seed=CC" },
    category: "DevOps", tags: ["k8s", "helm", "deployment"], version: "2.0.1",
    downloads: 2180, rating: 4.6, totalRatings: 89, installStatus: "available", isVerified: true,
    createdAt: "2025-12-01T10:00:00Z", updatedAt: "2026-03-10T09:00:00Z",
  },
  {
    id: "mkt_003", name: "Blog Post Generator", slug: "blog-post-generator",
    description: "Creates SEO-optimized blog posts with proper heading hierarchy, meta descriptions, and internal linking suggestions.",
    author: { name: "ContentAI", avatar: "https://api.dicebear.com/9.x/initials/svg?seed=CA" },
    category: "Writing", tags: ["blog", "seo", "content"], version: "1.5.0",
    downloads: 5670, rating: 4.4, totalRatings: 234, installStatus: "available", isVerified: true,
    createdAt: "2025-10-15T12:00:00Z", updatedAt: "2026-02-28T14:00:00Z",
  },
  {
    id: "mkt_004", name: "SQL Query Builder", slug: "sql-query-builder",
    description: "Converts natural language questions into optimized SQL queries. Supports PostgreSQL, MySQL, and SQLite with JOIN detection.",
    author: { name: "DataForge", avatar: "https://api.dicebear.com/9.x/initials/svg?seed=DF" },
    category: "Data", tags: ["sql", "database", "query"], version: "3.1.0",
    downloads: 4890, rating: 4.9, totalRatings: 312, installStatus: "installed", isVerified: true,
    createdAt: "2025-09-20T08:00:00Z", updatedAt: "2026-03-18T11:00:00Z",
  },
  {
    id: "mkt_005", name: "Penetration Test Report", slug: "pentest-report",
    description: "Generates professional penetration testing reports with CVSS scoring, remediation steps, and executive summaries.",
    author: { name: "SecOps.ai", avatar: "https://api.dicebear.com/9.x/initials/svg?seed=SO" },
    category: "Security", tags: ["pentest", "security", "report"], version: "1.0.3",
    downloads: 1230, rating: 4.7, totalRatings: 67, installStatus: "available", isVerified: false,
    createdAt: "2026-01-05T09:00:00Z", updatedAt: "2026-03-12T15:00:00Z",
  },
  {
    id: "mkt_006", name: "Social Media Calendar", slug: "social-media-calendar",
    description: "Plans and generates a month of social media content across LinkedIn, Twitter/X, Instagram, and TikTok with hashtag research.",
    author: { name: "GrowthKit", avatar: "https://api.dicebear.com/9.x/initials/svg?seed=GK" },
    category: "Marketing", tags: ["social-media", "content-calendar"], version: "1.3.0",
    downloads: 2890, rating: 4.3, totalRatings: 145, installStatus: "available", isVerified: true,
    createdAt: "2025-11-20T14:00:00Z", updatedAt: "2026-03-05T10:00:00Z",
  },
  {
    id: "mkt_007", name: "UI Component Generator", slug: "ui-component-generator",
    description: "Generates production-ready React/Vue/Svelte components from design descriptions with accessibility and responsive breakpoints.",
    author: { name: "DesignDev", avatar: "https://api.dicebear.com/9.x/initials/svg?seed=DD" },
    category: "Design", tags: ["ui", "react", "components"], version: "2.2.0",
    downloads: 3750, rating: 4.5, totalRatings: 198, installStatus: "available", isVerified: true,
    createdAt: "2025-10-01T11:00:00Z", updatedAt: "2026-03-20T08:00:00Z",
  },
  {
    id: "mkt_008", name: "Test Suite Generator", slug: "test-suite-generator",
    description: "Analyzes source code and generates comprehensive test suites with unit, integration, and e2e tests. Supports Jest, Vitest, Playwright.",
    author: { name: "TestCraft", avatar: "https://api.dicebear.com/9.x/initials/svg?seed=TC" },
    category: "Engineering", tags: ["testing", "jest", "vitest"], version: "1.8.0",
    downloads: 4120, rating: 4.6, totalRatings: 267, installStatus: "available", isVerified: true,
    createdAt: "2025-10-25T09:00:00Z", updatedAt: "2026-03-19T13:00:00Z",
  },
  {
    id: "mkt_009", name: "Customer Support Agent", slug: "customer-support-agent",
    description: "Handles common customer support queries with empathetic, professional responses. Integrates knowledge base lookups.",
    author: { name: "HelpDesk AI", avatar: "https://api.dicebear.com/9.x/initials/svg?seed=HD" },
    category: "Support", tags: ["support", "customer-service"], version: "1.1.0",
    downloads: 1890, rating: 4.2, totalRatings: 98, installStatus: "available", isVerified: false,
    createdAt: "2026-01-15T10:00:00Z", updatedAt: "2026-03-08T16:00:00Z",
  },
  {
    id: "mkt_010", name: "API Rate Limiter Config", slug: "api-rate-limiter-config",
    description: "Generates optimal rate limiting configurations for REST and GraphQL APIs with Redis and token bucket algorithms.",
    author: { name: "APISec", avatar: "https://api.dicebear.com/9.x/initials/svg?seed=AS" },
    category: "Engineering", tags: ["api", "rate-limiting"], version: "1.0.0",
    downloads: 980, rating: 4.4, totalRatings: 45, installStatus: "available", isVerified: false,
    createdAt: "2026-02-01T08:00:00Z", updatedAt: "2026-03-01T12:00:00Z",
  },
  {
    id: "mkt_011", name: "Data Visualization Advisor", slug: "data-viz-advisor",
    description: "Recommends chart types and visualization strategies. Generates D3.js, Chart.js, or Recharts code with proper styling.",
    author: { name: "VizFlow", avatar: "https://api.dicebear.com/9.x/initials/svg?seed=VF" },
    category: "Data", tags: ["visualization", "d3", "charts"], version: "1.4.0",
    downloads: 2340, rating: 4.7, totalRatings: 123, installStatus: "available", isVerified: true,
    createdAt: "2025-12-10T11:00:00Z", updatedAt: "2026-03-14T09:00:00Z",
  },
  {
    id: "mkt_012", name: "Terraform Module Builder", slug: "terraform-module-builder",
    description: "Creates reusable Terraform modules with best practices for AWS, GCP, and Azure. Includes variable validation and README generation.",
    author: { name: "InfraCode", avatar: "https://api.dicebear.com/9.x/initials/svg?seed=IC" },
    category: "DevOps", tags: ["terraform", "iac", "cloud"], version: "2.1.0",
    downloads: 3100, rating: 4.8, totalRatings: 178, installStatus: "available", isVerified: true,
    createdAt: "2025-11-01T08:00:00Z", updatedAt: "2026-03-16T14:00:00Z",
  },
];

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

// ── Page Component ──────────────────────────────────

export default function MarketplacePage() {
  const [skills, setSkills] = useState<MarketplaceSkill[]>(MOCK_MARKETPLACE);
  const [loading] = useState(false);
  const [filters, setFilters] = useState<FiltersType>({
    search: "",
    category: null,
  });
  const [sort, setSort] = useState<MarketplaceSortField>("downloads");
  const [installingSkill, setInstallingSkill] = useState<MarketplaceSkill | null>(null);

  // ── Filter & Sort ─────────────────────────────────

  const filteredSkills = useMemo(() => {
    let result = [...skills];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

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
  }, [skills, filters, sort]);

  // ── Handlers ──────────────────────────────────────

  const handleInstallClick = useCallback((skill: MarketplaceSkill) => {
    setInstallingSkill(skill);
  }, []);

  const handleInstallConfirm = useCallback(() => {
    if (!installingSkill) return;

    const skillId = installingSkill.id;

    // Optimistic: set installing
    setSkills((prev) =>
      prev.map((s) =>
        s.id === skillId ? { ...s, installStatus: "installing" as const } : s
      )
    );
    setInstallingSkill(null);

    // Simulate install delay
    setTimeout(() => {
      setSkills((prev) =>
        prev.map((s) =>
          s.id === skillId
            ? { ...s, installStatus: "installed" as const, downloads: s.downloads + 1 }
            : s
        )
      );
    }, 1500);
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
