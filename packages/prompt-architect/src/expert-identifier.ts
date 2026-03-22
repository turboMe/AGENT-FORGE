import type { ILLMGateway } from '@agentforge/llm-gateway';
import type { ExpertProfile, IExpertIdentifier, PromptRequest, ExpertPattern } from './types.js';
import { matchPattern, getPattern } from './patterns/index.js';

// ── Domain → expertise mapping ──────────────────────

const DOMAIN_EXPERTISE: Record<string, { field: string; experience: string; perspective: string }> = {
  coding: {
    field: 'software engineering',
    experience: 'senior software architect with 12+ years building production systems',
    perspective: 'engineering precision — clean code, testability, performance',
  },
  writing: {
    field: 'professional writing and communication',
    experience: 'seasoned content strategist with editorial background in top publications',
    perspective: 'clarity, audience awareness, and purposeful structure',
  },
  analysis: {
    field: 'data analysis and business intelligence',
    experience: 'lead data analyst with experience across startups and enterprises',
    perspective: 'evidence-based insights translated into actionable recommendations',
  },
  marketing: {
    field: 'growth marketing and demand generation',
    experience: 'growth marketing lead with hands-on B2B SaaS and DTC experience',
    perspective: 'conversion-focused, data-informed creative strategy',
  },
  sales: {
    field: 'B2B sales and outreach',
    experience: 'senior sales strategist specializing in cold outreach and deal closing',
    perspective: 'relationship-driven, outcome-measured communication',
  },
  education: {
    field: 'instructional design and pedagogy',
    experience: 'curriculum designer with cross-domain teaching experience',
    perspective: 'learner-centric, progressive complexity, measurable outcomes',
  },
  legal: {
    field: 'legal analysis and compliance',
    experience: 'corporate counsel with regulatory compliance background',
    perspective: 'risk-aware, precise language, regulatory alignment',
  },
  finance: {
    field: 'financial analysis and planning',
    experience: 'financial controller with P&L management across multiple verticals',
    perspective: 'numbers-driven, ROI-focused, risk-adjusted decision making',
  },
  design: {
    field: 'UX/UI design and user experience',
    experience: 'product designer with 10+ years shaping high-traffic digital products',
    perspective: 'user empathy, interaction elegance, accessibility-first',
  },
  devops: {
    field: 'infrastructure and platform engineering',
    experience: 'platform engineer managing production systems at scale',
    perspective: 'reliability, automation, observability, cost optimization',
  },
};

const DEFAULT_EXPERTISE = {
  field: 'general knowledge and problem-solving',
  experience: 'versatile professional with cross-domain expertise',
  perspective: 'pragmatic, solution-oriented, clear communication',
};

// ── Expert Identifier ───────────────────────────────

export class ExpertIdentifier implements IExpertIdentifier {
  /**
   * Heuristic expert identification based on request analysis.
   * Follows the 5-step method: domain → experience → perspective → workStyle → uniqueTraits
   */
  identify(request: PromptRequest): ExpertProfile {
    // Step 1: Determine the primary pattern
    const patternMatches = matchPattern(request.goal);
    const primaryMatch = patternMatches[0]!;
    const secondaryCandidate = patternMatches[1];
    const secondaryMatch = secondaryCandidate && secondaryCandidate.score > 0 ? secondaryCandidate : undefined;

    const primaryPattern = primaryMatch.pattern.name;
    const secondaryPattern = secondaryMatch?.pattern.name;

    // Step 2: Determine the domain expertise
    const domainKey = this.detectDomain(request);
    const expertise = DOMAIN_EXPERTISE[domainKey] ?? DEFAULT_EXPERTISE;

    // Step 3: Build the work style from pattern traits
    const patternDef = getPattern(primaryPattern);
    const workStyle = patternDef.personaTraits.join(', ');

    // Step 4: Derive unique traits
    const uniqueTraits = this.deriveUniqueTraits(request, primaryPattern);

    // Step 5: Compile the full persona
    const persona = this.compilePersona(expertise, workStyle, uniqueTraits, primaryPattern);

    return {
      domain: expertise.field,
      experience: expertise.experience,
      perspective: expertise.perspective,
      workStyle,
      uniqueTraits,
      persona,
      primaryPattern,
      secondaryPattern,
    };
  }

  /**
   * LLM-powered expert identification for higher-quality results.
   */
  async identifyWithLLM(request: PromptRequest, llmGateway: ILLMGateway): Promise<ExpertProfile> {
    const systemPrompt = `You are an expert persona designer. Given a task description, identify the ideal expert persona.
Respond with ONLY a JSON object (no markdown wrapping):
{
  "domain": "specific field of expertise",
  "experience": "experience level and background description",
  "perspective": "how this expert views problems",
  "workStyle": "communication and work traits",
  "uniqueTraits": ["trait1", "trait2", "trait3"],
  "primaryPattern": "one of: analyst, creator, advisor, processor, orchestrator, guardian, teacher, negotiator",
  "secondaryPattern": "optional secondary pattern or null"
}`;

    const prompt = `Task goal: ${request.goal}
Context: ${request.context ?? 'Not specified'}
Target format: ${request.targetFormat}
Complexity: ${request.complexity}
Domain hints: ${request.domain?.join(', ') ?? 'None'}`;

    try {
      const result = await llmGateway.generate({
        prompt,
        systemPrompt,
        quality: 'fast',
        temperature: 0.3,
      });

      const cleaned = result.content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(cleaned) as Record<string, unknown>;

      const primaryPattern = this.validatePattern(parsed.primaryPattern as string) ?? 'creator';
      const secondaryPattern = parsed.secondaryPattern
        ? this.validatePattern(parsed.secondaryPattern as string)
        : undefined;

      const profile: ExpertProfile = {
        domain: (typeof parsed.domain === 'string' ? parsed.domain : DEFAULT_EXPERTISE.field),
        experience: (typeof parsed.experience === 'string' ? parsed.experience : DEFAULT_EXPERTISE.experience),
        perspective: (typeof parsed.perspective === 'string' ? parsed.perspective : DEFAULT_EXPERTISE.perspective),
        workStyle: (typeof parsed.workStyle === 'string' ? parsed.workStyle : 'professional, precise'),
        uniqueTraits: Array.isArray(parsed.uniqueTraits) ? parsed.uniqueTraits as string[] : [],
        persona: '',
        primaryPattern,
        secondaryPattern,
      };

      profile.persona = this.compilePersona(
        { field: profile.domain, experience: profile.experience, perspective: profile.perspective },
        profile.workStyle,
        profile.uniqueTraits,
        primaryPattern,
      );

      return profile;
    } catch {
      // Fall back to heuristic identification
      return this.identify(request);
    }
  }

  // ── Private helpers ─────────────────────────────────

  private detectDomain(request: PromptRequest): string {
    // Use explicit domain hints first
    if (request.domain && request.domain.length > 0) {
      const first = request.domain[0]!.toLowerCase();
      if (DOMAIN_EXPERTISE[first]) return first;
    }

    // Keyword detection from goal text
    const text = `${request.goal} ${request.context ?? ''}`.toLowerCase();
    const domainScores: Array<[string, number]> = Object.entries(DOMAIN_EXPERTISE).map(([key]) => {
      const keywords: Record<string, string[]> = {
        coding: ['code', 'function', 'typescript', 'javascript', 'api', 'bug', 'refactor', 'test', 'module', 'class'],
        writing: ['write', 'article', 'blog', 'essay', 'content', 'copy', 'draft', 'editorial'],
        analysis: ['analyze', 'data', 'report', 'statistics', 'metrics', 'insight', 'trend', 'dashboard'],
        marketing: ['marketing', 'campaign', 'growth', 'conversion', 'funnel', 'brand', 'seo'],
        sales: ['sales', 'outreach', 'cold email', 'prospect', 'deal', 'pipeline', 'lead'],
        education: ['teach', 'learn', 'course', 'curriculum', 'student', 'lesson', 'training'],
        legal: ['legal', 'compliance', 'regulation', 'contract', 'policy', 'terms'],
        finance: ['financial', 'budget', 'revenue', 'cost', 'profit', 'investment', 'roi'],
        design: ['design', 'ux', 'ui', 'interface', 'wireframe', 'prototype', 'user experience'],
        devops: ['deploy', 'infrastructure', 'ci/cd', 'docker', 'kubernetes', 'monitoring', 'cloud'],
      };

      const domainKw = keywords[key] ?? [];
      const score = domainKw.filter((kw) => text.includes(kw)).length;
      return [key, score] as [string, number];
    });

    domainScores.sort((a, b) => b[1] - a[1]);
    return domainScores[0]![1] > 0 ? domainScores[0]![0] : 'general';
  }

  private deriveUniqueTraits(request: PromptRequest, pattern: ExpertPattern): string[] {
    const traits: string[] = [];

    // Add pattern-specific unique traits
    const patternTraitMap: Record<ExpertPattern, string> = {
      analyst: 'Sees hidden patterns in data that others miss',
      creator: 'Produces original work that surprises with unexpected angles',
      advisor: 'Balances empathy with hard truths others avoid',
      processor: 'Achieves deterministic perfection in ambiguous domains',
      orchestrator: 'Keeps complex systems coordinated without losing detail',
      guardian: 'Catches critical issues before they reach production',
      teacher: 'Makes complex topics intuitive through precise analogies',
      negotiator: 'Reads between the lines to find leverage points',
    };

    traits.push(patternTraitMap[pattern]);

    // Complexity-based traits
    if (request.complexity === 'complex') {
      traits.push('Thrives in high-ambiguity, multi-constraint environments');
    }

    // Constraint awareness
    if (request.constraints && request.constraints.length > 0) {
      traits.push('Operates within strict boundaries without sacrificing quality');
    }

    return traits;
  }

  private compilePersona(
    expertise: { field: string; experience: string; perspective: string },
    workStyle: string,
    uniqueTraits: string[],
    _pattern: ExpertPattern,
  ): string {
    const traitsText = uniqueTraits.length > 0
      ? ` ${uniqueTraits.join('. ')}.`
      : '';

    return `You are a ${expertise.experience} specializing in ${expertise.field}. ` +
      `Your perspective: ${expertise.perspective}. ` +
      `Your work style: ${workStyle}.` +
      traitsText;
  }

  private validatePattern(name: string): ExpertPattern | undefined {
    const valid = ['analyst', 'creator', 'advisor', 'processor', 'orchestrator', 'guardian', 'teacher', 'negotiator'];
    return valid.includes(name) ? (name as ExpertPattern) : undefined;
  }
}
