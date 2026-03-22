"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUpDown, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SORT_OPTIONS } from "@/types/skill";
import type { SkillSort as SkillSortType } from "@/types/skill";

interface SkillSortProps {
  sort: SkillSortType;
  onChange: (sort: SkillSortType) => void;
}

export function SkillSort({ sort, onChange }: SkillSortProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const current = SORT_OPTIONS.find(
    (o) => o.field === sort.field && o.order === sort.order
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2.5",
          "text-xs font-medium text-muted-foreground",
          "hover:text-foreground hover:border-border transition-all duration-200"
        )}
      >
        <ArrowUpDown className="h-3.5 w-3.5" />
        {current?.label ?? "Sort"}
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-40 rounded-xl border border-border bg-popover p-1.5 shadow-xl shadow-black/20 animate-in slide-in-from-top-2">
          {SORT_OPTIONS.map((opt) => {
            const isActive = opt.field === sort.field && opt.order === sort.order;
            return (
              <button
                key={`${opt.field}-${opt.order}`}
                type="button"
                onClick={() => {
                  onChange({ field: opt.field, order: opt.order });
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors",
                  isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50"
                )}
              >
                {opt.label}
                {isActive && <Check className="h-3 w-3 text-violet-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
