import { describe, it, expect } from 'vitest';
import { ContextBuilder } from '../context-builder.js';
import type { MemoryContext, ContextBuildRequest } from '../types.js';
import type { ISkill } from '@agentforge/shared';

// ── Fixtures ────────────────────────────────────────

const mockMemory: MemoryContext = {
  sessionId: 'session_test',
  coreMemory: {
    persona: 'I am a helpful coding assistant',
    human: 'Developer working on TypeScript projects',
  },
  relevantHistory: [
    '[user]: How do I use generics?',
    '[assistant]: Generics allow type parameters...',
  ],
  archivalKnowledge: [
    'TypeScript best practices: use strict mode, prefer interfaces over type aliases for public APIs',
  ],
};

const emptyMemory: MemoryContext = {
  sessionId: 'session_empty',
  coreMemory: {},
  relevantHistory: [],
  archivalKnowledge: [],
};

const mockSkill: ISkill = {
  _id: 'skill-1',
  tenantId: 'tenant-1',
  name: 'TypeScript Expert',
  slug: 'typescript-expert',
  description: 'Expert at TypeScript development',
  domain: ['programming', 'typescript'],
  pattern: 'analyst',
  tags: ['typescript', 'coding'],
  template: {
    persona: 'You are a senior TypeScript developer with 10 years of experience.',
    process: ['Analyze the request', 'Write clean TypeScript code', 'Explain the solution'],
    outputFormat: 'Code block with explanatory comments',
    constraints: ['Use strict mode', 'No any types'],
    systemPrompt: 'You are a TypeScript expert.',
  },
  version: 1,
  isSystem: false,
  isPublic: false,
  stats: { useCount: 5, totalRatings: 3, avgSatisfaction: 4.5 },
  createdBy: 'system',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── Tests ───────────────────────────────────────────

describe('ContextBuilder', () => {
  const builder = new ContextBuilder();

  describe('build', () => {
    it('should assemble full prompt with memory + skill + task', () => {
      const request: ContextBuildRequest = {
        task: 'Write a generic repository pattern in TypeScript',
        memory: mockMemory,
        skill: mockSkill,
      };

      const result = builder.build(request);

      // Should include all three sections
      expect(result.sections).toEqual(['memory_context', 'skill', 'task']);

      // Memory context
      expect(result.prompt).toContain('<memory_context>');
      expect(result.prompt).toContain('<core_memory>');
      expect(result.prompt).toContain('helpful coding assistant');
      expect(result.prompt).toContain('<relevant_history>');
      expect(result.prompt).toContain('How do I use generics');
      expect(result.prompt).toContain('<archival_knowledge>');
      expect(result.prompt).toContain('TypeScript best practices');

      // Skill
      expect(result.prompt).toContain('<skill>');
      expect(result.prompt).toContain('TypeScript Expert');
      expect(result.prompt).toContain('<persona>');
      expect(result.prompt).toContain('<process>');
      expect(result.prompt).toContain('<constraints>');
      expect(result.prompt).toContain('No any types');
      expect(result.prompt).toContain('<output_format>');

      // Task
      expect(result.prompt).toContain('<task>');
      expect(result.prompt).toContain('generic repository pattern');

      // Token estimate
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });

    it('should work without skill', () => {
      const request: ContextBuildRequest = {
        task: 'Simple question about TypeScript',
        memory: mockMemory,
      };

      const result = builder.build(request);

      expect(result.sections).toEqual(['memory_context', 'task']);
      expect(result.prompt).not.toContain('<skill>');
      expect(result.prompt).toContain('<task>');
    });

    it('should work with empty memory', () => {
      const request: ContextBuildRequest = {
        task: 'A task without memory',
        memory: emptyMemory,
        skill: mockSkill,
      };

      const result = builder.build(request);

      // No memory section when everything is empty
      expect(result.sections).toEqual(['skill', 'task']);
      expect(result.prompt).not.toContain('<memory_context>');
      expect(result.prompt).toContain('<skill>');
      expect(result.prompt).toContain('<task>');
    });

    it('should work with only task (no memory, no skill)', () => {
      const request: ContextBuildRequest = {
        task: 'Just a task',
        memory: emptyMemory,
      };

      const result = builder.build(request);

      expect(result.sections).toEqual(['task']);
      expect(result.prompt).toBe('<task>\nJust a task\n</task>');
    });

    it('should respect token budget for memory', () => {
      const longMemory: MemoryContext = {
        sessionId: 'session_long',
        coreMemory: {
          persona: 'A'.repeat(10000),
        },
        relevantHistory: [],
        archivalKnowledge: [],
      };

      const request: ContextBuildRequest = {
        task: 'Short task',
        memory: longMemory,
        memoryTokenBudget: 100, // Very small budget = ~400 chars
      };

      const result = builder.build(request);

      // Memory section should be truncated
      const memorySection = result.prompt.split('<task>')[0]!;
      const estimatedMemoryTokens = Math.ceil(memorySection.length / 4);
      expect(estimatedMemoryTokens).toBeLessThanOrEqual(110); // some tolerance
    });

    it('should include persona in the core memory section', () => {
      const request: ContextBuildRequest = {
        task: 'A task',
        memory: {
          sessionId: 'test',
          coreMemory: { persona: 'Data analyst persona' },
          relevantHistory: [],
          archivalKnowledge: [],
        },
      };

      const result = builder.build(request);

      expect(result.prompt).toContain('<persona>Data analyst persona</persona>');
    });

    it('should properly format skill process steps', () => {
      const request: ContextBuildRequest = {
        task: 'A task',
        memory: emptyMemory,
        skill: mockSkill,
      };

      const result = builder.build(request);

      expect(result.prompt).toContain('1. Analyze the request');
      expect(result.prompt).toContain('2. Write clean TypeScript code');
      expect(result.prompt).toContain('3. Explain the solution');
    });
  });
});
