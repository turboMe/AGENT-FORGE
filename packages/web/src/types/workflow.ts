// ── Workflow Types (Frontend) ───────────────────────

export type WorkflowStatus = 'active' | 'paused' | 'completed' | 'failed' | 'draft';

export interface WorkflowParameter {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  label: string;
  description?: string;
  options?: string[]; // for 'select' type
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  skillId: string | null;
  skillName: string | null;
  schedule: string | null; // cron expression
  parameters: WorkflowParameter[];
  stats: {
    runCount: number;
    successRate: number;
    avgDurationMs: number;
    lastRunAt: string | null;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type WorkflowRunStatus = 'success' | 'failed' | 'running' | 'cancelled';

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: WorkflowRunStatus;
  startedAt: string;
  completedAt: string | null;
  durationMs: number;
  output: string | null;
  error: string | null;
  triggeredBy: 'schedule' | 'manual';
}

// ── Status display config ───────────────────────────

export const STATUS_CONFIG: Record<WorkflowStatus, { label: string; color: string; bg: string }> = {
  active:    { label: 'Active',    color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  paused:    { label: 'Paused',    color: 'text-amber-400',   bg: 'bg-amber-400/10' },
  completed: { label: 'Completed', color: 'text-blue-400',    bg: 'bg-blue-400/10' },
  failed:    { label: 'Failed',    color: 'text-red-400',     bg: 'bg-red-400/10' },
  draft:     { label: 'Draft',     color: 'text-gray-400',    bg: 'bg-gray-400/10' },
};

export const RUN_STATUS_CONFIG: Record<WorkflowRunStatus, { label: string; color: string }> = {
  success:   { label: 'Success',   color: 'text-emerald-400' },
  failed:    { label: 'Failed',    color: 'text-red-400' },
  running:   { label: 'Running',   color: 'text-blue-400' },
  cancelled: { label: 'Cancelled', color: 'text-gray-400' },
};
