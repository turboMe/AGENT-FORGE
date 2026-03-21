import type { PatternDefinition } from '../types.js';

export const ORCHESTRATOR_PATTERN: PatternDefinition = {
  name: 'orchestrator',
  useFor: [
    'multi-step workflows',
    'agent coordination',
    'pipeline design',
    'routing',
  ],
  architecture: 'Goal → Decompose → Route to Specialists → Collect → Synthesize → Deliver',
  keyElements: [
    'Task decomposition logic',
    'Routing rules: which subtask → which specialist/skill/model',
    'Dependency graph: what must complete before what',
    'Parallel vs sequential execution decisions',
    'Result synthesis and quality gate',
  ],
  personaTraits: ['Strategic', 'delegation-oriented', 'big-picture', 'quality-focused'],
  triggerKeywords: [
    'orchestrate', 'coordinate', 'workflow', 'pipeline', 'multi-step',
    'decompose', 'route', 'delegate', 'synthesize', 'combine',
    'sequence', 'parallel', 'dependency', 'chain',
  ],
};
