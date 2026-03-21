import type {
  ISkillGenerator,
  PromptRequest,
  ExpertProfile,
  GeneratedPrompt,
  PromptSection,
} from './types.js';
import { COMPLEXITY_LAYERS } from './types.js';
import { getPattern } from './patterns/index.js';

// ── Skill Generator ─────────────────────────────────

export class SkillGenerator implements ISkillGenerator {
  /**
   * Generate a SKILL.md-format prompt with YAML frontmatter.
   */
  generate(request: PromptRequest, expert: ExpertProfile): GeneratedPrompt {
    const name = this.deriveName(request);
    const description = this.deriveDescription(request, expert);
    const body = this.buildBody(request, expert);

    const frontmatter = this.buildFrontmatter(name, description, request);
    const content = `${frontmatter}\n${body}`;

    const layers = COMPLEXITY_LAYERS[request.complexity];
    const sections = this.buildSections(request, expert);
    const estimatedTokens = Math.ceil(content.length / 4);

    return {
      content,
      expert,
      format: 'skill_md',
      sections,
      metadata: {
        complexity: request.complexity,
        layersUsed: layers,
        estimatedTokens,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // ── Builders ────────────────────────────────────────

  private deriveName(request: PromptRequest): string {
    if (request.name) {
      return request.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 64);
    }

    // Derive from goal: take first 3-4 meaningful words
    return request.goal
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 4)
      .join('-')
      .slice(0, 64) || 'custom-skill';
  }

  private deriveDescription(request: PromptRequest, expert: ExpertProfile): string {
    const action = request.goal.length > 200
      ? request.goal.slice(0, 200) + '...'
      : request.goal;

    const triggers = this.deriveTriggers(request);

    return `${action} Uses the ${expert.primaryPattern} pattern. ${triggers}`.slice(0, 1024);
  }

  private deriveTriggers(request: PromptRequest): string {
    const domain = request.domain ?? [];
    const keywords = domain.length > 0
      ? domain.join(', ')
      : 'general purpose';

    return `Trigger on tasks involving: ${keywords}.`;
  }

  private buildFrontmatter(name: string, description: string, request: PromptRequest): string {
    const lines = [
      '---',
      `name: ${name}`,
      `description: >`,
      `  ${description}`,
    ];

    if (request.model) {
      lines.push(`model: ${request.model}`);
    }

    lines.push('---');
    return lines.join('\n');
  }

  private buildBody(request: PromptRequest, expert: ExpertProfile): string {
    const pattern = getPattern(expert.primaryPattern);
    const title = request.name
      ? request.name.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : 'Custom Skill';

    const lines: string[] = [
      '',
      `# ${title}`,
      '',
      expert.persona,
      '',
      '## Process',
      '',
      `Architecture: ${pattern.architecture}`,
      '',
    ];

    // Process steps from pattern key elements
    pattern.keyElements.forEach((element, i) => {
      lines.push(`${i + 1}. **${element.split('(')[0]!.trim()}**`);
      const detail = element.includes('(') ? element.slice(element.indexOf('(')) : '';
      if (detail) lines.push(`   ${detail}`);
    });

    // Output format
    lines.push('', '## Output Format', '');
    lines.push('Deliver structured output that follows the pattern architecture above.');

    // Constraints
    if (request.constraints && request.constraints.length > 0) {
      lines.push('', '## Critical Rules', '');
      request.constraints.forEach((c) => {
        lines.push(`- ${c}`);
      });
    }

    return lines.join('\n');
  }

  private buildSections(request: PromptRequest, expert: ExpertProfile): PromptSection[] {
    return [
      { layer: 'identity', tag: 'persona', content: expert.persona },
      { layer: 'goal', tag: 'goal', content: request.goal },
      {
        layer: 'process',
        tag: 'process',
        content: getPattern(expert.primaryPattern).architecture,
      },
      { layer: 'format', tag: 'format', content: 'SKILL.md' },
    ];
  }
}
