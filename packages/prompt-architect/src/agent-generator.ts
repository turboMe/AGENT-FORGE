import type {
  IAgentGenerator,
  PromptRequest,
  ExpertProfile,
  GeneratedPrompt,
  PromptSection,
} from './types.js';
import { COMPLEXITY_LAYERS } from './types.js';
import { getPattern } from './patterns/index.js';

// ── Default tools ───────────────────────────────────

const DEFAULT_TOOLS = ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'];

// ── Model selection map ─────────────────────────────

const COMPLEXITY_MODEL: Record<string, string> = {
  simple: 'haiku',
  medium: 'sonnet',
  complex: 'opus',
};

// ── Agent Generator ─────────────────────────────────

export class AgentGenerator implements IAgentGenerator {
  /**
   * Generate a custom agent .md format prompt with YAML frontmatter.
   */
  generate(request: PromptRequest, expert: ExpertProfile): GeneratedPrompt {
    const name = this.deriveName(request);
    const description = this.deriveDescription(request, expert);
    const tools = request.tools ?? DEFAULT_TOOLS;
    const model = request.model ?? COMPLEXITY_MODEL[request.complexity] ?? 'sonnet';

    const frontmatter = this.buildFrontmatter(name, description, tools, model);
    const body = this.buildBody(request, expert);
    const content = `${frontmatter}\n${body}`;

    const layers = COMPLEXITY_LAYERS[request.complexity];
    const sections = this.buildSections(request, expert);
    const estimatedTokens = Math.ceil(content.length / 4);

    return {
      content,
      expert,
      format: 'agent_md',
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

    return request.goal
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 3)
      .join('-')
      .slice(0, 64) || 'custom-agent';
  }

  private deriveDescription(request: PromptRequest, expert: ExpertProfile): string {
    const pattern = getPattern(expert.primaryPattern);
    const triggers = pattern.useFor.join(', ');
    const goalSummary = request.goal.length > 150
      ? request.goal.slice(0, 150) + '...'
      : request.goal;

    return `${goalSummary} Specializes in: ${triggers}. Invoke when tasks require ${expert.primaryPattern} pattern expertise.`.slice(0, 1024);
  }

  private buildFrontmatter(
    name: string,
    description: string,
    tools: string[],
    model: string,
  ): string {
    return [
      '---',
      `name: ${name}`,
      `description: >`,
      `  ${description}`,
      `tools: ${tools.join(', ')}`,
      `model: ${model}`,
      '---',
    ].join('\n');
  }

  private buildBody(request: PromptRequest, expert: ExpertProfile): string {
    const pattern = getPattern(expert.primaryPattern);
    const title = request.name
      ? request.name.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : 'Custom Agent';

    const lines: string[] = [
      '',
      `# ${title.toUpperCase()} — ${pattern.personaTraits.join(', ')}`,
      '',
      expert.persona,
      '',
      '## When invoked:',
      '',
    ];

    // Process from pattern
    const steps = pattern.architecture.split('→').map((s) => s.trim());
    steps.forEach((step, i) => {
      lines.push(`${i + 1}. **${step}**`);
    });

    // Key elements as sub-items
    lines.push('');
    lines.push('## Key Requirements:');
    lines.push('');
    pattern.keyElements.forEach((element) => {
      lines.push(`- ${element}`);
    });

    // Constraints
    if (request.constraints && request.constraints.length > 0) {
      lines.push('');
      lines.push('## Constraints:');
      lines.push('');
      request.constraints.forEach((c) => {
        lines.push(`- ${c}`);
      });
    }

    // Output guidance
    lines.push('');
    lines.push('## Output:');
    lines.push('');
    lines.push('Deliver focused, expert-level output. If no issues found, say so — never invent problems.');

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
      { layer: 'format', tag: 'format', content: 'agent_md' },
    ];
  }
}
