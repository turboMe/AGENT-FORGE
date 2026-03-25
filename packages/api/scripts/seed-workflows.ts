/**
 * Seed script — inserts sample workflows + runs into MongoDB.
 *
 * Usage:
 *   npx tsx packages/api/scripts/seed-workflows.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(import.meta.dirname, '../../../.env') });

const MONGODB_URI = process.env['MONGODB_URI'] ?? 'mongodb://localhost:27017/agentforge';
const TENANT_ID = 'default-tenant';
const USER_ID = 'seed-user';

async function main() {
  console.log('Connecting to MongoDB…');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  const db = mongoose.connection.db!;

  // ── Workflows ───────────────────────────────────────
  const workflows = [
    {
      tenantId: TENANT_ID,
      name: 'Daily Outreach Generator',
      description: 'Generates personalized cold outreach emails for new leads every 4 hours.',
      status: 'active',
      skillId: null,
      skillName: 'Cold Outreach Writer',
      schedule: '0 */4 * * *',
      parameters: [
        { key: 'max_leads', value: '50', type: 'number', label: 'Max Leads per Run', description: 'Maximum number of leads to process.' },
        { key: 'tone', value: 'professional', type: 'select', label: 'Email Tone', options: ['professional', 'casual', 'friendly', 'urgent'] },
        { key: 'include_followup', value: 'true', type: 'boolean', label: 'Include Follow-up' },
      ],
      stats: { runCount: 142, successRate: 96, avgDurationMs: 11200, lastRunAt: new Date('2026-03-22T10:00:00Z') },
      createdBy: USER_ID,
      deletedAt: null,
      createdAt: new Date('2026-02-15T10:00:00Z'),
      updatedAt: new Date('2026-03-22T10:00:00Z'),
    },
    {
      tenantId: TENANT_ID,
      name: 'Menu Cost Watchdog',
      description: 'Daily analysis of restaurant menu food costs. Alerts when any item exceeds 35% ratio.',
      status: 'active',
      skillId: null,
      skillName: 'Food Cost Analyst',
      schedule: '0 9 * * *',
      parameters: [
        { key: 'threshold', value: '35', type: 'number', label: 'Cost Threshold (%)' },
        { key: 'report_format', value: 'detailed', type: 'select', label: 'Report Format', options: ['summary', 'detailed', 'executive'] },
      ],
      stats: { runCount: 87, successRate: 100, avgDurationMs: 23700, lastRunAt: new Date('2026-03-22T09:00:00Z') },
      createdBy: USER_ID,
      deletedAt: null,
      createdAt: new Date('2026-02-20T09:00:00Z'),
      updatedAt: new Date('2026-03-22T09:00:00Z'),
    },
    {
      tenantId: TENANT_ID,
      name: 'PR Code Reviewer',
      description: 'Automatically reviews pull requests on push events.',
      status: 'paused',
      skillId: null,
      skillName: 'Code Review Assistant',
      schedule: null,
      parameters: [
        { key: 'severity_filter', value: 'medium', type: 'select', label: 'Min Severity', options: ['low', 'medium', 'high', 'critical'] },
        { key: 'auto_approve', value: 'false', type: 'boolean', label: 'Auto-approve Clean PRs' },
      ],
      stats: { runCount: 198, successRate: 99, avgDurationMs: 45200, lastRunAt: new Date('2026-03-22T12:30:00Z') },
      createdBy: USER_ID,
      deletedAt: null,
      createdAt: new Date('2026-02-10T14:00:00Z'),
      updatedAt: new Date('2026-03-20T10:00:00Z'),
    },
    {
      tenantId: TENANT_ID,
      name: 'Nightly Security Scan',
      description: 'Scans the codebase for security vulnerabilities every night at 2 AM.',
      status: 'failed',
      skillId: null,
      skillName: 'Security Scanner',
      schedule: '0 2 * * *',
      parameters: [
        { key: 'scan_depth', value: 'full', type: 'select', label: 'Scan Depth', options: ['quick', 'standard', 'full'] },
      ],
      stats: { runCount: 45, successRate: 78, avgDurationMs: 120300, lastRunAt: new Date('2026-03-22T08:00:00Z') },
      createdBy: USER_ID,
      deletedAt: null,
      createdAt: new Date('2026-02-25T08:00:00Z'),
      updatedAt: new Date('2026-03-22T08:00:00Z'),
    },
    {
      tenantId: TENANT_ID,
      name: 'Data Pipeline Blueprint',
      description: 'Generates ETL pipeline designs from natural language specs.',
      status: 'completed',
      skillId: null,
      skillName: 'Data Pipeline Designer',
      schedule: null,
      parameters: [
        { key: 'output_format', value: 'markdown', type: 'select', label: 'Output Format', options: ['markdown', 'yaml', 'json'] },
      ],
      stats: { runCount: 12, successRate: 92, avgDurationMs: 88400, lastRunAt: new Date('2026-03-22T11:00:00Z') },
      createdBy: USER_ID,
      deletedAt: null,
      createdAt: new Date('2026-03-05T09:00:00Z'),
      updatedAt: new Date('2026-03-22T11:00:00Z'),
    },
    {
      tenantId: TENANT_ID,
      name: 'SEO Content Optimizer (Draft)',
      description: 'Batch-optimize blog posts and landing pages for search ranking.',
      status: 'draft',
      skillId: null,
      skillName: 'SEO Content Optimizer',
      schedule: null,
      parameters: [
        { key: 'target_keywords', value: '', type: 'string', label: 'Target Keywords' },
        { key: 'max_pages', value: '10', type: 'number', label: 'Max Pages per Run' },
      ],
      stats: { runCount: 0, successRate: 0, avgDurationMs: 0, lastRunAt: null },
      createdBy: USER_ID,
      deletedAt: null,
      createdAt: new Date('2026-03-20T16:00:00Z'),
      updatedAt: new Date('2026-03-20T16:00:00Z'),
    },
  ];

  console.log('Dropping old workflows + workflowruns…');
  await db.collection('workflows').deleteMany({ tenantId: TENANT_ID });
  await db.collection('workflowruns').deleteMany({ tenantId: TENANT_ID });

  const inserted = await db.collection('workflows').insertMany(workflows);
  const wfIds = Object.values(inserted.insertedIds).map(String);
  console.log(`Inserted ${wfIds.length} workflows.`);

  // ── Workflow Runs ───────────────────────────────────
  const runs = [
    { workflowId: wfIds[0], tenantId: TENANT_ID, status: 'success', startedAt: new Date('2026-03-22T10:00:00Z'), completedAt: new Date('2026-03-22T10:00:12Z'), durationMs: 12340, output: 'Processed 45 outreach leads. Generated 45 emails.', error: null, triggeredBy: 'schedule' },
    { workflowId: wfIds[0], tenantId: TENANT_ID, status: 'success', startedAt: new Date('2026-03-22T06:00:00Z'), completedAt: new Date('2026-03-22T06:00:08Z'), durationMs: 8200, output: 'Processed 32 leads.', error: null, triggeredBy: 'schedule' },
    { workflowId: wfIds[0], tenantId: TENANT_ID, status: 'failed', startedAt: new Date('2026-03-21T22:00:00Z'), completedAt: new Date('2026-03-21T22:00:03Z'), durationMs: 3100, output: null, error: 'Error: Rate limit exceeded for Anthropic API.', triggeredBy: 'schedule' },
    { workflowId: wfIds[1], tenantId: TENANT_ID, status: 'success', startedAt: new Date('2026-03-22T09:00:00Z'), completedAt: new Date('2026-03-22T09:00:25Z'), durationMs: 25300, output: 'Menu analysis complete. 3 high-cost items identified.', error: null, triggeredBy: 'schedule' },
    { workflowId: wfIds[1], tenantId: TENANT_ID, status: 'success', startedAt: new Date('2026-03-21T09:00:00Z'), completedAt: new Date('2026-03-21T09:00:22Z'), durationMs: 22100, output: 'Menu analysis complete. 2 high-cost items identified.', error: null, triggeredBy: 'schedule' },
    { workflowId: wfIds[2], tenantId: TENANT_ID, status: 'success', startedAt: new Date('2026-03-22T12:30:00Z'), completedAt: new Date('2026-03-22T12:30:45Z'), durationMs: 45200, output: 'Code review complete. 3 issues found (1 critical).', error: null, triggeredBy: 'manual' },
    { workflowId: wfIds[3], tenantId: TENANT_ID, status: 'failed', startedAt: new Date('2026-03-22T08:00:00Z'), completedAt: new Date('2026-03-22T08:00:02Z'), durationMs: 2100, output: null, error: 'Error: Connection timeout to vulnerability database.', triggeredBy: 'schedule' },
    { workflowId: wfIds[4], tenantId: TENANT_ID, status: 'success', startedAt: new Date('2026-03-22T11:00:00Z'), completedAt: new Date('2026-03-22T11:01:30Z'), durationMs: 90200, output: 'Pipeline design complete. Source: PostgreSQL.', error: null, triggeredBy: 'manual' },
  ];

  await db.collection('workflowruns').insertMany(runs);
  console.log(`Inserted ${runs.length} workflow runs.`);

  await mongoose.disconnect();
  console.log('Done ✅');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
