/**
 * AGISystem2 - Unified NL to DSL Translator
 * @module nlp/nl2dsl
 *
 * Consolidated module for translating Natural Language to DSL.
 * Exposes public functions: translateNL2DSL(text, options), translateExample(example)
 *
 * Supports multiple source patterns:
 * - ProntoQA (made-up ontologies with -us suffix)
 * - FOLIO (complex first-order logic)
 * - RuleTaker (fact/rule patterns)
 * - Generic (fallback patterns)
 */

// Import utilities
import { resetRefCounter } from './nl2dsl/utils.mjs';

import { translateContextWithGrammar, translateQuestionWithGrammar } from './nl2dsl/grammar.mjs';

// Re-export resetRefCounter for external use
export { resetRefCounter } from './nl2dsl/utils.mjs';

/**
 * Translate natural language text to DSL
 *
 * @param {string} text - Natural language text (context/facts/rules)
 * @param {Object} options - Translation options
 * @param {string} options.source - Source type: 'prontoqa', 'folio', 'ruletaker', 'generic'
 * @param {boolean} options.isQuestion - Whether text is a question/goal
 * @returns {Object} Translation result with dsl, errors, and metadata
 */
export function translateNL2DSL(text, options = {}) {
  const { source = 'generic', isQuestion = false } = options;

  resetRefCounter();

  if (!text || typeof text !== 'string') {
    return { dsl: '', errors: [{ error: 'Invalid input text' }], success: false };
  }

  try {
    let result;

    if (isQuestion) {
      // Dataset/source-agnostic translation.
      // `source` is preserved as metadata only (useful for eval bookkeeping).
      const questionDsl = translateQuestionWithGrammar(text, options);

      return {
        dsl: questionDsl || '',
        errors: questionDsl ? [] : [{ sentence: text, error: 'Could not parse question' }],
        success: !!questionDsl,
        source,
        type: 'question'
      };
    } else {
      // Dataset/source-agnostic translation.
      result = translateContextWithGrammar(text, options);

      return {
        dsl: result.dsl,
        errors: result.errors,
        warnings: result.warnings || [],
        stats: result.stats || null,
        success: result.errors.length === 0,
        source,
        type: 'context',
        autoDeclaredOperators: result.autoDeclaredOperators || []
      };
    }
  } catch (err) {
    return {
      dsl: '',
      errors: [{ error: err.message }],
      success: false,
      source
    };
  }
}

/**
 * Translate a complete example (context + question) to DSL
 *
 * @param {Object} example - Example object with context, question, label
 * @param {string} example.context - Context/facts/rules in natural language
 * @param {string} example.question - Question to prove
 * @param {string} example.label - Expected label (entailment/not_entailment)
 * @param {string} example.source - Source type for pattern selection
 * @returns {Object} Translated example with contextDsl, questionDsl, expectProved
 */
export function translateExample(example) {
  const { source = 'generic', label, category } = example;
  const normalized = normalizeDatasetExample(example);
  const { context, question } = normalized;
  const translateOptions = example?.translateOptions || {};

  resetRefCounter();

  const contextResult = translateNL2DSL(context, { source, isQuestion: false, ...translateOptions });
  const questionResult = translateNL2DSL(question, { source, isQuestion: true, ...translateOptions });

  const expectProved = isSupportedBinaryExample({ source, category, label }) ? labelToExpectation(label) : null;

  return {
    source,
    contextDsl: contextResult.dsl,
    contextErrors: contextResult.errors,
    contextWarnings: contextResult.warnings || [],
    contextStats: contextResult.stats || null,
    contextAutoDeclaredOperators: contextResult.autoDeclaredOperators || [],
    questionDsl: questionResult.dsl,
    expectProved,
    label,
    original: normalized
  };
}

function normalizeDatasetExample(example) {
  const source = example?.source || 'generic';
  if (source !== 'rulebert') return example;

  const context = String(example?.context || '');
  const question = String(example?.question || '');

  // RuleBERT encodes the actual goal inside the context as: "hypothesis: pred(A,B)"
  // and uses a meta question: "Is the hypothesis true given the facts and rules?"
  const hypMatch = context.match(/(?:^|\n)\s*hypothesis\s*:\s*([^\n]+)\s*$/i);
  const hypothesis = hypMatch ? hypMatch[1].trim() : null;
  const contextWithoutHypothesis = hypMatch ? context.replace(hypMatch[0], '').trim() : context;

  const isMetaQuestion = /\bhypothesis\b/i.test(question) && /\bfacts\b/i.test(question) && /\brules\b/i.test(question);
  if (hypothesis && isMetaQuestion) {
    return { ...example, context: contextWithoutHypothesis, question: hypothesis };
  }

  return { ...example, context: contextWithoutHypothesis };
}

function isSupportedBinaryExample({ category }) {
  // logiqa2 is mapped as NLI but its hypotheses are generally too complex for the current grammar translator.
  if (!category) return true;
  return String(category) !== 'nli_complex';
}

/**
 * Convert label to boolean expectation
 * @param {string} label
 * @returns {boolean|null}
 */
function labelToExpectation(label) {
  if (!label) return null;
  const l = String(label).toLowerCase();
  if (l === 'entailment' || l === 'true' || l === 'yes' || l === 'correct' || l === '1') {
    return true;
  }
  if (l === 'not_entailment' || l === 'contradiction' || l === 'false' || l === 'no' || l === 'incorrect' || l === '0') {
    return false;
  }
  if (l === 'uncertain' || l === 'neutral' || l === 'unknown') {
    return false;
  }
  return null;
}

export default translateNL2DSL;
