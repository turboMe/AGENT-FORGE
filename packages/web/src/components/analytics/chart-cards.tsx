"use client";

import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Target, Trophy, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  SkillsCreatedDataPoint,
  HitRateDataPoint,
  TopSkillDataPoint,
  CostDataPoint,
} from "@/types/analytics";

// ── Shared tooltip style ────────────────────────────

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "hsl(240 10% 6%)",
    border: "1px solid hsl(240 3.7% 15.9%)",
    borderRadius: "0.75rem",
    fontSize: "0.75rem",
    color: "hsl(0 0% 90%)",
    padding: "8px 12px",
  },
  itemStyle: { color: "hsl(0 0% 90%)" },
  labelStyle: { color: "hsl(240 5% 64.9%)", marginBottom: 4 },
};

// ── Chart wrapper ───────────────────────────────────

function ChartCard({
  title,
  icon: Icon,
  iconColor,
  children,
}: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/50 bg-card p-5",
        "transition-all duration-300 hover:border-border/80 hover:shadow-lg hover:shadow-violet-500/5",
        "chart-fade-in"
      )}
    >
      <div className="mb-4 flex items-center gap-2">
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg",
            iconColor
          )}
        >
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="h-[220px]">{children}</div>
    </div>
  );
}

// ── 1. Skills Created Over Time ─────────────────────

export function SkillsCreatedChart({
  data,
}: {
  data: SkillsCreatedDataPoint[];
}) {
  return (
    <ChartCard
      title="Skills Created Over Time"
      icon={TrendingUp}
      iconColor="bg-violet-500"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="skillsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(263 70% 60%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(263 70% 60%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(240 3.7% 15.9%)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "hsl(240 5% 64.9%)" }}
            tickFormatter={(v: string) => v.slice(5)}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(240 5% 64.9%)" }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip {...tooltipStyle} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="hsl(263 70% 60%)"
            strokeWidth={2}
            fill="url(#skillsGradient)"
            name="Skills"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── 2. Retrieval Hit Rate ───────────────────────────

export function HitRateChart({ data }: { data: HitRateDataPoint[] }) {
  return (
    <ChartCard
      title="Retrieval Hit Rate"
      icon={Target}
      iconColor="bg-emerald-500"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(240 3.7% 15.9%)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "hsl(240 5% 64.9%)" }}
            tickFormatter={(v: string) => v.slice(5)}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(240 5% 64.9%)" }}
            axisLine={false}
            tickLine={false}
            width={30}
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            {...tooltipStyle}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={((value: any) => [`${value}%`, "Hit Rate"]) as any}
          />
          <Line
            type="monotone"
            dataKey="hitRate"
            stroke="hsl(160 70% 50%)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "hsl(160 70% 50%)" }}
            name="Hit Rate"
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── 3. Top Skills ───────────────────────────────────

export function TopSkillsChart({ data }: { data: TopSkillDataPoint[] }) {
  return (
    <ChartCard
      title="Top Skills by Usage"
      icon={Trophy}
      iconColor="bg-amber-500"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.slice(0, 8)} layout="vertical">
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(240 3.7% 15.9%)"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: "hsl(240 5% 64.9%)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 10, fill: "hsl(240 5% 64.9%)" }}
            axisLine={false}
            tickLine={false}
            width={100}
          />
          <Tooltip {...tooltipStyle} />
          <Bar
            dataKey="useCount"
            fill="hsl(40 90% 55%)"
            radius={[0, 4, 4, 0]}
            name="Uses"
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── 4. Cost Over Time ───────────────────────────────

export function CostChart({ data }: { data: CostDataPoint[] }) {
  return (
    <ChartCard
      title="Cost Over Time"
      icon={DollarSign}
      iconColor="bg-blue-500"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(240 3.7% 15.9%)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "hsl(240 5% 64.9%)" }}
            tickFormatter={(v: string) => v.slice(5)}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(240 5% 64.9%)" }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={(v: number) => `$${v}`}
          />
          <Tooltip
            {...tooltipStyle}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={((value: any) => [`$${Number(value).toFixed(2)}`, "Cost"]) as any}
          />
          <Area
            type="monotone"
            dataKey="cost"
            stroke="hsl(217 91% 60%)"
            strokeWidth={2}
            fill="url(#costGradient)"
            name="Cost"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
