#!/usr/bin/env tsx
/**
 * ═══════════════════════════════════════════════════════════
 * AgentForge — Lightweight Seed Skills (No Voyage AI)
 *
 * Reads SKILL.md files from .agents/skills/, builds
 * searchVector for keyword matching, and upserts into MongoDB.
 * Does NOT require Voyage AI — skills are searchable via
 * MongoDB $text index (keyword search).
 *
 * Usage:
 *   pnpm seed:skills:lite
 *   # or directly:
 *   npx tsx scripts/seed-skills-lite.ts
 * ═══════════════════════════════════════════════════════════
 */

import { config } from 'dotenv';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import mongoose from 'mongoose';

// ── Load .env ───────────────────────────────────────────

config({ path: resolve(import.meta.dirname ?? '.', '..', '.env') });

const MONGODB_URI = process.env['MONGODB_URI'];

if (!MONGODB_URI) {
  console.error('✗ MONGODB_URI is not set in .env');
  process.exit(1);
}

// ── Constants ───────────────────────────────────────────

const SKILLS_DIR = resolve(import.meta.dirname ?? '.', '..', '.agents', 'skills');
const TENANT_ID = 'system';
const CREATED_BY = 'seed-lite';

// ── Colors ──────────────────────────────────────────────

const c = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};

// ── Types ───────────────────────────────────────────────

interface ParsedSkill {
  name: string;
  slug: string;
  description: string;
  domain: string[];
  pattern: string;
  tags: string[];
  template: {
    persona: string;
    process: string[];
    outputFormat: string;
    constraints: string[];
    systemPrompt: string;
  };
}

// ── SKILL.md Parser ─────────────────────────────────────

function parseFrontmatter(content: string): { frontmatter: Record<string, string>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const [, yamlRaw, body] = match;
  const frontmatter: Record<string, string> = {};

  if (!yamlRaw || !body) {
    return { frontmatter, body: content };
  }

  let currentKey = '';
  let currentValue = '';

  for (const line of yamlRaw.split('\n')) {
    const keyMatch = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
    if (keyMatch) {
      if (currentKey) {
        frontmatter[currentKey] = currentValue.trim();
      }
      currentKey = keyMatch[1] ?? '';
      const val = keyMatch[2] ?? '';
      currentValue = val === '>' ? '' : val;
    } else if (currentKey && line.startsWith('  ')) {
      currentValue += ' ' + line.trim();
    }
  }

  if (currentKey) {
    frontmatter[currentKey] = currentValue.trim();
  }

  return { frontmatter, body: body.trim() };
}

function extractSections(body: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = body.split('\n');
  let currentSection = '_intro';
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      if (currentContent.length > 0) {
        sections[currentSection.toLowerCase()] = currentContent.join('\n').trim();
      }
      currentSection = headingMatch[1] ?? '_intro';
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentContent.length > 0) {
    sections[currentSection.toLowerCase()] = currentContent.join('\n').trim();
  }

  return sections;
}

function extractBulletItems(text: string): string[] {
  return text
    .split('\n')
    .filter((line) => /^\s*[-*❌✓✗]\s+/.test(line) || /^\s*-\s+/.test(line))
    .map((line) => line.replace(/^\s*[-*❌✓✗]\s+/, '').trim())
    .filter(Boolean);
}

function extractNumberedItems(text: string): string[] {
  return text
    .split('\n')
    .filter((line) => /^\s*\d+\.\s+/.test(line))
    .map((line) => line.replace(/^\s*\d+\.\s+/, '').trim())
    .filter(Boolean);
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function extractDomain(description: string, tags: string[]): string[] {
  const domainKeywords = [
    'sales', 'email', 'outreach', 'food', 'restaurant', 'horeca',
    'foodtech', 'saas', 'prompt', 'ai', 'agent', 'routing',
    'cost', 'analysis', 'menu', 'writing', 'marketing',
    'engineering', 'devops', 'security', 'design', 'data', 'support',
  ];

  const allText = `${description} ${tags.join(' ')}`.toLowerCase();
  return domainKeywords.filter((kw) => allText.includes(kw));
}

function extractPattern(sections: Record<string, string>): string {
  for (const [key, value] of Object.entries(sections)) {
    if (key.includes('pattern')) {
      const match = value.match(/pattern:\s*(\w+)/i);
      if (match?.[1]) return match[1].toLowerCase();
    }
    const inlineMatch = value.match(/Pattern:\s*(\w+)/);
    if (inlineMatch?.[1]) return inlineMatch[1].toLowerCase();
  }
  return 'processor';
}

function extractTags(description: string, name: string): string[] {
  const triggerMatch = description.match(/Trigger[s]?\s*(?:on)?[:.]\s*(.+?)(?:\.|$)/i);
  if (triggerMatch?.[1]) {
    return triggerMatch[1]
      .split(',')
      .map((t) => t.trim().replace(/['"]/g, '').toLowerCase())
      .filter((t) => t.length > 1 && t.length < 40);
  }

  return name.split('-').filter((p) => p.length > 2);
}

function parseSkillMd(content: string, filePath: string): ParsedSkill {
  const { frontmatter, body } = parseFrontmatter(content);
  const sections = extractSections(body);

  const name = frontmatter['name'] ?? filePath.split('/').at(-2) ?? 'unknown';
  const description = frontmatter['description'] ?? '';
  const slug = toSlug(name);
  const tags = extractTags(description, name);
  const domain = extractDomain(description, tags);
  const pattern = extractPattern(sections);

  // Extract persona
  let persona = '';
  if (sections['persona']) {
    persona = sections['persona'];
  } else if (sections['_intro']) {
    persona = sections['_intro'].split('\n').filter(Boolean).slice(0, 3).join(' ');
  }
  for (const [key, value] of Object.entries(sections)) {
    if (key.includes(name) || key.includes('—') || key.includes('-')) {
      if (!persona && value) {
        persona = value.split('\n').filter(Boolean).slice(0, 3).join(' ');
      }
    }
  }

  // Extract process steps
  let process: string[] = [];
  if (sections['process']) {
    process = extractNumberedItems(sections['process']);
    if (process.length === 0) {
      process = sections['process']
        .split('\n')
        .filter((line) => /^#{2,4}\s+/.test(line))
        .map((line) => line.replace(/^#{2,4}\s+/, '').trim());
    }
  }
  if (process.length === 0) {
    for (const [key, value] of Object.entries(sections)) {
      if (key.includes('quick start') || key.includes('workflow')) {
        process = extractNumberedItems(value);
        if (process.length > 0) break;
      }
    }
  }

  // Extract output format
  let outputFormat = '';
  if (sections['output format']) {
    outputFormat = sections['output format'];
  } else if (sections['output formats']) {
    outputFormat = sections['output formats'];
  } else {
    for (const [key, value] of Object.entries(sections)) {
      if (key.includes('output')) {
        outputFormat = value;
        break;
      }
    }
  }

  // Extract constraints
  let constraints: string[] = [];
  if (sections['constraints']) {
    constraints = extractBulletItems(sections['constraints']);
  }
  if (sections['critical rules']) {
    constraints = [...constraints, ...extractBulletItems(sections['critical rules'])];
  }
  for (const [key, value] of Object.entries(sections)) {
    if (key.includes('constraint') || key.includes('rule') || key.includes('critical')) {
      if (!constraints.length) {
        constraints = extractBulletItems(value);
      }
    }
  }

  return {
    name,
    slug,
    description,
    domain: domain.length > 0 ? domain : [slug],
    pattern,
    tags: tags.length > 0 ? tags : [slug],
    template: {
      persona: persona || `Expert ${name} assistant`,
      process: process.length > 0 ? process : ['Analyze input', 'Process task', 'Generate output'],
      outputFormat: outputFormat || 'Structured markdown response',
      constraints,
      systemPrompt: body,
    },
  };
}

// ── Build searchVector (keyword search) ─────────────────

function buildSearchVector(skill: ParsedSkill): string {
  const parts = [
    skill.name,
    skill.description,
    skill.domain.join(' '),
    skill.tags.join(' '),
    skill.template.persona.slice(0, 200),
    skill.template.process.join(' '),
  ];
  return parts.filter(Boolean).join(' ');
}

// ── Mongoose Skill Schema (inline, avoids skill-library dep) ─

function getSkillModel() {
  if (mongoose.models['Skill']) {
    return mongoose.models['Skill'];
  }

  const ExampleSchema = new mongoose.Schema(
    { input: { type: String, required: true }, output: { type: String, required: true } },
    { _id: false },
  );

  const TemplateSchema = new mongoose.Schema(
    {
      persona: { type: String, required: true },
      process: { type: [String], required: true },
      outputFormat: { type: String, required: true },
      constraints: { type: [String], default: [] },
      examples: { type: [ExampleSchema], default: undefined },
      systemPrompt: { type: String, default: '' },
    },
    { _id: false },
  );

  const StatsSchema = new mongoose.Schema(
    {
      useCount: { type: Number, default: 0 },
      totalRatings: { type: Number, default: 0 },
      avgSatisfaction: { type: Number, default: null },
      lastUsedAt: { type: Date, default: undefined },
    },
    { _id: false },
  );

  const SkillSchema = new mongoose.Schema(
    {
      tenantId: { type: String, required: true, index: true },
      name: { type: String, required: true },
      slug: { type: String, required: true },
      description: { type: String, required: true },
      domain: { type: [String], default: [] },
      pattern: { type: String, required: true },
      tags: { type: [String], default: [] },
      template: { type: TemplateSchema, required: true },
      version: { type: Number, default: 1 },
      parentSkillId: { type: String, default: undefined },
      isSystem: { type: Boolean, default: false },
      isPublic: { type: Boolean, default: false },
      stats: { type: StatsSchema, default: () => ({}) },
      searchVector: { type: String, default: undefined },
      embedding: { type: [Number], default: undefined, select: false },
      createdBy: { type: String, required: true },
      deletedAt: { type: Date, default: null },
    },
    { timestamps: true },
  );

  return mongoose.model('Skill', SkillSchema, 'skills');
}

// ── Discovery ───────────────────────────────────────────

async function discoverSkillFiles(): Promise<{ path: string; dirName: string }[]> {
  const entries = await readdir(SKILLS_DIR, { withFileTypes: true });
  const results: { path: string; dirName: string }[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    // Skip route (meta-skill, not publishable)
    if (entry.name === 'route') continue;

    const skillMdPath = join(SKILLS_DIR, entry.name, 'SKILL.md');
    try {
      await readFile(skillMdPath, 'utf-8');
      results.push({ path: skillMdPath, dirName: entry.name });
    } catch {
      // No SKILL.md in this directory — skip
    }
  }

  return results;
}

// ── Main ────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`\n${c.bold(c.cyan('⚡ AgentForge — Lite Seed Skills (No Voyage AI)'))}\n`);

  // 1. Discover SKILL.md files
  console.log(`${c.bold('━━━ Discovery ━━━')}\n`);
  const skillFiles = await discoverSkillFiles();

  if (skillFiles.length === 0) {
    console.error(`${c.red('✗')} No SKILL.md files found in ${SKILLS_DIR}`);
    process.exit(1);
  }

  console.log(`  ${c.green('✓')} Found ${skillFiles.length} SKILL.md files:\n`);
  for (const sf of skillFiles) {
    console.log(`    ${c.dim('→')} ${sf.dirName}/SKILL.md`);
  }

  // 2. Parse all SKILL.md files
  console.log(`\n${c.bold('━━━ Parsing ━━━')}\n`);
  const parsedSkills: ParsedSkill[] = [];

  for (const sf of skillFiles) {
    const content = await readFile(sf.path, 'utf-8');
    const parsed = parseSkillMd(content, sf.path);
    parsedSkills.push(parsed);
    console.log(
      `  ${c.green('✓')} ${parsed.name} — ${parsed.domain.join(', ')} — ${parsed.template.process.length} steps`,
    );
  }

  // 3. Connect to MongoDB
  console.log(`\n${c.bold('━━━ Database ━━━')}\n`);
  await mongoose.connect(MONGODB_URI!, { dbName: 'agentforge' });
  console.log(`  ${c.green('✓')} Connected to MongoDB`);

  const SkillModel = getSkillModel();

  // 4. Upsert skills (keyword search only, no embeddings)
  console.log(`\n${c.bold('━━━ Seeding ━━━')}\n`);

  let seeded = 0;
  let failed = 0;

  for (const skill of parsedSkills) {
    try {
      const searchVector = buildSearchVector(skill);

      await SkillModel.findOneAndUpdate(
        { tenantId: TENANT_ID, slug: skill.slug },
        {
          $set: {
            name: skill.name,
            description: skill.description,
            domain: skill.domain,
            pattern: skill.pattern,
            tags: skill.tags,
            template: skill.template,
            isSystem: true,
            isPublic: true,
            createdBy: CREATED_BY,
            searchVector,
            deletedAt: null,
          },
          $setOnInsert: {
            tenantId: TENANT_ID,
            slug: skill.slug,
            version: 1,
            stats: {
              useCount: 0,
              totalRatings: 0,
              avgSatisfaction: null,
            },
          },
        },
        { upsert: true, new: true },
      );

      seeded++;
      console.log(`  ${c.green('✓')} ${skill.name} — searchVector: ${searchVector.length} chars`);
    } catch (error) {
      failed++;
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`  ${c.red('✗')} ${skill.name} — ${msg}`);
    }
  }

  console.log(
    `\n  ${c.bold('Result:')} ${c.green(`${seeded} seeded`)}${failed > 0 ? `, ${c.red(`${failed} failed`)}` : ''}`,
  );

  // 5. Validate
  console.log(`\n${c.bold('━━━ Validation ━━━')}\n`);
  const skills = await SkillModel.find({
    tenantId: TENANT_ID,
    isSystem: true,
    isPublic: true,
    deletedAt: null,
  });

  console.log(`  ${'Name'.padEnd(30)} ${'Domain'.padEnd(30)} SearchVector`);
  console.log(`  ${'─'.repeat(30)} ${'─'.repeat(30)} ${'─'.repeat(12)}`);

  for (const skill of skills) {
    const obj = skill.toObject();
    const svLen = obj.searchVector ? `${obj.searchVector.length} chars` : c.red('missing');
    console.log(
      `  ${obj.name.padEnd(30)} ${(obj.domain ?? []).join(', ').padEnd(30)} ${svLen}`,
    );
  }

  const countOk = skills.length >= parsedSkills.length;
  console.log(`\n  ${countOk ? c.green('✓') : c.red('✗')} ${skills.length} public system skills in DB`);

  // 6. Disconnect
  await mongoose.disconnect();
  console.log(`  ${c.dim('Disconnected from MongoDB')}`);

  console.log(`\n${c.green('✓ Lite seed complete — skills searchable via keyword matching')}\n`);
}

// ── Run ─────────────────────────────────────────────────

main().catch((err: unknown) => {
  console.error(`\n${c.red('✗ Fatal error:')}`);
  console.error(err);
  process.exit(1);
});
