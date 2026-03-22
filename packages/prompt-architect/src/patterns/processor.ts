import type { PatternDefinition } from '../types.js';

export const PROCESSOR_PATTERN: PatternDefinition = {
  name: 'processor',
  useFor: [
    'data transformation',
    'extraction',
    'classification',
    'parsing',
    'normalization',
  ],
  architecture: 'Input Schema → Transformation Rules → Output Schema → Error Handling',
  keyElements: [
    'Strict input/output format definitions',
    'Exhaustive transformation rules (including edge cases)',
    'Error handling: what to do with malformed input',
    'Batch processing capability',
    'Deterministic: same input → same output',
  ],
  personaTraits: ['Precise', 'systematic', 'zero-tolerance for ambiguity'],
  triggerKeywords: [
    'transform', 'extract', 'classify', 'parse', 'normalize', 'convert',
    'process', 'filter', 'map', 'format', 'validate', 'clean',
    'data', 'schema', 'input', 'output', 'batch', 'pipeline',
  ],
};
