---
name: route
description: >
  MANDATORY entry point for ALL user tasks. Routes every task through the
  full AgentForge pipeline: classify, search skill library, decide routing,
  execute using skill, save new skills, and log decisions. Use /route before
  any task to ensure consistent pipeline execution. This skill should be
  triggered for ANY user request — writing, analysis, code review, strategy,
  translation, or any other task type.
---

# AgentForge Router — Universal Pipeline

You received a task via /route. Execute this EXACT pipeline. Do NOT skip steps. Do NOT answer from your own knowledge. Follow every step in order.

The task from the user is: $ARGUMENTS

---

## Step 1: CLASSIFY

Analyze the task and determine:
- **Task type:** text (one-time output) or automation (recurring workflow)
- **Domain:** 2-5 relevant domain tags (lowercase)
- **Complexity:** simple | medium | complex
- **Keywords:** 3-6 substantive keywords for skill search (nouns and specific terms only)

Write your classification before proceeding.

---

## Step 2: SEARCH SKILL LIBRARY

Run the search script with your extracted keywords:

```bash
bash .claude/skills/skill-librarian/scripts/search.sh "keyword1 keyword2 keyword3"
```

Report the search results. If no results or empty array — report "No matching skill found."

---

## Step 3: DECIDE ROUTING

Based on search results:

**IF match_score >= 0.90 (EXACT MATCH):**
→ Read the matched skill's SKILL.md file
→ Proceed to Step 4 using that skill

**IF match_score 0.65-0.89 (PARTIAL MATCH):**
→ Read the matched skill's SKILL.md file
→ Adapt its approach for the current task
→ Proceed to Step 4

**IF match_score < 0.65 OR no results (NO MATCH):**
→ Create a new skill:
  1. Identify the ideal expert persona for this task
  2. Write a SKILL.md with YAML frontmatter (name, description with triggers)
  3. Include: persona, process steps, output format, constraints
  4. Save to: .claude/skills/[skill-name]/SKILL.md
→ Proceed to Step 4 using the new skill

---

## Step 4: EXECUTE

Apply the skill to the user's task:
- Follow the skill's instructions precisely
- Use the skill's defined persona and process
- Produce output in the skill's specified format
- If the skill has constraints — respect them

Deliver the result to the user.

---

## Step 5: SAVE (if new skill was created in Step 3)

Update .claude/memory/skill-index.json:
1. Read current file
2. Add new entry with: id, name, type, domain, pattern, persona_summary, description, tags, file_path, created_at, use_count (0), avg_satisfaction (null), last_used (null)
3. Increment total_skills
4. Update last_updated timestamp
5. Write back

If using an existing skill — update its use_count (+1) and last_used timestamp.

---

## Step 6: LOG DECISION

Append one JSON line to .claude/memory/decisions-log.jsonl:

```json
{"timestamp":"[ISO 8601]","task_summary":"[brief description]","task_type":"[text/automation]","classified_domain":["domain1","domain2"],"complexity":"[simple/medium/complex]","search_keywords":["kw1","kw2","kw3"],"search_result":"[exact_match/partial_match/no_match]","matched_skill":"[skill-name or null]","match_score":[0.00],"action_taken":"[use_existing/adapt_existing/create_new]","new_skill_created":"[skill-name or null]","execution_success":true}
```

---

## Pipeline Complete

After all 6 steps — your response to the user should contain ONLY the output from Step 4. Do not narrate the pipeline steps unless the user asks about the routing process.