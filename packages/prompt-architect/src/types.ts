import type { ISkill } from '@agentforge/shared';
import type { ILLMGateway } from '@agentforge/llm-gateway';

// ── Expert Pattern ──────────────────────────────────

export const EXPERT_PATTERNS = [
  'analyst',
  'creator',
  'advisor',
  'processor',
  'orchestrator',
  'guardian',
  'teacher',
  'negotiator',
] as const;

export type ExpertPattern = (typeof EXPERT_PATTERNS)[number];

export interface PatternDefinition {
  name: ExpertPattern;
  useFor: string[];
  architecture: string;
  keyElements: string[];
  personaTraits: string[];
  /** Keywords that signal this pattern is a good fit */
  triggerKeywords: string[];
}

// ── Expert Profile ──────────────────────────────────

export interface ExpertProfile {
  domain: string;
  experience: string;
  perspective: string;
  workStyle: string;
  uniqueTraits: string[];
  /** Compiled persona paragraph ready for prompt injection */
  persona: string;
  /** Primary pattern driving the architecture */
  primaryPattern: ExpertPattern;
  /** Optional secondary pattern for specific phases */
  secondaryPattern?: ExpertPattern;
}

// ── Prompt Architecture ─────────────────────────────

export type PromptArchitectureLayer =
  | 'identity'
  | 'context'
  | 'goal'
  | 'process'
  | 'format'
  | 'boundaries'
  | 'examples';

export type PromptComplexity = 'simple' | 'medium' | 'complex';

/**
 * Maps complexity → which layers to include.
 * Simple: identity + goal + format
 * Medium: identity through format (1-5)
 * Complex: all 7 layers
 */
export const COMPLEXITY_LAYERS: Record<PromptComplexity, PromptArchitectureLayer[]> = {
  simple: ['identity', 'goal', 'format'],
  medium: ['identity', 'context', 'goal', 'process', 'format'],
  complex: ['identity', 'context', 'goal', 'process', 'format', 'boundaries', 'examples'],
};

// ── Target Format ───────────────────────────────────

export type TargetFormat = 'system_prompt' | 'skill_md' | 'agent_md' | 'chat_prompt';

// ── Request / Response ──────────────────────────────

export interface PromptRequest {
  /** What the prompt should accomplish */
  goal: string;
  /** Usage context: who uses it, environment, frequency */
  context?: string;
  /** What the prompt should NOT do */
  constraints?: string[];
  /** Desired output format */
  targetFormat: TargetFormat;
  /** Controls architecture depth */
  complexity: PromptComplexity;
  /** Domain tags for expert identification */
  domain?: string[];
  /** If adapting an existing skill */
  existingSkill?: Partial<ISkill>;
  /** Skill name (for skill_md / agent_md formats) */
  name?: string;
  /** Agent tools (for agent_md format) */
  tools?: string[];
  /** Model tier (for skill_md / agent_md formats) */
  model?: string;
}

export interface PromptSection {
  layer: PromptArchitectureLayer;
  tag: string;
  content: string;
}

export interface GeneratedPrompt {
  /** The full generated prompt text */
  content: string;
  /** The identified expert profile */
  expert: ExpertProfile;
  /** Target format used */
  format: TargetFormat;
  /** Individual sections that compose the prompt */
  sections: PromptSection[];
  /** Generation metadata */
  metadata: {
    complexity: PromptComplexity;
    layersUsed: PromptArchitectureLayer[];
    estimatedTokens: number;
    generatedAt: string;
  };
}

// ── Validation ──────────────────────────────────────

export type ValidationSeverity = 'critical' | 'major' | 'minor' | 'suggestion';

export interface ValidationCheck {
  name: string;
  passed: boolean;
  severity: ValidationSeverity;
  message: string;
  /** Score for this check (0–1) */
  score: number;
}

export interface ValidationResult {
  /** Overall pass/fail — true if no critical/major failures */
  passed: boolean;
  /** Overall score (0–1), weighted average of checks */
  score: number;
  /** Individual check results */
  checks: ValidationCheck[];
  /** Actionable improvement suggestions */
  suggestions: string[];
}

// ── Component Interfaces ────────────────────────────

export interface IExpertIdentifier {
  /** Heuristic expert identification */
  identify(request: PromptRequest): ExpertProfile;
  /** LLM-powered expert identification */
  identifyWithLLM(request: PromptRequest, llmGateway: ILLMGateway): Promise<ExpertProfile>;
}

export interface IPromptGenerator {
  /** Generate a system prompt with XML sections */
  generate(request: PromptRequest, expert: ExpertProfile): GeneratedPrompt;
}

export interface ISkillGenerator {
  /** Generate a SKILL.md format prompt */
  generate(request: PromptRequest, expert: ExpertProfile): GeneratedPrompt;
}

export interface IAgentGenerator {
  /** Generate a custom agent .md format prompt */
  generate(request: PromptRequest, expert: ExpertProfile): GeneratedPrompt;
}

export interface IPromptValidator {
  /** Run the 5-check validation pipeline */
  validate(prompt: GeneratedPrompt): ValidationResult;
}

// ── Facade Interface ────────────────────────────────

export interface IPromptArchitect {
  /** Full pipeline: identify expert → generate → validate */
  create(request: PromptRequest): GeneratedPrompt;
  /** Validate an existing prompt */
  validate(prompt: GeneratedPrompt): ValidationResult;
  /** Create a new skill from task description (convenience) */
  createSkill(taskDescription: string, domain: string[]): Promise<Partial<ISkill>>;
  /** Adapt an existing skill to a new context (convenience) */
  adaptSkill(existingSkill: ISkill, newContext: string): Promise<Partial<ISkill>>;
}
