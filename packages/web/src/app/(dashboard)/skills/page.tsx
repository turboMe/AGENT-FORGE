"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Library, Sparkles } from "lucide-react";
import { SkillCard } from "@/components/skills/skill-card";
import { SkillFilters } from "@/components/skills/skill-filters";
import { SkillSort } from "@/components/skills/skill-sort";
import { DeleteSkillModal } from "@/components/skills/delete-skill-modal";
import { EditSkillInline } from "@/components/skills/edit-skill-inline";
import { fetchSkills, updateSkill, deleteSkill, publishSkill } from "@/lib/api";
import type {
  Skill,
  SkillFilters as SkillFiltersType,
  SkillSort as SkillSortType,
  SkillUpdatePayload,
} from "@/types/skill";

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

  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
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

  // ── Fetch skills from API ───────────────────────

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetchSkills({
          search: filters.search || undefined,
          domain: filters.domain || undefined,
          pattern: filters.pattern || undefined,
          sort: `${sort.field}:${sort.order}`,
          limit: 100,
        });
        if (!cancelled) {
          setSkills(res.skills);
        }
      } catch (err) {
        console.error("Failed to load skills:", err);
        if (!cancelled) {
          setSkills([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [filters.search, filters.domain, filters.pattern, sort.field, sort.order]);

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
          s.id === id ? ({ ...s, ...data, updatedAt: new Date().toISOString() } as Skill) : s
        )
      );
      setEditingId(null);

      // Fire API call (non-blocking)
      updateSkill(id, data).catch(console.error);
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
    deleteSkill(deletingSkill.id).catch(console.error);
  }, [deletingSkill]);

  const handlePublish = useCallback((skill: Skill) => {
    // Optimistic toggle
    setSkills((prev) =>
      prev.map((s) =>
        s.id === skill.id ? { ...s, isPublic: !s.isPublic } : s
      )
    );

    // Fire API call
    publishSkill(skill.id).catch((err) => {
      console.error("Failed to toggle publish:", err);
      // Revert on failure
      setSkills((prev) =>
        prev.map((s) =>
          s.id === skill.id ? { ...s, isPublic: skill.isPublic } : s
        )
      );
    });
  }, []);

  const hasFilters = !!(filters.search || filters.domain || filters.pattern);

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <div className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-xl px-6 py-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Skill Library</h1>
            <p className="text-xs text-muted-foreground">
              {loading
                ? "Loading..."
                : `${skills.length} skill${skills.length !== 1 ? "s" : ""} ${hasFilters ? "matching" : "available"}`}
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
        ) : skills.length === 0 ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 stagger-in">
            {skills.map((skill) =>
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
                  onPublish={handlePublish}
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
