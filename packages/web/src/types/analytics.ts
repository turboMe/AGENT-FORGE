// ── Analytics / Decision Log Types (Frontend) ──────

export interface Decision {
  id: string;
  taskId: string;
  taskSummary: string;
  actionTaken: 'create_new' | 'use_existing' | 'adapt_existing' | 'reject';
  skillUsed: string | null;
  executionSuccess: boolean;
  latencyMs: number;
  costUsd: number;
  createdAt: string;
}

export interface DecisionFilters {
  search: string;
  action: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  success: boolean | null;
}

export interface SkillsCreatedDataPoint {
  date: string;
  count: number;
}

export interface HitRateDataPoint {
  date: string;
  hitRate: number;
  totalQueries: number;
}

export interface TopSkillDataPoint {
  name: string;
  useCount: number;
  satisfaction: number;
}

export interface CostDataPoint {
  date: string;
  cost: number;
  tokens: number;
}

export interface AnalyticsOverview {
  skillsCreatedOverTime: SkillsCreatedDataPoint[];
  retrievalHitRate: HitRateDataPoint[];
  topSkills: TopSkillDataPoint[];
  costOverTime: CostDataPoint[];
  totals: {
    totalDecisions: number;
    totalSkills: number;
    avgHitRate: number;
    totalCost: number;
  };
}

// ── Constants ───────────────────────────────────────

export const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create_new: { label: 'Created New', color: 'text-emerald-400' },
  use_existing: { label: 'Used Existing', color: 'text-blue-400' },
  adapt_existing: { label: 'Adapted', color: 'text-amber-400' },
  reject: { label: 'Rejected', color: 'text-red-400' },
};

export const ACTION_OPTIONS = [
  { value: 'create_new', label: 'Created New' },
  { value: 'use_existing', label: 'Used Existing' },
  { value: 'adapt_existing', label: 'Adapted' },
  { value: 'reject', label: 'Rejected' },
];
