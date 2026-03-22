// ── Engines ─────────────────────────────────────────
export { ExpertIdentifier } from './expert-identifier.js';

// ── Generators ──────────────────────────────────────
export { PromptGenerator } from './prompt-generator.js';
export { SkillGenerator } from './skill-generator.js';
export { AgentGenerator } from './agent-generator.js';

// ── Validator ───────────────────────────────────────
export { PromptValidator } from './validator.js';

// ── Pattern Library ─────────────────────────────────
export {
  PATTERN_REGISTRY,
  getPattern,
  matchPattern,
  ANALYST_PATTERN,
  CREATOR_PATTERN,
  ADVISOR_PATTERN,
  PROCESSOR_PATTERN,
  ORCHESTRATOR_PATTERN,
  GUARDIAN_PATTERN,
  TEACHER_PATTERN,
  NEGOTIATOR_PATTERN,
} from './patterns/index.js';

// ── Types ───────────────────────────────────────────
export type {
  ExpertPattern,
  PatternDefinition,
  ExpertProfile,
  PromptArchitectureLayer,
  PromptComplexity,
  TargetFormat,
  PromptRequest,
  PromptSection,
  GeneratedPrompt,
  ValidationSeverity,
  ValidationCheck,
  ValidationResult,
  IExpertIdentifier,
  IPromptGenerator,
  ISkillGenerator,
  IAgentGenerator,
  IPromptValidator,
  IPromptArchitect,
} from './types.js';

export { COMPLEXITY_LAYERS, EXPERT_PATTERNS } from './types.js';
