/**
 * AGISystem2 - Basic NLP Module
 * @module nlp
 *
 * Heuristic-based natural language to DSL transformation.
 */

export { EnglishTokenizer } from './tokenizer.mjs';
export { NLTransformer } from './transformer.mjs';
export { patterns, patternPriority } from './patterns.mjs';
export {
  normalizeText,
  expandContractions,
  removeFillers,
  singularize,
  pluralize,
  normalizeVerb,
  capitalize,
  capitalizeWord,
  toSentenceCase
} from './normalizer.mjs';

// Grammar-based NL → DSL translator (DS21).
export { translateNL2DSL, translateExample, resetRefCounter } from './nl2dsl.mjs';

// Default export
export { NLTransformer as default } from './transformer.mjs';
