import { describe, it, expect } from 'vitest';
import { PromptGenerator } from '../prompt-generator.js';
import { SkillGenerator } from '../skill-generator.js';
import { AgentGenerator } from '../agent-generator.js';
import { ExpertIdentifier } from '../expert-identifier.js';
import type { PromptRequest } from '../types.js';

// ── Shared ──────────────────────────────────────────

const identifier = new ExpertIdentifier();

function makeRequest(overrides?: Partial<PromptRequest>): PromptRequest {
  return {
    goal: 'Help restaurant owners analyze their food costs and optimize menu pricing',
    targetFormat: 'system_prompt',
    complexity: 'medium',
    domain: ['finance'],
    ...overrides,
  };
}

// ── PromptGenerator ─────────────────────────────────

describe('PromptGenerator', () => {
  const generator = new PromptGenerator();

  it('should generate XML sections for system_prompt format', () => {
    const request = makeRequest();
    const expert = identifier.identify(request);
    const result = generator.generate(request, expert);

    expect(result.format).toBe('system_prompt');
    expect(result.content).toContain('<identity>');
    expect(result.content).toContain('</identity>');
    expect(result.content).toContain('<instructions>');
    expect(result.content).toContain('</instructions>');
  });

  it('should scale depth for simple complexity', () => {
    const request = makeRequest({ complexity: 'simple' });
    const expert = identifier.identify(request);
    const result = generator.generate(request, expert);

    expect(result.metadata.layersUsed).toEqual(['identity', 'goal', 'format']);
    expect(result.sections.length).toBe(3);
  });

  it('should scale depth for medium complexity', () => {
    const request = makeRequest({ complexity: 'medium' });
    const expert = identifier.identify(request);
    const result = generator.generate(request, expert);

    expect(result.metadata.layersUsed).toEqual(['identity', 'context', 'goal', 'process', 'format']);
    expect(result.sections.length).toBe(5);
  });

  it('should scale depth for complex complexity', () => {
    const request = makeRequest({
      complexity: 'complex',
      constraints: ['Never recommend quality compromises'],
    });
    const expert = identifier.identify(request);
    const result = generator.generate(request, expert);

    expect(result.metadata.layersUsed.length).toBe(7);
    expect(result.content).toContain('<constraints>');
    expect(result.content).toContain('<examples>');
  });

  it('should include expert persona in identity section', () => {
    const request = makeRequest();
    const expert = identifier.identify(request);
    const result = generator.generate(request, expert);

    const identitySection = result.sections.find((s) => s.layer === 'identity');
    expect(identitySection).toBeDefined();
    expect(identitySection!.content).toContain('You are a');
  });

  it('should estimate tokens', () => {
    const request = makeRequest();
    const expert = identifier.identify(request);
    const result = generator.generate(request, expert);

    expect(result.metadata.estimatedTokens).toBeGreaterThan(0);
    expect(result.metadata.generatedAt).toBeTruthy();
  });

  it('should use markdown sections for skill_md format', () => {
    const request = makeRequest({ targetFormat: 'skill_md' });
    const expert = identifier.identify(request);
    const result = generator.generate(request, expert);

    expect(result.content).toContain('## Identity');
    expect(result.content).not.toContain('<identity>');
  });
});

// ── SkillGenerator ──────────────────────────────────

describe('SkillGenerator', () => {
  const generator = new SkillGenerator();

  it('should generate YAML frontmatter', () => {
    const request = makeRequest({ targetFormat: 'skill_md', name: 'food-cost-analyzer' });
    const expert = identifier.identify(request);
    const result = generator.generate(request, expert);

    expect(result.content).toContain('---');
    expect(result.content).toContain('name: food-cost-analyzer');
    expect(result.content).toContain('description: >');
  });

  it('should derive name from goal when not provided', () => {
    const request = makeRequest({ targetFormat: 'skill_md', name: undefined });
    const expert = identifier.identify(request);
    const result = generator.generate(request, expert);

    expect(result.content).toContain('name:');
    // Should not contain uppercase or special chars in the name line
    const nameLine = result.content.split('\n').find((l) => l.startsWith('name:'));
    const nameValue = nameLine!.replace('name: ', '');
    expect(nameValue).toMatch(/^[a-z0-9-]+$/);
  });

  it('should include pattern-based process steps', () => {
    const request = makeRequest({ targetFormat: 'skill_md', name: 'test-skill' });
    const expert = identifier.identify(request);
    const result = generator.generate(request, expert);

    expect(result.content).toContain('## Process');
    expect(result.content).toContain('Architecture:');
  });

  it('should include constraints when provided', () => {
    const request = makeRequest({
      targetFormat: 'skill_md',
      name: 'test-skill',
      constraints: ['Never use jargon', 'Max 200 words'],
    });
    const expert = identifier.identify(request);
    const result = generator.generate(request, expert);

    expect(result.content).toContain('## Critical Rules');
    expect(result.content).toContain('Never use jargon');
    expect(result.content).toContain('Max 200 words');
  });

  it('should include model field when provided', () => {
    const request = makeRequest({
      targetFormat: 'skill_md',
      name: 'test-skill',
      model: 'sonnet',
    });
    const expert = identifier.identify(request);
    const result = generator.generate(request, expert);

    expect(result.content).toContain('model: sonnet');
  });

  it('should set format to skill_md', () => {
    const request = makeRequest({ targetFormat: 'skill_md', name: 'test-skill' });
    const expert = identifier.identify(request);
    const result = generator.generate(request, expert);

    expect(result.format).toBe('skill_md');
  });

  it('should truncate name to 64 characters', () => {
    const longName = 'a-very-long-skill-name-that-exceeds-the-maximum-allowed-character-limit-for-names';
    const request = makeRequest({ targetFormat: 'skill_md', name: longName });
    const expert = identifier.identify(request);
    const result = generator.generate(request, expert);

    const nameLine = result.content.split('\n').find((l) => l.startsWith('name:'));
    const nameValue = nameLine!.replace('name: ', '');
    expect(nameValue.length).toBeLessThanOrEqual(64);
  });
});

// ── AgentGenerator ──────────────────────────────────

describe('AgentGenerator', () => {
  const generator = new AgentGenerator();

  it('should generate agent YAML frontmatter with tools and model', () => {
    const request = makeRequest({
      targetFormat: 'agent_md',
      name: 'perf-reviewer',
      tools: ['Read', 'Grep', 'Glob', 'Bash'],
      model: 'sonnet',
    });
    const expert = identifier.identify(request);
    const result = generator.generate(request, expert);

    expect(result.content).toContain('---');
    expect(result.content).toContain('name: perf-reviewer');
    expect(result.content).toContain('tools: Read, Grep, Glob, Bash');
    expect(result.content).toContain('model: sonnet');
  });

  it('should use default tools when not provided', () => {
    const request = makeRequest({ targetFormat: 'agent_md', name: 'test-agent' });
    const expert = identifier.identify(request);
    const result = generator.generate(request, expert);

    expect(result.content).toContain('tools: Read, Write, Edit, Bash, Glob, Grep');
  });

  it('should auto-select model based on complexity', () => {
    const request = makeRequest({
      targetFormat: 'agent_md',
      name: 'test-agent',
      complexity: 'complex',
    });
    const expert = identifier.identify(request);
    const result = generator.generate(request, expert);

    expect(result.content).toContain('model: opus');
  });

  it('should include process steps from pattern', () => {
    const request = makeRequest({ targetFormat: 'agent_md', name: 'test-agent' });
    const expert = identifier.identify(request);
    const result = generator.generate(request, expert);

    expect(result.content).toContain('## When invoked:');
    expect(result.content).toContain('## Key Requirements:');
  });

  it('should include constraints section', () => {
    const request = makeRequest({
      targetFormat: 'agent_md',
      name: 'test-agent',
      constraints: ['Never modify production files'],
    });
    const expert = identifier.identify(request);
    const result = generator.generate(request, expert);

    expect(result.content).toContain('## Constraints:');
    expect(result.content).toContain('Never modify production files');
  });

  it('should set format to agent_md', () => {
    const request = makeRequest({ targetFormat: 'agent_md', name: 'test-agent' });
    const expert = identifier.identify(request);
    const result = generator.generate(request, expert);

    expect(result.format).toBe('agent_md');
  });
});
