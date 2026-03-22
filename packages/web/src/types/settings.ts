// ── Settings Types (Frontend) ───────────────────────

export interface UserProfile {
  displayName: string;
  email: string;
  avatarUrl: string | null;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  defaultModel: string;
  notifications: {
    email: boolean;
    push: boolean;
    weeklyReport: boolean;
  };
}

export interface UsageStats {
  apiCalls: { used: number; limit: number };
  storage: { used: number; limit: number };
  skills: { used: number; limit: number };
}

export type SettingsTab = 'profile' | 'billing' | 'usage' | 'preferences';

// ── Constants ───────────────────────────────────────

export const SETTINGS_TABS: { value: SettingsTab; label: string }[] = [
  { value: 'profile', label: 'Profile' },
  { value: 'billing', label: 'Plan & Billing' },
  { value: 'usage', label: 'Usage' },
  { value: 'preferences', label: 'Preferences' },
];

export const AVAILABLE_MODELS = [
  { value: 'claude-sonnet-4', label: 'Claude Sonnet 4' },
  { value: 'claude-opus-4', label: 'Claude Opus 4' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4.1', label: 'GPT-4.1' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
] as const;

export const PLAN_DETAILS: Record<string, { name: string; price: string; features: string[] }> = {
  free: {
    name: 'Free',
    price: '$0/mo',
    features: ['5,000 API calls/mo', '512 MB storage', '25 skills', 'Community support'],
  },
  pro: {
    name: 'Pro',
    price: '$29/mo',
    features: ['50,000 API calls/mo', '5 GB storage', 'Unlimited skills', 'Priority support', 'Custom models'],
  },
  enterprise: {
    name: 'Enterprise',
    price: 'Custom',
    features: ['Unlimited API calls', 'Unlimited storage', 'Unlimited skills', 'Dedicated support', 'SLA', 'SSO'],
  },
};
