import {
  MessageSquare,
  Sparkles,
  Workflow,
  BarChart3,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      {/* Hero */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome to AgentForge
        </h1>
        <p className="max-w-md text-muted-foreground">
          Self-evolving agent ecosystem. Type a task in natural language
          and watch the pipeline work.
        </p>
      </div>

      {/* Quick-start cards */}
      <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-3">
        <QuickCard
          icon={<MessageSquare className="h-5 w-5" />}
          title="Chat"
          description="Start a conversation with an agent"
        />
        <QuickCard
          icon={<Workflow className="h-5 w-5" />}
          title="Workflows"
          description="Automate recurring tasks"
        />
        <QuickCard
          icon={<BarChart3 className="h-5 w-5" />}
          title="Analytics"
          description="Review decisions & skill usage"
        />
      </div>
    </div>
  );
}

function QuickCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative flex flex-col gap-2 rounded-xl border border-border/50 bg-card p-5 transition-all hover:border-border hover:shadow-md hover:shadow-violet-500/5">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition-colors group-hover:bg-violet-500/10 group-hover:text-violet-400">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
