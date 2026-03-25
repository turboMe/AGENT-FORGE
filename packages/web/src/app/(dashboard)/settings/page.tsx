"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Settings as SettingsIcon,
  User,
  CreditCard,
  BarChart3,
  SlidersHorizontal,
  Save,
  Sparkles,
  Crown,
  Zap,
  HardDrive,
  Layers,
  Bell,
  Mail,
  FileText,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  UserProfile,
  UsageStats,
  UserPreferences,
  SettingsTab,
} from "@/types/settings";
import {
  SETTINGS_TABS,
  AVAILABLE_MODELS,
  PLAN_DETAILS,
} from "@/types/settings";
import { fetchProfile, updateProfile, fetchUsage } from "@/lib/api";

// ── Progress bar ────────────────────────────────────

function UsageBar({
  label,
  used,
  limit,
  unit,
  icon: Icon,
}: {
  label: string;
  used: number;
  limit: number;
  unit: string;
  icon: React.ElementType;
}) {
  const pct = Math.min(100, (used / limit) * 100);
  const isHigh = pct > 80;

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {used.toLocaleString()} / {limit.toLocaleString()} {unit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 usage-bar-gradient",
            isHigh ? "bg-gradient-to-r from-amber-500 to-red-500" : "bg-gradient-to-r from-violet-500 to-indigo-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-right text-[11px] text-muted-foreground/70">
        {(limit - used).toLocaleString()} {unit} remaining
      </p>
    </div>
  );
}

// ── Toggle switch ───────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
  icon: Icon,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card px-4 py-3.5">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div>
          <span className="text-sm font-medium text-foreground">{label}</span>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:ring-offset-2 focus:ring-offset-background",
          checked ? "bg-violet-600" : "bg-secondary"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

// ── Loading skeleton ────────────────────────────────

function SettingsSkeleton() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
        <p className="text-sm text-muted-foreground">Loading settings…</p>
      </div>
    </div>
  );
}

// ── Page Component ──────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [comingSoonToast, setComingSoonToast] = useState(false);

  // ── Fetch data on mount ─────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [profileData, usageData] = await Promise.all([
          fetchProfile(),
          fetchUsage(),
        ]);
        if (cancelled) return;
        setProfile(profileData);
        setPreferences(profileData.preferences);
        setUsage(usageData);
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Handlers ────────────────────────────────────

  const handleSaveProfile = useCallback(async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await updateProfile({
        displayName: profile.displayName,
        email: profile.email,
        preferences,
      } as Partial<UserProfile>);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2000);
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setSaving(false);
    }
  }, [profile, preferences]);

  const handleUpgrade = useCallback(() => {
    setComingSoonToast(true);
    setTimeout(() => setComingSoonToast(false), 3000);
  }, []);

  const updatePref = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      setPreferences((prev) => prev ? { ...prev, [key]: value } : prev);
    },
    []
  );

  const updateNotif = useCallback(
    (key: keyof UserPreferences["notifications"], value: boolean) => {
      setPreferences((prev) =>
        prev
          ? {
              ...prev,
              notifications: { ...prev.notifications, [key]: value },
            }
          : prev
      );
    },
    []
  );

  // ── Loading state ───────────────────────────────
  if (loading || !profile || !preferences || !usage) {
    return (
      <div className="flex flex-1 flex-col min-h-0">
        <div className="border-b border-border/50 bg-background/80 backdrop-blur-xl px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-500 to-zinc-600 shadow-lg shadow-slate-500/20">
              <SettingsIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Settings</h1>
              <p className="text-xs text-muted-foreground">
                Manage your profile, plan, and preferences
              </p>
            </div>
          </div>
        </div>
        <SettingsSkeleton />
      </div>
    );
  }

  // ── Render sections ─────────────────────────────

  const renderProfile = () => (
    <div className="space-y-4 animate-in">
      {/* Avatar placeholder */}
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-2xl font-bold text-white shadow-lg shadow-violet-500/20">
          {profile.displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{profile.displayName}</p>
          <p className="text-xs text-muted-foreground">{profile.email}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground/60">
            Member since {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Edit fields */}
      <div className="space-y-3">
        <div>
          <label htmlFor="settings-name" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Display Name
          </label>
          <input
            id="settings-name"
            type="text"
            value={profile.displayName}
            onChange={(e) => setProfile((p) => p ? { ...p, displayName: e.target.value } : p)}
            className="w-full rounded-xl border border-border/50 bg-secondary/50 px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
          />
        </div>
        <div>
          <label htmlFor="settings-email" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Email
          </label>
          <input
            id="settings-email"
            type="email"
            value={profile.email}
            onChange={(e) => setProfile((p) => p ? { ...p, email: e.target.value } : p)}
            className="w-full rounded-xl border border-border/50 bg-secondary/50 px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
          />
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSaveProfile}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );

  const renderBilling = () => {
    const plan = PLAN_DETAILS[profile.plan];
    return (
      <div className="space-y-4 animate-in">
        {/* Current plan card */}
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-indigo-500/5" />
          <div className="relative">
            <div className="mb-3 flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-400" />
              <span className="text-lg font-bold text-foreground">{plan?.name} Plan</span>
              <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-400">
                Current
              </span>
            </div>
            <p className="mb-4 text-2xl font-bold text-foreground">{plan?.price}</p>
            <ul className="space-y-1.5">
              {plan?.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Upgrade button */}
        <button
          type="button"
          onClick={handleUpgrade}
          className="group flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 px-5 py-3 text-sm font-semibold text-amber-300 transition-all hover:from-amber-500/20 hover:to-orange-500/20 hover:border-amber-500/50"
        >
          <Sparkles className="h-4 w-4 transition-transform group-hover:scale-110" />
          Upgrade to Pro
        </button>

        {/* Coming soon toast */}
        {comingSoonToast && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-4 py-2.5 animate-in slide-in-from-bottom-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <p className="text-sm text-amber-300">
              Stripe billing integration coming soon! 🚀
            </p>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground/60">
          Billing powered by Stripe · Manage subscription and invoices
        </p>
      </div>
    );
  };

  const renderUsage = () => (
    <div className="space-y-3 animate-in">
      <UsageBar
        label="API Calls (Decisions)"
        used={usage.apiCalls.used}
        limit={usage.apiCalls.limit}
        unit="calls"
        icon={Zap}
      />
      <UsageBar
        label="Storage"
        used={usage.storage.used}
        limit={usage.storage.limit}
        unit="MB"
        icon={HardDrive}
      />
      <UsageBar
        label="Skills"
        used={usage.skills.used}
        limit={usage.skills.limit}
        unit="skills"
        icon={Layers}
      />
      <p className="pt-2 text-center text-xs text-muted-foreground/60">
        Usage resets on the 1st of each month
      </p>
    </div>
  );

  const renderPreferences = () => (
    <div className="space-y-3 animate-in">
      {/* Default model */}
      <div className="rounded-xl border border-border/50 bg-card px-4 py-3.5">
        <label htmlFor="pref-model" className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Default Model
        </label>
        <select
          id="pref-model"
          value={preferences.defaultModel}
          onChange={(e) => updatePref("defaultModel", e.target.value)}
          className="w-full appearance-none rounded-lg border border-border/50 bg-secondary/50 px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
        >
          {AVAILABLE_MODELS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Notification toggles */}
      <ToggleSwitch
        checked={preferences.notifications.email}
        onChange={(v) => updateNotif("email", v)}
        label="Email Notifications"
        description="Receive task completions and alerts via email"
        icon={Mail}
      />
      <ToggleSwitch
        checked={preferences.notifications.push}
        onChange={(v) => updateNotif("push", v)}
        label="Push Notifications"
        description="Browser push notifications for real-time updates"
        icon={Bell}
      />
      <ToggleSwitch
        checked={preferences.notifications.weeklyReport}
        onChange={(v) => updateNotif("weeklyReport", v)}
        label="Weekly Report"
        description="Summary of your agent activity every Monday"
        icon={FileText}
      />

      {/* Save preferences */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSaveProfile}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {saving ? "Saving…" : "Save Preferences"}
        </button>
      </div>
    </div>
  );

  const renderTab = () => {
    switch (activeTab) {
      case "profile":
        return renderProfile();
      case "billing":
        return renderBilling();
      case "usage":
        return renderUsage();
      case "preferences":
        return renderPreferences();
    }
  };

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-xl px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-500 to-zinc-600 shadow-lg shadow-slate-500/20">
            <SettingsIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Settings</h1>
            <p className="text-xs text-muted-foreground">
              Manage your profile, plan, and preferences
            </p>
          </div>
        </div>
      </div>

      {/* Tabs + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Tab sidebar */}
        <div className="w-48 shrink-0 border-r border-border/50 bg-background/50 p-3">
          <nav className="space-y-1">
            {SETTINGS_TABS.map((tab) => {
              const Icon = TAB_ICONS[tab.value];
              const isActive = activeTab === tab.value;

              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-lg">
            {renderTab()}
          </div>
        </div>
      </div>

      {/* Saved toast */}
      {savedToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-emerald-500/90 px-4 py-2.5 text-sm font-medium text-white shadow-lg animate-in slide-in-from-bottom-2">
          <Check className="h-4 w-4" />
          Changes saved
        </div>
      )}
    </div>
  );
}

// ── Tab icons (must be after imports) ───────────────

const TAB_ICONS: Record<SettingsTab, React.ElementType> = {
  profile: User,
  billing: CreditCard,
  usage: BarChart3,
  preferences: SlidersHorizontal,
};
