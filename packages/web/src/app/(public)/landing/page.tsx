"use client";

import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Zap,
  Brain,
  Shield,
  GitBranch,
  BarChart3,
  Store,
  Check,
  ChevronRight,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Self-Evolving Skills",
    description: "Agents learn and create new skills automatically from every task execution.",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: Zap,
    title: "Intelligent Routing",
    description: "Classify tasks and route to the optimal skill or LLM — zero manual config.",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: GitBranch,
    title: "Pipeline Workflows",
    description: "Chain multi-step pipelines with classify → search → route → execute → save.",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: Shield,
    title: "Enterprise Auth",
    description: "Firebase authentication with role-based access and secure API tokens.",
    color: "from-blue-500 to-cyan-600",
  },
  {
    icon: BarChart3,
    title: "Decision Analytics",
    description: "Full visibility into every routing decision, cost, and performance metric.",
    color: "from-rose-500 to-pink-600",
  },
  {
    icon: Store,
    title: "Skill Marketplace",
    description: "Browse and install community-built skills. Share your agents with the world.",
    color: "from-indigo-500 to-violet-600",
  },
];

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for exploring and prototyping",
    cta: "Get Started",
    features: [
      "10 tasks / minute",
      "3 custom skills",
      "Basic analytics",
      "Community support",
      "Single user",
    ],
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/ month",
    description: "For individual power users and freelancers",
    cta: "Start Free Trial",
    features: [
      "30 tasks / minute",
      "Unlimited skills",
      "Advanced analytics",
      "Priority support",
      "Marketplace access",
      "Workflow automations",
    ],
    highlighted: true,
  },
  {
    name: "Team",
    price: "$99",
    period: "/ month",
    description: "For teams and agencies scaling with AI",
    cta: "Contact Sales",
    features: [
      "120 tasks / minute",
      "Unlimited everything",
      "Custom LLM routing",
      "Dedicated support",
      "SSO & RBAC",
      "API access",
      "SLA guarantee",
    ],
    highlighted: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── Navbar ─────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/landing" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">AgentForge</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:from-violet-500 hover:to-indigo-500 transition-all"
            >
              Get Started
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────── */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28">
        {/* Ambient background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[800px] w-[1200px] rounded-full bg-violet-600/6 blur-3xl landing-glow" />
          <div className="absolute right-0 top-1/4 h-[400px] w-[400px] rounded-full bg-indigo-600/5 blur-3xl" />
          <div className="absolute left-0 top-1/3 h-[300px] w-[300px] rounded-full bg-purple-600/4 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-300">
            <Zap className="h-3 w-3" />
            Self-Evolving Agent Ecosystem
          </div>

          {/* Headline */}
          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
            Build AI agents that{" "}
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              learn and evolve
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            AgentForge automatically creates, routes, and optimizes skills from every task.
            Your agents get smarter with each interaction — zero manual configuration.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 text-sm font-semibold text-white shadow-xl shadow-violet-500/25 hover:from-violet-500 hover:to-indigo-500 transition-all hover:shadow-violet-500/30 hover:scale-[1.02]"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#demo"
              className="flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border/60 bg-secondary/30 px-8 text-sm font-medium text-foreground/80 hover:bg-secondary/50 hover:text-foreground transition-all"
            >
              Watch Demo
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Demo Section ──────────────────────────── */}
      <section id="demo" className="relative pb-20 sm:pb-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-b from-secondary/20 to-secondary/5 p-1 shadow-2xl shadow-black/20">
            {/* Mockup header bar */}
            <div className="flex items-center gap-2 rounded-t-xl bg-secondary/50 px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/60" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                <div className="h-3 w-3 rounded-full bg-green-500/60" />
              </div>
              <div className="flex-1 text-center">
                <span className="text-xs text-muted-foreground/60">app.agentforge.dev</span>
              </div>
            </div>
            {/* Demo placeholder — animated gradient */}
            <div className="relative aspect-video w-full overflow-hidden rounded-b-xl bg-gradient-to-br from-violet-950/50 via-background to-indigo-950/50">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-xl shadow-violet-500/30 landing-float">
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Interactive demo coming soon
                  </p>
                </div>
              </div>
              {/* Animated grid lines */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────── */}
      <section className="relative py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to build{" "}
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                intelligent agents
              </span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From task classification to skill evolution — all in one platform.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group relative rounded-2xl border border-border/40 bg-card/30 p-6 backdrop-blur-sm hover:border-border/60 hover:bg-card/50 transition-all duration-300"
              >
                <div
                  className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} shadow-lg`}
                >
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="mb-2 text-base font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────── */}
      <section className="relative py-20 sm:py-28 border-t border-border/20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start free. Scale when you&apos;re ready.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 items-start">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-8 transition-all duration-300 ${
                  plan.highlighted
                    ? "border-violet-500/40 bg-gradient-to-b from-violet-500/10 to-transparent shadow-xl shadow-violet-500/10 scale-[1.02] lg:scale-105"
                    : "border-border/40 bg-card/30 hover:border-border/60"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-1 text-xs font-semibold text-white shadow-lg">
                    Most Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <ul className="mb-8 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <Check
                        className={`h-4 w-4 shrink-0 ${
                          plan.highlighted ? "text-violet-400" : "text-emerald-400"
                        }`}
                      />
                      <span className="text-foreground/80">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/register"
                  className={`flex h-11 w-full items-center justify-center rounded-lg text-sm font-semibold transition-all ${
                    plan.highlighted
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-indigo-500"
                      : "border border-border/60 bg-secondary/30 text-foreground/80 hover:bg-secondary/50 hover:text-foreground"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────── */}
      <section className="relative py-20 sm:py-28 border-t border-border/20">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2 h-[400px] w-[800px] rounded-full bg-violet-600/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to build smarter agents?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join developers who are building the future of AI-powered workflows.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 text-sm font-semibold text-white shadow-xl shadow-violet-500/25 hover:from-violet-500 hover:to-indigo-500 transition-all hover:scale-[1.02]"
            >
              Start for Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────── */}
      <footer className="border-t border-border/20 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-indigo-600">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-semibold">AgentForge</span>
          </div>
          <p className="text-xs text-muted-foreground/60">
            © 2026 AgentForge. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
