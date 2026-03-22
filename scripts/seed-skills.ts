#!/usr/bin/env tsx
/**
 * ═══════════════════════════════════════════════════════════
 * AgentForge — Seed Skills Migration Script
 *
 * Reads SKILL.md files from .claude/skills/, generates
 * Voyage AI embeddings, and upserts into MongoDB Atlas.
 *
 * Usage:
 *   pnpm seed:skills
 *   # or directly:
 *   npx tsx scripts/seed-skills.ts
 * ═══════════════════════════════════════════════════════════
 */

import { config } from 'dotenv';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import mongoose from 'mongoose';
import { SkillModel } from '@agentforge/skill-library';
import { EmbeddingService } from '@agentforge/skill-library';
import { SkillIndexer } from '@agentforge/skill-library';

// ── Load .env ───────────────────────────────────────────

config({ path: resolve(import.meta.dirname ?? '.', '..', '.env') });

const MONGODB_URI = process.env['MONGODB_URI'];
const ANTHROPIC_API_KEY = process.env['ANTHROPIC_API_KEY'];

if (!MONGODB_URI) {
  console.error('✗ MONGODB_URI is not set in .env');
  process.exit(1);
}

if (!ANTHROPIC_API_KEY) {
  console.error('✗ ANTHROPIC_API_KEY is not set in .env');
  process.exit(1);
}

// ── Constants ───────────────────────────────────────────

const SKILLS_DIR = resolve(import.meta.dirname ?? '.', '..', '.claude', 'skills');
const TENANT_ID = 'system';
const CREATED_BY = 'migration';
const EMBEDDING_DIMENSIONS = 1024;

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

  // Simple YAML parser for flat key: value pairs (supports multiline >)
  let currentKey = '';
  let currentValue = '';

  for (const line of yamlRaw.split('\n')) {
    const keyMatch = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
    if (keyMatch) {
      // Save previous key
      if (currentKey) {
        frontmatter[currentKey] = currentValue.trim();
      }
      currentKey = keyMatch[1] ?? '';
      const val = keyMatch[2] ?? '';
      // If value starts with > it's a multiline folded scalar
      currentValue = val === '>' ? '' : val;
    } else if (currentKey && line.startsWith('  ')) {
      // Continuation of multiline value
      currentValue += ' ' + line.trim();
    }
  }

  // Save last key
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
      // Save previous section
      if (currentContent.length > 0) {
        sections[currentSection.toLowerCase()] = currentContent.join('\n').trim();
      }
      currentSection = headingMatch[1] ?? '_intro';
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // Save last section
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
  ];

  const allText = `${description} ${tags.join(' ')}`.toLowerCase();
  return domainKeywords.filter((kw) => allText.includes(kw));
}

function extractPattern(sections: Record<string, string>): string {
  // Look for pattern declaration in the body
  for (const [key, value] of Object.entries(sections)) {
    if (key.includes('pattern')) {
      const match = value.match(/pattern:\s*(\w+)/i);
      if (match?.[1]) return match[1].toLowerCase();
    }
    // Check for inline pattern mentions
    const inlineMatch = value.match(/Pattern:\s*(\w+)/);
    if (inlineMatch?.[1]) return inlineMatch[1].toLowerCase();
  }
  return 'processor';
}

function extractTags(description: string, name: string): string[] {
  // Extract trigger keywords from description
  const triggerMatch = description.match(/Trigger[s]?\s*(?:on)?[:.]?\s*(.+?)(?:\.|$)/i);
  if (triggerMatch?.[1]) {
    return triggerMatch[1]
      .split(',')
      .map((t) => t.trim().replace(/['"]/g, '').toLowerCase())
      .filter((t) => t.length > 1 && t.length < 40);
  }

  // Fallback: use name parts
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
    // Often the first section after the title is the persona description
    persona = sections['_intro'].split('\n').filter(Boolean).slice(0, 3).join(' ');
  }
  // Some SKILLs embed persona in the intro text after title
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
      // Try to extract sub-section headers as process steps
      process = sections['process']
        .split('\n')
        .filter((line) => /^#{2,4}\s+/.test(line))
        .map((line) => line.replace(/^#{2,4}\s+/, '').trim());
    }
  }
  // Look for numbered process in other sections
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

// ── Discovery ───────────────────────────────────────────

async function discoverSkillFiles(): Promise<{ path: string; dirName: string }[]> {
  const entries = await readdir(SKILLS_DIR, { withFileTypes: true });
  const results: { path: string; dirName: string }[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    // Skip skill-librarian (meta-skill, not a real skill)
    if (entry.name === 'skill-librarian') continue;

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

// ── Vector Search Index ─────────────────────────────────

async function ensureVectorSearchIndex(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) throw new Error('Database not connected');

  const collection = db.collection('skills');

  // Check if index already exists
  const existingIndexes = await collection.listSearchIndexes().toArray();
  const vectorIndex = existingIndexes.find(
    (idx: { name: string }) => idx.name === 'skill_embedding_vector',
  );

  if (vectorIndex) {
    console.log(`  ${c.dim('ℹ')} Vector search index already exists`);
    return;
  }

  // Create Atlas Vector Search index
  await collection.createSearchIndex({
    name: 'skill_embedding_vector',
    type: 'vectorSearch',
    definition: {
      fields: [
        {
          type: 'vector',
          path: 'embedding',
          numDimensions: EMBEDDING_DIMENSIONS,
          similarity: 'cosine',
        },
        {
          type: 'filter',
          path: 'tenantId',
        },
        {
          type: 'filter',
          path: 'isSystem',
        },
        {
          type: 'filter',
          path: 'deletedAt',
        },
      ],
    },
  });

  console.log(`  ${c.green('✓')} Vector search index created`);
}

// ── Validation ──────────────────────────────────────────

async function validateSeededSkills(expectedCount: number): Promise<boolean> {
  console.log(`\n${c.bold('━━━ Validation ━━━')}\n`);

  const skills = await SkillModel.find({
    tenantId: TENANT_ID,
    isSystem: true,
    deletedAt: null,
  }).select('+embedding');

  // Check count
  const countOk = skills.length === expectedCount;
  console.log(
    `  ${countOk ? c.green('✓') : c.red('✗')} Skill count: ${skills.length}/${expectedCount}`,
  );

  // Check embeddings
  let embeddingOk = true;
  for (const skill of skills) {
    const hasEmb = Array.isArray(skill.embedding) && skill.embedding.length === EMBEDDING_DIMENSIONS;
    if (!hasEmb) {
      embeddingOk = false;
      console.log(`  ${c.red('✗')} Missing embedding: ${skill.name}`);
    }
  }

  if (embeddingOk) {
    console.log(
      `  ${c.green('✓')} All skills have ${EMBEDDING_DIMENSIONS}-dim embeddings`,
    );
  }

  // Check searchVector
  let searchVectorOk = true;
  for (const skill of skills) {
    if (!skill.searchVector) {
      searchVectorOk = false;
      console.log(`  ${c.red('✗')} Missing searchVector: ${skill.name}`);
    }
  }

  if (searchVectorOk) {
    console.log(`  ${c.green('✓')} All skills have searchVector`);
  }

  // Print summary table
  console.log(`\n${c.bold('━━━ Seeded Skills ━━━')}\n`);
  console.log(
    `  ${'Name'.padEnd(25)} ${'Slug'.padEnd(25)} ${'Domain'.padEnd(30)} Embedding`,
  );
  console.log(`  ${'─'.repeat(25)} ${'─'.repeat(25)} ${'─'.repeat(30)} ${'─'.repeat(10)}`);

  for (const skill of skills) {
    const embLen = Array.isArray(skill.embedding) ? skill.embedding.length : 0;
    console.log(
      `  ${skill.name.padEnd(25)} ${skill.slug.padEnd(25)} ${skill.domain.join(', ').padEnd(30)} ${embLen > 0 ? c.green(`${embLen}d`) : c.red('none')}`,
    );
  }

  return countOk && embeddingOk && searchVectorOk;
}

// ── Main ────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`\n${c.bold(c.cyan('⚡ AgentForge — Seed Skills Migration'))}\n`);

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
  await mongoose.connect(MONGODB_URI, { dbName: 'agentforge' });
  console.log(`  ${c.green('✓')} Connected to MongoDB Atlas`);

  // 4. Initialize embedding service
  const embeddingService = new EmbeddingService({ apiKey: ANTHROPIC_API_KEY });
  const indexer = new SkillIndexer({ apiKey: ANTHROPIC_API_KEY });

  // 5. Upsert skills with embeddings
  console.log(`\n${c.bold('━━━ Seeding ━━━')}\n`);

  let seeded = 0;
  let failed = 0;

  for (const skill of parsedSkills) {
    try {
      // Build searchVector
      const searchVector = indexer.buildSearchVector({
        name: skill.name,
        description: skill.description,
        domain: skill.domain,
        tags: skill.tags,
        template: {
          persona: skill.template.persona,
          process: skill.template.process,
          outputFormat: skill.template.outputFormat,
          constraints: skill.template.constraints,
          examples: undefined,
          systemPrompt: skill.template.systemPrompt,
        },
      });

      // Generate embedding
      const embeddingText = embeddingService.buildEmbeddingText({
        name: skill.name,
        description: skill.description,
        domain: skill.domain,
        tags: skill.tags,
        template: {
          persona: skill.template.persona,
          process: skill.template.process,
          outputFormat: skill.template.outputFormat,
          constraints: skill.template.constraints,
          examples: undefined,
          systemPrompt: skill.template.systemPrompt,
        },
      });

      console.log(`  ${c.dim('→')} Generating embedding for ${c.cyan(skill.name)}...`);
      const embedding = await embeddingService.generateEmbedding(embeddingText);

      // Upsert into MongoDB
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
            embedding,
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
      console.log(`  ${c.green('✓')} ${skill.name} — ${embedding.length}-dim embedding`);
    } catch (error) {
      failed++;
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`  ${c.red('✗')} ${skill.name} — ${msg}`);
    }
  }

  console.log(
    `\n  ${c.bold('Result:')} ${c.green(`${seeded} seeded`)}${failed > 0 ? `, ${c.red(`${failed} failed`)}` : ''}`,
  );

  // 6. Create vector search index
  console.log(`\n${c.bold('━━━ Vector Index ━━━')}\n`);
  try {
    await ensureVectorSearchIndex();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`  ${c.yellow('⚠')} Vector index creation: ${msg}`);
    console.warn(`  ${c.dim('  (Atlas vector search indexes can only be created on M10+ clusters or Atlas Search-enabled free/shared clusters)')}`);
  }

  // 7. Validate
  const valid = await validateSeededSkills(parsedSkills.length);

  // 8. Disconnect
  await mongoose.disconnect();
  console.log(`\n  ${c.dim('Disconnected from MongoDB')}`);

  if (!valid) {
    console.error(`\n${c.red('✗ Validation failed')}`);
    process.exit(1);
  }

  console.log(`\n${c.green('✓ Migration complete — all skills seeded and validated')}\n`);
}

// ── Run ─────────────────────────────────────────────────

main().catch((err: unknown) => {
  console.error(`\n${c.red('✗ Fatal error:')}`);
  console.error(err);
  process.exit(1);
});
