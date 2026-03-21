import type {
  IPromptGenerator,
  PromptRequest,
  ExpertProfile,
  GeneratedPrompt,
  PromptSection,
  PromptArchitectureLayer,
} from './types.js';
import { COMPLEXITY_LAYERS } from './types.js';
import { getPattern } from './patterns/index.js';

// ── Prompt Generator ────────────────────────────────

export class PromptGenerator implements IPromptGenerator {
  /**
   * Generate a system prompt with XML section tags.
   * Assembles the 7-layer architecture, scales depth based on complexity.
   */
  generate(request: PromptRequest, expert: ExpertProfile): GeneratedPrompt {
    const layers = COMPLEXITY_LAYERS[request.complexity];
    const sections: PromptSection[] = [];

    for (const layer of layers) {
      const section = this.buildSection(layer, request, expert);
      if (section) sections.push(section);
    }

    const content = this.assembleContent(sections, request.targetFormat);
    const estimatedTokens = Math.ceil(content.length / 4);

    return {
      content,
      expert,
      format: request.targetFormat,
      sections,
      metadata: {
        complexity: request.complexity,
        layersUsed: layers,
        estimatedTokens,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // ── Section builders ────────────────────────────────

  private buildSection(
    layer: PromptArchitectureLayer,
    request: PromptRequest,
    expert: ExpertProfile,
  ): PromptSection | null {
    switch (layer) {
      case 'identity':
        return {
          layer: 'identity',
          tag: 'identity',
          content: expert.persona,
        };

      case 'context':
        return request.context
          ? {
              layer: 'context',
              tag: 'context',
              content: request.context,
            }
          : {
              layer: 'context',
              tag: 'context',
              content: `You operate as a ${expert.primaryPattern} pattern expert. Your approach follows: ${getPattern(expert.primaryPattern).architecture}`,
            };

      case 'goal':
        return {
          layer: 'goal',
          tag: 'instructions',
          content: request.goal,
        };

      case 'process': {
        const pattern = getPattern(expert.primaryPattern);
        const process = `Follow this process:\n${pattern.architecture}\n\nKey elements to address:\n${pattern.keyElements.map((e, i) => `${i + 1}. ${e}`).join('\n')}`;
        return {
          layer: 'process',
          tag: 'process',
          content: process,
        };
      }

      case 'format':
        return {
          layer: 'format',
          tag: 'output_format',
          content: this.deriveOutputFormat(request),
        };

      case 'boundaries': {
        const constraints = request.constraints ?? [];
        if (constraints.length === 0) {
          constraints.push(
            'If uncertain about a fact, state so explicitly. Never guess.',
            'Be concise — express each idea in the fewest words that preserve meaning.',
          );
        }
        return {
          layer: 'boundaries',
          tag: 'constraints',
          content: constraints.map((c) => `- ${c}`).join('\n'),
        };
      }

      case 'examples':
        return {
          layer: 'examples',
          tag: 'examples',
          content: `<example type="positive">\nProvide a well-structured response that follows the ${expert.primaryPattern} pattern.\n</example>\n<example type="negative">\nAvoid generic, unfocused responses that lack structure and specificity.\n</example>`,
        };

      default:
        return null;
    }
  }

  private deriveOutputFormat(request: PromptRequest): string {
    switch (request.targetFormat) {
      case 'system_prompt':
        return 'Respond in a structured format with clear sections. Use headers for organization.';
      case 'skill_md':
        return 'Output as a SKILL.md file with YAML frontmatter and structured markdown body.';
      case 'agent_md':
        return 'Output as an agent definition with YAML frontmatter (name, description, tools, model) and full system prompt.';
      case 'chat_prompt':
        return 'Respond conversationally with focused, actionable content.';
      default:
        return 'Provide a clear, structured response.';
    }
  }

  private assembleContent(sections: PromptSection[], format: string): string {
    if (format === 'system_prompt' || format === 'chat_prompt') {
      return sections
        .map((s) => `<${s.tag}>\n${s.content}\n</${s.tag}>`)
        .join('\n\n');
    }
    // For skill_md and agent_md, use markdown sections
    return sections
      .map((s) => `## ${s.layer.charAt(0).toUpperCase() + s.layer.slice(1)}\n\n${s.content}`)
      .join('\n\n---\n\n');
  }
}
