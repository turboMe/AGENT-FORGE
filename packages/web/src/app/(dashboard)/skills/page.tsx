"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Library, Sparkles } from "lucide-react";
import { SkillCard } from "@/components/skills/skill-card";
import { SkillFilters } from "@/components/skills/skill-filters";
import { SkillSort } from "@/components/skills/skill-sort";
import { DeleteSkillModal } from "@/components/skills/delete-skill-modal";
import { EditSkillInline } from "@/components/skills/edit-skill-inline";
import type {
  Skill,
  SkillFilters as SkillFiltersType,
  SkillSort as SkillSortType,
  SkillUpdatePayload,
} from "@/types/skill";

// ── Mock data (used until API returns real data) ────

const MOCK_SKILLS: Skill[] = [
  {
    id: "sk_001",
    name: "Cold Outreach Writer",
    slug: "cold-outreach-writer",
    description:
      "Generates personalized cold outreach emails for B2B contexts, optimized for open and response rates. Specialized in HoReCa, FoodTech, and SaaS sales.",
    domain: ["sales", "marketing"],
    pattern: "generator",
    tags: ["email", "outreach", "b2b", "cold-email"],
    version: 1,
    isSystem: true,
    isPublic: true,
    stats: { useCount: 142, totalRatings: 38, avgSatisfaction: 4.6, lastUsedAt: "2026-03-22T10:30:00Z" },
    createdBy: "system",
    createdAt: "2026-01-15T12:00:00Z",
    updatedAt: "2026-03-20T08:00:00Z",
  },
  {
    id: "sk_002",
    name: "Food Cost Analyst",
    slug: "food-cost-analyst",
    description:
      "Analyzes restaurant menu food cost ratios, identifies high-cost items, and proposes concrete optimization strategies for better margins.",
    domain: ["analysis", "data"],
    pattern: "analyzer",
    tags: ["food-cost", "restaurant", "margins", "menu"],
    version: 2,
    isSystem: true,
    isPublic: true,
    stats: { useCount: 87, totalRatings: 22, avgSatisfaction: 4.8, lastUsedAt: "2026-03-21T14:20:00Z" },
    createdBy: "system",
    createdAt: "2026-01-20T09:00:00Z",
    updatedAt: "2026-03-18T11:00:00Z",
  },
  {
    id: "sk_003",
    name: "Prompt Architect",
    slug: "prompt-architect",
    description:
      "Elite prompt/skill/agent creator that diagnoses user needs and crafts precision-engineered prompts, skills, and custom agents for any LLM platform.",
    domain: ["engineering"],
    pattern: "generator",
    tags: ["prompt", "skill", "agent", "llm"],
    version: 3,
    isSystem: true,
    isPublic: true,
    stats: { useCount: 256, totalRatings: 64, avgSatisfaction: 4.9, lastUsedAt: "2026-03-22T15:00:00Z" },
    createdBy: "system",
    createdAt: "2026-01-10T08:00:00Z",
    updatedAt: "2026-03-22T12:00:00Z",
  },
  {
    id: "sk_004",
    name: "Business Coach IT/Hospitality",
    slug: "business-coach-it-hospitality",
    description:
      "Elite AI business coach specialized in IT and Hospitality sectors. Expert in market research, niche identification, brand building, and startup evaluation.",
    domain: ["marketing", "analysis"],
    pattern: "processor",
    tags: ["business", "coaching", "startup", "strategy"],
    version: 1,
    isSystem: true,
    isPublic: true,
    stats: { useCount: 63, totalRatings: 15, avgSatisfaction: 4.4, lastUsedAt: "2026-03-19T09:30:00Z" },
    createdBy: "system",
    createdAt: "2026-02-01T10:00:00Z",
    updatedAt: "2026-03-15T16:00:00Z",
  },
  {
    id: "sk_005",
    name: "Code Review Assistant",
    slug: "code-review-assistant",
    description:
      "Performs thorough code reviews focusing on correctness, performance, security, and best practices. Supports TypeScript, Python, and Go.",
    domain: ["engineering", "security"],
    pattern: "reviewer",
    tags: ["code-review", "typescript", "python", "security"],
    version: 1,
    isSystem: false,
    isPublic: false,
    stats: { useCount: 198, totalRatings: 45, avgSatisfaction: 4.7, lastUsedAt: "2026-03-22T14:00:00Z" },
    createdBy: "user_001",
    createdAt: "2026-02-10T14:00:00Z",
    updatedAt: "2026-03-21T10:00:00Z",
  },
  {
    id: "sk_006",
    name: "Data Pipeline Designer",
    slug: "data-pipeline-designer",
    description:
      "Designs and documents ETL/ELT data pipelines using modern patterns. Specializes in real-time streaming and batch processing architectures.",
    domain: ["data", "devops"],
    pattern: "planner",
    tags: ["etl", "pipeline", "streaming", "architecture"],
    version: 1,
    isSystem: false,
    isPublic: true,
    stats: { useCount: 34, totalRatings: 8, avgSatisfaction: 4.2, lastUsedAt: "2026-03-18T11:00:00Z" },
    createdBy: "user_001",
    createdAt: "2026-03-01T09:00:00Z",
    updatedAt: "2026-03-18T11:00:00Z",
  },
  {
    id: "sk_007",
    name: "SEO Content Optimizer",
    slug: "seo-content-optimizer",
    description:
      "Optimizes web content for search engines while maintaining readability. Analyzes keyword density, meta tags, headings, and internal linking patterns.",
    domain: ["marketing", "writing"],
    pattern: "transformer",
    tags: ["seo", "content", "keywords", "optimization"],
    version: 1,
    isSystem: false,
    isPublic: true,
    stats: { useCount: 76, totalRatings: 19, avgSatisfaction: 4.3, lastUsedAt: "2026-03-20T16:00:00Z" },
    createdBy: "user_002",
    createdAt: "2026-02-15T11:00:00Z",
    updatedAt: "2026-03-20T16:00:00Z",
  },
  {
    id: "sk_008",
    name: "API Documentation Generator",
    slug: "api-documentation-generator",
    description:
      "Generates comprehensive API documentation from code, OpenAPI specs, or natural language descriptions. Outputs markdown, HTML, or RST formats.",
    domain: ["engineering", "writing"],
    pattern: "generator",
    tags: ["api", "documentation", "openapi", "markdown"],
    version: 2,
    isSystem: false,
    isPublic: true,
    stats: { useCount: 112, totalRatings: 28, avgSatisfaction: 4.5, lastUsedAt: "2026-03-22T09:00:00Z" },
    createdBy: "user_001",
    createdAt: "2026-01-25T15:00:00Z",
    updatedAt: "2026-03-22T09:00:00Z",
  },
  {
    id: "sk_009",
    name: "Security Vulnerability Scanner",
    slug: "security-vulnerability-scanner",
    description:
      "Analyzes code and infrastructure configurations for security vulnerabilities. Cross-references OWASP Top 10 and CVE databases.",
    domain: ["security", "engineering"],
    pattern: "analyzer",
    tags: ["security", "vulnerability", "owasp", "cve"],
    version: 1,
    isSystem: false,
    isPublic: false,
    stats: { useCount: 45, totalRatings: 12, avgSatisfaction: 4.1, lastUsedAt: "2026-03-17T13:00:00Z" },
    createdBy: "user_003",
    createdAt: "2026-02-20T08:00:00Z",
    updatedAt: "2026-03-17T13:00:00Z",
  },
];

// ── Skeleton card ───────────────────────────────────

function SkillCardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl border border-border/50 bg-card overflow-hidden animate-pulse">
      <div className="h-1 w-full bg-secondary" />
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="h-4 w-3/4 rounded bg-secondary" />
            <div className="mt-2 h-3 w-full rounded bg-secondary/60" />
            <div className="mt-1 h-3 w-2/3 rounded bg-secondary/60" />
          </div>
        </div>
        <div className="mb-4 flex gap-1.5">
          <div className="h-5 w-16 rounded-md bg-secondary" />
          <div className="h-5 w-14 rounded-md bg-secondary" />
        </div>
        <div className="mt-auto flex gap-4 border-t border-border/30 pt-3">
          <div className="h-3 w-10 rounded bg-secondary" />
          <div className="h-3 w-8 rounded bg-secondary" />
          <div className="h-3 w-14 rounded bg-secondary" />
        </div>
      </div>
      <div className="h-11 border-t border-border/30 bg-secondary/20" />
    </div>
  );
}

// ── Empty state ─────────────────────────────────────

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/50">
        <Library className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="mb-1 text-sm font-medium text-foreground">
        {hasFilters ? "No skills match your filters" : "No skills yet"}
      </h3>
      <p className="text-xs text-muted-foreground">
        {hasFilters
          ? "Try adjusting your search or removing some filters."
          : "Skills will appear here as you use the chat."}
      </p>
    </div>
  );
}

// ── Page Component ──────────────────────────────────

export default function SkillsPage() {
  const router = useRouter();

  const [skills, setSkills] = useState<Skill[]>(MOCK_SKILLS);
  const [loading] = useState(false);
  const [filters, setFilters] = useState<SkillFiltersType>({
    search: "",
    domain: null,
    pattern: null,
  });
  const [sort, setSort] = useState<SkillSortType>({
    field: "use_count",
    order: "desc",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingSkill, setDeletingSkill] = useState<Skill | null>(null);

  // ── Filter & Sort ───────────────────────────────

  const filteredSkills = useMemo(() => {
    let result = [...skills];

    // Search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Domain
    if (filters.domain) {
      result = result.filter((s) => s.domain.includes(filters.domain!));
    }

    // Pattern
    if (filters.pattern) {
      result = result.filter((s) => s.pattern === filters.pattern);
    }

    // Sort
    result.sort((a, b) => {
      const dir = sort.order === "desc" ? -1 : 1;
      switch (sort.field) {
        case "use_count":
          return (a.stats.useCount - b.stats.useCount) * dir;
        case "satisfaction":
          return (
            ((a.stats.avgSatisfaction ?? 0) - (b.stats.avgSatisfaction ?? 0)) *
            dir
          );
        case "created_at":
          return (
            (new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime()) *
            dir
          );
        default:
          return 0;
      }
    });

    return result;
  }, [skills, filters, sort]);

  // ── Handlers ────────────────────────────────────

  const handleUse = useCallback(
    (skill: Skill) => {
      router.push(`/?skill=${skill.id}&skillName=${encodeURIComponent(skill.name)}`);
    },
    [router]
  );

  const handleEdit = useCallback((skill: Skill) => {
    setEditingId(skill.id);
  }, []);

  const handleSaveEdit = useCallback(
    (id: string, data: SkillUpdatePayload) => {
      // Optimistic update
      setSkills((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s
        )
      );
      setEditingId(null);

      // Fire API call (non-blocking)
      // updateSkill(id, data).catch(console.error);
    },
    []
  );

  const handleDelete = useCallback((skill: Skill) => {
    setDeletingSkill(skill);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!deletingSkill) return;

    // Optimistic remove
    setSkills((prev) => prev.filter((s) => s.id !== deletingSkill.id));
    setDeletingSkill(null);

    // Fire API call (non-blocking)
    // deleteSkill(deletingSkill.id).catch(console.error);
  }, [deletingSkill]);

  const hasFilters = !!(filters.search || filters.domain || filters.pattern);

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-xl px-6 py-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Skill Library</h1>
            <p className="text-xs text-muted-foreground">
              {filteredSkills.length} skill{filteredSkills.length !== 1 ? "s" : ""}{" "}
              {hasFilters ? "matching" : "available"}
            </p>
          </div>
        </div>

        {/* Filters + Sort */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <SkillFilters filters={filters} onChange={setFilters} />
          </div>
          <div className="flex shrink-0 items-start">
            <SkillSort sort={sort} onChange={setSort} />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 stagger-in">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkillCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredSkills.length === 0 ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 stagger-in">
            {filteredSkills.map((skill) =>
              editingId === skill.id ? (
                <EditSkillInline
                  key={skill.id}
                  skill={skill}
                  onSave={handleSaveEdit}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  onUse={handleUse}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              )
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingSkill && (
        <DeleteSkillModal
          skill={deletingSkill}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingSkill(null)}
        />
      )}
    </div>
  );
}
