# Claude-Specific Prompting Techniques

## XML Tags for Structure

Claude was trained with XML tags. Use them to create clear section boundaries:

```xml
<identity>Who the model is</identity>
<context>Environmental constraints and dependencies</context>
<instructions>Step-by-step workflow</instructions>
<examples>
  <example type="positive">Good output example</example>
  <example type="negative">Bad output example</example>
</examples>
<constraints>What NOT to do, guardrails</constraints>
<output_format>Expected structure of response</output_format>
```

## Instruction Placement

- **System prompt**: High-level identity, tone, persistent rules
- **Human turn**: Specific task instructions, context, data — Claude follows these more reliably
- **Prefilling**: Start assistant response with specific tokens to steer format

## Thinking Scaffolding

For complex reasoning tasks, add explicit thinking steps:

```
Before responding, analyze the following in order:
1. [First consideration]
2. [Second consideration]
3. [Third consideration]
Then synthesize your analysis into a response.
```

For Claude Code skills, include "ultrathink" in skill content to enable extended thinking.

## Positive vs Negative Framing

```
❌ "Don't use jargon"
✅ "Use plain language accessible to a general audience"

❌ "Don't be verbose"  
✅ "Be concise — express each idea in the fewest words that preserve meaning"

❌ "Don't hallucinate"
✅ "If you're uncertain about a fact, say so explicitly. Never guess."
```

## Tone Mirroring

Claude naturally mirrors the tone of its prompt. Use this deliberately:
- Academic prompt → Academic responses
- Casual prompt → Casual responses
- Direct, imperative prompt → Direct, action-oriented responses

## Few-Shot Design for Claude 4.x

Claude 4.x models pay extreme attention to example details. Ensure:
- Examples demonstrate EXACTLY the behaviors you want
- No unintended patterns in examples that Claude might replicate
- Include at least 1 positive + 1 negative example for subtle format requirements

## Prompt Hygiene

- Clean grammar and capitalization improve output quality
- Consistent formatting signals professionalism to the model
- Markdown headers create clear hierarchy Claude respects
- Numbered lists for sequential steps, bullets for parallel items

## SKILL.md Specific

- `name`: lowercase, hyphens only, max 64 chars
- `description`: max 1024 chars, third person, include triggers — be "pushy"
- Body: max 500 lines — use progressive disclosure for more
- `context: fork` for isolated execution (skill becomes subagent prompt)
- `allowed-tools` to scope permissions (principle of least privilege)
- `model` field to route to appropriate model (opus for complex, sonnet for focused, haiku for fast)

## Custom Agent Specific

- Store in `.claude/agents/` (project) or `~/.claude/agents/` (global)
- `tools` field: scope to minimum needed (Read, Write, Edit, Bash, Glob, Grep)
- `model` field: match complexity to model tier
- Description drives auto-delegation — write it like a job posting
- Project agents override user agents on name conflict

## Anti-Slop Techniques

To prevent generic "AI-sounding" output:
- Explicitly ban clichés: "Never use phrases like 'dive into', 'it's important to note', 'in conclusion'"
- Require specificity: "Always include concrete numbers, names, or examples"
- Set anti-patterns: "Your response should not read like a blog post or tutorial"
- Demand perspective: "Take a clear position. Avoid hedging with 'it depends' unless genuinely ambiguous"
