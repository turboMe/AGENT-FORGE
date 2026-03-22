import type {
  IPromptValidator,
  GeneratedPrompt,
  ValidationResult,
  ValidationCheck,
  ValidationSeverity,
} from './types.js';

// ── Banned AI clichés (anti-slop) ───────────────────

const SLOP_PHRASES = [
  'dive into',
  'dive deep',
  'it\'s important to note',
  'it is important to note',
  'in conclusion',
  'in today\'s world',
  'in this day and age',
  'cutting-edge',
  'state-of-the-art',
  'game-changer',
  'game changer',
  'revolutionary',
  'paradigm shift',
  'leverage',
  'synergy',
  'holistic approach',
  'delve into',
  'at the end of the day',
  'it goes without saying',
  'needless to say',
  'without further ado',
  'first and foremost',
  'last but not least',
  'innovative solution',
  'robust solution',
  'seamless integration',
  'best-in-class',
];

// ── Specificity markers ─────────────────────────────

const SPECIFICITY_MARKERS = [
  /\d+/,                   // numbers
  /\b(e\.g\.|for example|such as|like)\b/i,  // examples
  /\b(never|always|must|exactly)\b/i,          // strong directives
  /"[^"]+"/,               // quoted strings
  /`[^`]+`/,               // code references
  /\b\d+%/,                // percentages
  /\$\d+/,                 // dollar amounts
];

// ── Prompt Validator ────────────────────────────────

export class PromptValidator implements IPromptValidator {
  /**
   * Run the 5-check validation pipeline from the spec:
   * 1. Clarity Test
   * 2. Token Efficiency
   * 3. Edge Case Test
   * 4. Persona Consistency
   * 5. Anti-Slop Test
   */
  validate(prompt: GeneratedPrompt): ValidationResult {
    const checks: ValidationCheck[] = [
      this.clarityTest(prompt),
      this.tokenEfficiencyTest(prompt),
      this.edgeCaseTest(prompt),
      this.personaConsistencyTest(prompt),
      this.antiSlopTest(prompt),
    ];

    // Calculate weighted score
    const weights: Record<string, number> = {
      'Clarity Test': 0.25,
      'Token Efficiency': 0.15,
      'Edge Case Coverage': 0.2,
      'Persona Consistency': 0.2,
      'Anti-Slop Test': 0.2,
    };

    let totalWeight = 0;
    let weightedScore = 0;
    for (const check of checks) {
      const w = weights[check.name] ?? 0.2;
      weightedScore += check.score * w;
      totalWeight += w;
    }

    const score = totalWeight > 0 ? weightedScore / totalWeight : 0;
    const hasCriticalFailure = checks.some((c) => !c.passed && c.severity === 'critical');
    const hasMajorFailure = checks.some((c) => !c.passed && c.severity === 'major');
    const passed = !hasCriticalFailure && !hasMajorFailure;

    // Generate suggestions
    const suggestions = checks
      .filter((c) => !c.passed)
      .map((c) => c.message);

    return { passed, score, checks, suggestions };
  }

  // ── Individual checks ─────────────────────────────

  /**
   * Test 1: Clarity — Would an intelligent colleague execute this correctly?
   */
  private clarityTest(prompt: GeneratedPrompt): ValidationCheck {
    const content = prompt.content;
    const issues: string[] = [];

    // Check for question marks in instructions (questions ≠ instructions)
    const instructionQuestions = (content.match(/\?/g) ?? []).length;
    if (instructionQuestions > 3) {
      issues.push(`Found ${instructionQuestions} questions in prompt — instructions should be declarative, not interrogative`);
    }

    // Check minimum section count
    if (prompt.sections.length < 2) {
      issues.push('Prompt has fewer than 2 sections — add structure for clarity');
    }

    // Check for very short content
    if (content.length < 100) {
      issues.push('Prompt is under 100 characters — likely too vague');
    }

    // Check for undefined references
    const undefinedRefs = content.match(/\[TODO\]|\[TBD\]|\[PLACEHOLDER\]/gi);
    if (undefinedRefs && undefinedRefs.length > 0) {
      issues.push(`Found ${undefinedRefs.length} placeholder(s) — resolve before deployment`);
    }

    const score = issues.length === 0 ? 1.0 : Math.max(0, 1.0 - issues.length * 0.25);
    const severity: ValidationSeverity = issues.length > 2 ? 'critical' : issues.length > 0 ? 'major' : 'suggestion';

    return {
      name: 'Clarity Test',
      passed: issues.length <= 1,
      severity,
      message: issues.length > 0
        ? issues.join('. ')
        : 'Prompt is clear and well-structured.',
      score,
    };
  }

  /**
   * Test 2: Token Efficiency — Can any sentence be removed?
   */
  private tokenEfficiencyTest(prompt: GeneratedPrompt): ValidationCheck {
    const content = prompt.content;
    const issues: string[] = [];

    // Estimate tokens (rough: ~4 chars per token)
    const estimatedTokens = Math.ceil(content.length / 4);

    // Check for excessive length based on complexity
    const maxTokens: Record<string, number> = {
      simple: 500,
      medium: 1500,
      complex: 4000,
    };
    const limit = maxTokens[prompt.metadata.complexity] ?? 2000;

    if (estimatedTokens > limit) {
      issues.push(`Estimated ${estimatedTokens} tokens exceeds ${prompt.metadata.complexity} limit of ${limit}`);
    }

    // Check for repeated phrases (indicator of redundancy)
    const sentences = content.split(/[.!?]\s+/).filter((s) => s.length > 10);
    const normalized = sentences.map((s) => s.toLowerCase().trim());
    const duplicates = normalized.filter((s, i) => normalized.indexOf(s) !== i);
    if (duplicates.length > 0) {
      issues.push(`Found ${duplicates.length} repeated sentence(s) — remove redundancy`);
    }

    // Check token density (useful content ratio)
    const wordCount = content.split(/\s+/).length;
    const uniqueWords = new Set(content.toLowerCase().split(/\s+/));
    const vocabularyRatio = wordCount > 0 ? uniqueWords.size / wordCount : 1;
    if (vocabularyRatio < 0.3) {
      issues.push('Low vocabulary diversity — prompt may be repetitive');
    }

    const score = issues.length === 0 ? 1.0 : Math.max(0, 1.0 - issues.length * 0.3);

    return {
      name: 'Token Efficiency',
      passed: issues.length === 0,
      severity: issues.length > 1 ? 'major' : 'minor',
      message: issues.length > 0
        ? issues.join('. ')
        : `Token-efficient: ~${estimatedTokens} tokens for ${prompt.metadata.complexity} complexity.`,
      score,
    };
  }

  /**
   * Test 3: Edge Case Coverage — What happens with unexpected input?
   */
  private edgeCaseTest(prompt: GeneratedPrompt): ValidationCheck {
    const content = prompt.content.toLowerCase();
    const issues: string[] = [];

    // Check for error handling mentions
    const errorKeywords = ['error', 'invalid', 'empty', 'malformed', 'missing', 'fail', 'unexpected', 'edge case'];
    const hasErrorHandling = errorKeywords.some((kw) => content.includes(kw));
    if (!hasErrorHandling) {
      issues.push('No error handling or edge case guidance found');
    }

    // Check for input validation mentions
    const inputKeywords = ['if', 'when', 'unless', 'in case', 'otherwise', 'fallback'];
    const hasConditionals = inputKeywords.some((kw) => content.includes(kw));
    if (!hasConditionals) {
      issues.push('No conditional logic or fallback behavior defined');
    }

    // Check for guardrails
    const guardrailKeywords = ['never', 'must not', 'do not', 'avoid', 'constraint', 'boundary', 'limit'];
    const hasGuardrails = guardrailKeywords.some((kw) => content.includes(kw));
    if (!hasGuardrails && prompt.metadata.complexity !== 'simple') {
      issues.push('No guardrails or constraints defined for non-simple prompt');
    }

    const score = issues.length === 0 ? 1.0 : Math.max(0, 1.0 - issues.length * 0.3);

    return {
      name: 'Edge Case Coverage',
      passed: issues.length <= 1,
      severity: issues.length > 1 ? 'major' : 'minor',
      message: issues.length > 0
        ? issues.join('. ')
        : 'Edge cases and error handling are addressed.',
      score,
    };
  }

  /**
   * Test 4: Persona Consistency — Is tone/depth consistent throughout?
   */
  private personaConsistencyTest(prompt: GeneratedPrompt): ValidationCheck {
    const content = prompt.content;
    const issues: string[] = [];

    // Check if persona section exists
    const hasPersona = prompt.sections.some((s) => s.layer === 'identity');
    if (!hasPersona) {
      issues.push('No identity/persona section found — add expert persona');
    }

    // Check if persona is referenced in the content

    const personaDomain = prompt.expert.domain.toLowerCase();
    if (!content.toLowerCase().includes(personaDomain.split(' ')[0]!)) {
      issues.push(`Expert domain "${personaDomain}" not reflected in prompt body`);
    }

    // Check for conflicting tones
    const formalMarkers = (content.match(/\b(shall|hereby|hereunder|aforementioned)\b/gi) ?? []).length;
    const casualMarkers = (content.match(/\b(gonna|wanna|kinda|yeah|cool|awesome)\b/gi) ?? []).length;
    if (formalMarkers > 0 && casualMarkers > 0) {
      issues.push('Mixed formal and casual tone detected — maintain consistency');
    }

    const score = issues.length === 0 ? 1.0 : Math.max(0, 1.0 - issues.length * 0.3);

    return {
      name: 'Persona Consistency',
      passed: issues.length === 0,
      severity: issues.length > 1 ? 'major' : 'minor',
      message: issues.length > 0
        ? issues.join('. ')
        : 'Persona is defined and consistent throughout.',
      score,
    };
  }

  /**
   * Test 5: Anti-Slop — Does the prompt encourage specific, original output?
   */
  private antiSlopTest(prompt: GeneratedPrompt): ValidationCheck {
    const content = prompt.content.toLowerCase();
    const issues: string[] = [];

    // Check for banned clichés
    const foundSlop = SLOP_PHRASES.filter((phrase) => content.includes(phrase));
    if (foundSlop.length > 0) {
      issues.push(`Found ${foundSlop.length} AI cliché(s): "${foundSlop.slice(0, 3).join('", "')}"`);
    }

    // Check for specificity markers (must have some)
    const hasSpecificity = SPECIFICITY_MARKERS.some((marker) => marker.test(prompt.content));
    if (!hasSpecificity) {
      issues.push('No specificity markers found (numbers, examples, strong directives) — prompt may produce generic output');
    }

    // Check for anti-generic instructions
    const antiGenericKeywords = ['specific', 'concrete', 'exact', 'precise', 'original'];
    const hasAntiGeneric = antiGenericKeywords.some((kw) => content.includes(kw));
    if (!hasAntiGeneric && prompt.metadata.complexity !== 'simple') {
      issues.push('No anti-generic instructions — consider adding specificity requirements');
    }

    const score = issues.length === 0 ? 1.0 : Math.max(0, 1.0 - issues.length * 0.25);

    return {
      name: 'Anti-Slop Test',
      passed: foundSlop.length === 0,
      severity: foundSlop.length > 2 ? 'major' : 'minor',
      message: issues.length > 0
        ? issues.join('. ')
        : 'Prompt is free of AI clichés and encourages specificity.',
      score,
    };
  }
}
