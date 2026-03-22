---
description: Routes any task through the full AgentForge pipeline — classify, search skills, decide routing, execute, save, log.
---

# /route — AgentForge Universal Pipeline

When the user invokes `/route`, read and follow the instructions in `.agents/skills/route/SKILL.md`.

Pass the user's task as `$ARGUMENTS` and execute all 6 steps of the pipeline exactly as documented in the skill file.
