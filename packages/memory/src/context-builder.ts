import type { ISkill } from '@agentforge/shared';
import type {
  IContextBuilder,
  ContextBuildRequest,
  BuiltContext,
  MemoryContext,
} from './types.js';

// ── Token estimation ────────────────────────────────

/** Rough char-to-token ratio (1 token ≈ 4 chars) */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Truncate text to fit within a token budget */
function truncateToTokenBudget(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 3) + '...';
}

// ── Context Builder ─────────────────────────────────

/**
 * Composes the final LLM prompt from:
 * 1. Memory context (core identity, recall history, archival knowledge)
 * 2. Skill template (persona, process, constraints)
 * 3. Current task description
 *
 * Output uses XML sections following the prompt-architect convention.
 */
export class ContextBuilder implements IContextBuilder {
  build(request: ContextBuildRequest): BuiltContext {
    const { task, memory, skill, memoryTokenBudget = 2048 } = request;
    const sections: string[] = [];
    const parts: string[] = [];

    // 1. Memory context section
    const memorySection = this.buildMemorySection(memory, memoryTokenBudget);
    if (memorySection) {
      parts.push(memorySection);
      sections.push('memory_context');
    }

    // 2. Skill section
    if (skill) {
      const skillSection = this.buildSkillSection(skill);
      parts.push(skillSection);
      sections.push('skill');
    }

    // 3. Task section
    const taskSection = `<task>\n${task}\n</task>`;
    parts.push(taskSection);
    sections.push('task');

    const prompt = parts.join('\n\n');

    return {
      prompt,
      estimatedTokens: estimateTokens(prompt),
      sections,
    };
  }

  // ── Section builders ────────────────────────────────────

  private buildMemorySection(
    memory: MemoryContext,
    tokenBudget: number,
  ): string | null {
    const innerParts: string[] = [];

    // Core memory
    const coreEntries = Object.entries(memory.coreMemory).filter(
      ([, v]) => v !== undefined && v !== '',
    );
    if (coreEntries.length > 0) {
      const coreContent = coreEntries
        .map(([label, value]) => `  <${label}>${value}</${label}>`)
        .join('\n');
      innerParts.push(`  <core_memory>\n${coreContent}\n  </core_memory>`);
    }

    // Recall history
    if (memory.relevantHistory.length > 0) {
      const historyContent = memory.relevantHistory
        .map((h) => `    - ${h}`)
        .join('\n');
      innerParts.push(
        `  <relevant_history>\n${historyContent}\n  </relevant_history>`,
      );
    }

    // Archival knowledge
    if (memory.archivalKnowledge.length > 0) {
      const archivalContent = memory.archivalKnowledge
        .map((a) => `    - ${a}`)
        .join('\n');
      innerParts.push(
        `  <archival_knowledge>\n${archivalContent}\n  </archival_knowledge>`,
      );
    }

    if (innerParts.length === 0) return null;

    const raw = `<memory_context>\n${innerParts.join('\n')}\n</memory_context>`;
    return truncateToTokenBudget(raw, tokenBudget);
  }

  private buildSkillSection(skill: ISkill): string {
    const parts: string[] = [];

    parts.push(`  <name>${skill.name}</name>`);

    if (skill.template.persona) {
      parts.push(`  <persona>${skill.template.persona}</persona>`);
    }

    if (skill.template.process.length > 0) {
      const processSteps = skill.template.process
        .map((step, i) => `    ${i + 1}. ${step}`)
        .join('\n');
      parts.push(`  <process>\n${processSteps}\n  </process>`);
    }

    if (skill.template.constraints.length > 0) {
      const constraints = skill.template.constraints
        .map((c) => `    - ${c}`)
        .join('\n');
      parts.push(`  <constraints>\n${constraints}\n  </constraints>`);
    }

    if (skill.template.outputFormat) {
      parts.push(
        `  <output_format>${skill.template.outputFormat}</output_format>`,
      );
    }

    if (skill.template.systemPrompt) {
      parts.push(
        `  <system_prompt>${skill.template.systemPrompt}</system_prompt>`,
      );
    }

    return `<skill>\n${parts.join('\n')}\n</skill>`;
  }
}
