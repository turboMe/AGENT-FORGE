export interface SkillTemplate {
  persona: string;
  process: string[];
  outputFormat: string;
  constraints: string[];
  systemPrompt?: string;
  examples?: { input: string; output: string }[];
}

export interface Skill {
  id: string;
  name: string;
  slug: string;
  description: string;
  domain: string[];
  pattern: string;
  tags: string[];
  version: number;
  isSystem: boolean;
  isPublic: boolean;
  template?: SkillTemplate;
  stats: {
    useCount: number;
    totalRatings: number;
    avgSatisfaction: number | null;
    lastUsedAt: string | null;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SkillFilters {
  search: string;
  domain: string | null;
  pattern: string | null;
}

export type SkillSortField = 'use_count' | 'satisfaction' | 'created_at';
export type SkillSortOrder = 'asc' | 'desc';

export interface SkillSort {
  field: SkillSortField;
  order: SkillSortOrder;
}

export interface SkillUpdatePayload {
  name?: string;
  description?: string;
  domain?: string[];
  pattern?: string;
  tags?: string[];
  template?: Partial<SkillTemplate>;
}

// ── Constants ───────────────────────────────────────

export const SKILL_PATTERNS = [
  'processor',
  'generator',
  'analyzer',
  'transformer',
  'classifier',
  'extractor',
  'reviewer',
  'planner',
] as const;

export const SKILL_DOMAINS = [
  'engineering',
  'writing',
  'analysis',
  'design',
  'marketing',
  'sales',
  'support',
  'data',
  'devops',
  'security',
] as const;

export const SORT_OPTIONS: { label: string; field: SkillSortField; order: SkillSortOrder }[] = [
  { label: 'Most Used', field: 'use_count', order: 'desc' },
  { label: 'Highest Rated', field: 'satisfaction', order: 'desc' },
  { label: 'Newest', field: 'created_at', order: 'desc' },
  { label: 'Oldest', field: 'created_at', order: 'asc' },
];

// ── Domain color map ────────────────────────────────

export const DOMAIN_COLORS: Record<string, string> = {
  engineering: 'from-blue-500 to-cyan-400',
  writing: 'from-violet-500 to-purple-400',
  analysis: 'from-emerald-500 to-green-400',
  design: 'from-pink-500 to-rose-400',
  marketing: 'from-amber-500 to-yellow-400',
  sales: 'from-orange-500 to-red-400',
  support: 'from-teal-500 to-cyan-400',
  data: 'from-indigo-500 to-blue-400',
  devops: 'from-gray-500 to-slate-400',
  security: 'from-red-500 to-orange-400',
};
