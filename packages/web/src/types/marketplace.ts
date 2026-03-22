// ── Marketplace Types (Frontend) ────────────────────

export interface MarketplaceSkill {
  id: string;
  name: string;
  slug: string;
  description: string;
  author: {
    name: string;
    avatar: string;
  };
  category: string;
  tags: string[];
  version: string;
  downloads: number;
  rating: number;
  totalRatings: number;
  installStatus: 'available' | 'installing' | 'installed';
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceFilters {
  search: string;
  category: string | null;
}

export type MarketplaceSortField = 'downloads' | 'rating' | 'newest';

// ── Constants ───────────────────────────────────────

export const MARKETPLACE_CATEGORIES = [
  'All',
  'AI / ML',
  'DevOps',
  'Writing',
  'Data',
  'Security',
  'Marketing',
  'Design',
  'Engineering',
  'Support',
] as const;

export const CATEGORY_ICONS: Record<string, string> = {
  'AI / ML': '🤖',
  DevOps: '⚙️',
  Writing: '✍️',
  Data: '📊',
  Security: '🔒',
  Marketing: '📣',
  Design: '🎨',
  Engineering: '🛠️',
  Support: '🎧',
};

export const CATEGORY_COLORS: Record<string, string> = {
  'AI / ML': 'from-purple-500 to-violet-500',
  DevOps: 'from-gray-500 to-slate-500',
  Writing: 'from-amber-500 to-orange-400',
  Data: 'from-emerald-500 to-teal-500',
  Security: 'from-red-500 to-rose-500',
  Marketing: 'from-pink-500 to-fuchsia-500',
  Design: 'from-cyan-500 to-blue-400',
  Engineering: 'from-blue-500 to-indigo-500',
  Support: 'from-teal-500 to-green-400',
};
