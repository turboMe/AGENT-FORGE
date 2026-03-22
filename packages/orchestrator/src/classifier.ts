import type { ILLMGateway } from '@agentforge/llm-gateway';
import type { ITaskClassifier, TaskClassification } from './types.js';

// ── Domain keyword map for heuristic fallback ───────

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  coding: ['code', 'program', 'function', 'bug', 'api', 'typescript', 'javascript', 'python', 'debug', 'refactor', 'compile'],
  writing: ['write', 'essay', 'article', 'blog', 'story', 'copy', 'content', 'draft', 'edit', 'proofread'],
  analysis: ['analyze', 'data', 'report', 'metrics', 'statistics', 'compare', 'evaluate', 'assess', 'review', 'audit'],
  translation: ['translate', 'language', 'localize', 'i18n', 'multilingual'],
  summarization: ['summarize', 'summary', 'digest', 'brief', 'overview', 'tldr', 'condense'],
  design: ['design', 'ui', 'ux', 'wireframe', 'mockup', 'layout', 'prototype'],
  automation: ['automate', 'workflow', 'pipeline', 'script', 'batch', 'cron', 'schedule', 'trigger'],
  research: ['research', 'find', 'search', 'investigate', 'explore', 'discover', 'learn'],
};

// ── Complexity heuristics ───────────────────────────

function estimateComplexity(task: string): 'simple' | 'medium' | 'complex' {
  const words = task.split(/\s+/).length;
  const sentences = task.split(/[.!?]+/).filter(Boolean).length;
  const hasMultipleSteps = /\b(then|next|after|also|additionally|finally|step)\b/i.test(task);
  const hasConstraints = /\b(must|should|require|ensure|constraint|limit|format)\b/i.test(task);

  if (words > 200 || sentences > 8 || (hasMultipleSteps && hasConstraints)) {
    return 'complex';
  }
  if (words > 50 || sentences > 3 || hasMultipleSteps || hasConstraints) {
    return 'medium';
  }
  return 'simple';
}

// ── Extract keywords from task ──────────────────────

function extractKeywords(task: string): string[] {
  const STOP_WORDS = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'under', 'again',
    'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
    'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
    'than', 'too', 'very', 'just', 'and', 'but', 'or', 'if', 'while',
    'it', 'its', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he',
    'him', 'his', 'she', 'her', 'they', 'them', 'their', 'this', 'that',
    'these', 'those', 'what', 'which', 'who', 'whom',
  ]);

  const words = task
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  // Deduplicate and take top 10
  return [...new Set(words)].slice(0, 10);
}

// ── Detect domains from keywords ────────────────────

function detectDomains(task: string): string[] {
  const lowerTask = task.toLowerCase();
  const detected: string[] = [];

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    const matchCount = keywords.filter((kw) => lowerTask.includes(kw)).length;
    if (matchCount >= 2 || (matchCount >= 1 && keywords.length <= 5)) {
      detected.push(domain);
    }
  }

  return detected.length > 0 ? detected : ['general'];
}

// ── Detect task type ────────────────────────────────

function detectTaskType(task: string, domains: string[]): 'text' | 'automation' {
  if (domains.includes('automation')) return 'automation';
  if (/\b(automate|script|pipeline|workflow|cron|trigger|batch)\b/i.test(task)) {
    return 'automation';
  }
  return 'text';
}

// ── LLM Classification Prompt ───────────────────────

const CLASSIFICATION_SYSTEM_PROMPT = `You are a task classification engine. Analyze the user's task and return a JSON object with:

{
  "taskType": "text" or "automation",
  "domain": ["array", "of", "domains"],
  "complexity": "simple" or "medium" or "complex",
  "keywords": ["array", "of", "keywords"]
}

Domain categories: coding, writing, analysis, translation, summarization, design, automation, research, general.
Complexity guide: simple = single clear action, medium = multi-step or constrained, complex = requires deep reasoning or multiple outputs.
Keywords: extract 5-10 task-relevant keywords for skill matching.

Return ONLY valid JSON, no markdown, no explanation.`;

// ── TaskClassifier ──────────────────────────────────

export class TaskClassifier implements ITaskClassifier {
  private readonly llmGateway: ILLMGateway | null;

  constructor(llmGateway?: ILLMGateway) {
    this.llmGateway = llmGateway ?? null;
  }

  /**
   * Classify a task using LLM (with heuristic fallback).
   */
  async classify(task: string): Promise<TaskClassification> {
    // Try LLM-based classification first
    if (this.llmGateway) {
      try {
        return await this.classifyWithLLM(task);
      } catch {
        // Fall through to heuristic
      }
    }

    // Heuristic fallback
    return this.classifyHeuristic(task);
  }

  /**
   * LLM-based classification — structured JSON output.
   */
  private async classifyWithLLM(task: string): Promise<TaskClassification> {
    const result = await this.llmGateway!.generate({
      prompt: task,
      systemPrompt: CLASSIFICATION_SYSTEM_PROMPT,
      quality: 'fast',
      temperature: 0.1,
      maxTokens: 256,
    });

    const parsed = this.parseLLMResponse(result.content);
    return {
      ...parsed,
      confidence: 0.9,
    };
  }

  /**
   * Parse and validate the LLM JSON response.
   */
  private parseLLMResponse(content: string): Omit<TaskClassification, 'confidence'> {
    // Strip potential markdown code fences
    const cleaned = content
      .replace(/```(?:json)?\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    // Validate required fields with type coercion
    const taskType = parsed.taskType === 'automation' ? 'automation' : 'text';
    const domain = Array.isArray(parsed.domain) ? parsed.domain.filter((d: unknown) => typeof d === 'string') : ['general'];
    const complexity = ['simple', 'medium', 'complex'].includes(parsed.complexity) ? parsed.complexity : 'simple';
    const keywords = Array.isArray(parsed.keywords) ? parsed.keywords.filter((k: unknown) => typeof k === 'string').slice(0, 10) : [];

    return { taskType, domain, complexity, keywords };
  }

  /**
   * Heuristic classification — regex & word-count based.
   */
  classifyHeuristic(task: string): TaskClassification {
    const domains = detectDomains(task);
    const taskType = detectTaskType(task, domains);
    const complexity = estimateComplexity(task);
    const keywords = extractKeywords(task);

    return {
      taskType,
      domain: domains,
      complexity,
      keywords,
      confidence: 0.6,
    };
  }
}
