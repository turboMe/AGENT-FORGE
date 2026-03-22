# Expert Patterns Library

## Pattern Selection Guide

Match the user's task to the right pattern. Multiple patterns can be combined.

---

## 1. ANALYST Pattern
**Use for**: evaluation, comparison, audit, review, assessment, grading, ranking

**Architecture**:
```
Input → Define Criteria → Analyze per Criterion → Synthesize → Recommend
```

**Key elements**:
- Explicit evaluation framework (criteria + weights if needed)
- Per-criterion assessment with evidence
- Trade-off matrix for comparisons
- Clear verdict with confidence level
- Actionable recommendations

**Persona traits**: Methodical, evidence-based, balanced, precise

---

## 2. CREATOR Pattern
**Use for**: content generation, code writing, design, copywriting, brainstorming

**Architecture**:
```
Brief/Context → Constraints → Generate → Self-Review → Refine → Output
```

**Key elements**:
- Clear creative brief (audience, tone, purpose, medium)
- Hard constraints (length, format, style rules)
- Self-review step: "Before finalizing, verify against [criteria]"
- Anti-slop guardrails specific to the creative domain
- Iteration hooks: "If the user says 'more X', adjust by..."

**Persona traits**: Original, domain-native voice, opinionated, quality-obsessed

---

## 3. ADVISOR Pattern
**Use for**: coaching, consulting, strategy, planning, decision support

**Architecture**:
```
Understand Situation → Identify Options → Present Trade-offs → Recommend
```

**Key elements**:
- Active listening / situational assessment phase
- Multiple options with honest pros/cons
- Risk assessment per option
- Recommendation with clear reasoning (not just "it depends")
- Follow-up action items

**Persona traits**: Experienced, empathetic but direct, strategic, pragmatic

---

## 4. PROCESSOR Pattern
**Use for**: data transformation, extraction, classification, parsing, normalization

**Architecture**:
```
Input Schema → Transformation Rules → Output Schema → Error Handling
```

**Key elements**:
- Strict input/output format definitions
- Exhaustive transformation rules (including edge cases)
- Error handling: what to do with malformed input
- Batch processing capability
- Deterministic: same input → same output

**Persona traits**: Precise, systematic, zero-tolerance for ambiguity

---

## 5. ORCHESTRATOR Pattern
**Use for**: multi-step workflows, agent coordination, pipeline design, routing

**Architecture**:
```
Goal → Decompose → Route to Specialists → Collect → Synthesize → Deliver
```

**Key elements**:
- Task decomposition logic
- Routing rules: which subtask → which specialist/skill/model
- Dependency graph: what must complete before what
- Parallel vs sequential execution decisions
- Result synthesis and quality gate

**Persona traits**: Strategic, delegation-oriented, big-picture, quality-focused

---

## 6. GUARDIAN Pattern
**Use for**: validation, code review, compliance check, quality gate, security audit

**Architecture**:
```
Acceptance Criteria → Checklist → Evaluate per Item → Verdict + Feedback
```

**Key elements**:
- Binary or scored evaluation per criterion
- Evidence-based assessment (point to specific lines/sections)
- Severity classification (critical, major, minor, suggestion)
- Pass/fail with clear threshold
- Constructive feedback: what to fix + how

**Persona traits**: Thorough, fair, constructive, high-standards

---

## 7. TEACHER Pattern
**Use for**: explanation, tutoring, documentation, onboarding, how-to guides

**Architecture**:
```
Assess Level → Build Foundation → Layer Complexity → Verify Understanding
```

**Key elements**:
- Audience level calibration (beginner, intermediate, advanced)
- Analogies from the learner's domain
- Progressive complexity: simple → nuanced
- Concrete examples at each level
- Verification: "Try this exercise" or "In your own words..."

**Persona traits**: Patient, clear, adaptive, uses learner's language

---

## 8. NEGOTIATOR Pattern
**Use for**: email drafting, conflict resolution, persuasion, stakeholder management

**Architecture**:
```
Understand Stakes → Map Interests → Design Approach → Craft Message → Anticipate Response
```

**Key elements**:
- Stakeholder analysis: what does each party want/fear
- Multiple approach variants (direct, diplomatic, escalating)
- Tone calibration to relationship dynamics
- Anticipate objections + prepare responses
- Clear call-to-action

**Persona traits**: Emotionally intelligent, strategic, persuasive but honest

---

## Combining Patterns

Complex tasks often need pattern combinations:

- **Content Strategy** = Analyst (research) → Creator (content) → Guardian (quality)
- **Code Feature** = Advisor (architecture) → Creator (implementation) → Guardian (review)
- **Data Pipeline** = Processor (transform) → Analyst (validate) → Orchestrator (coordinate)
- **Onboarding System** = Teacher (explain) → Processor (setup) → Guardian (verify)

When combining, the primary pattern drives the top-level architecture; secondary patterns inform specific phases.
