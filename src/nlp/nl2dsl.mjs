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

// Import translators
import {
  translateProntoQAContext,
  translateProntoQAQuestion
} from './nl2dsl/prontoqa.mjs';

import {
  translateRuleTakerContext,
  translateRuleTakerQuestion
} from './nl2dsl/ruletaker.mjs';

import {
  translateFOLIOContext,
  translateFOLIOQuestion,
  translateGenericContext,
  translateGenericQuestion
} from './nl2dsl/folio.mjs';

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
      // Translate as question/goal
      let questionDsl;
      switch (source) {
        case 'prontoqa':
          questionDsl = translateProntoQAQuestion(text);
          break;
        case 'folio':
        case 'folio_fol':
          questionDsl = translateFOLIOQuestion(text);
          break;
        case 'ruletaker':
          questionDsl = translateRuleTakerQuestion(text);
          break;
        default:
          questionDsl = translateGenericQuestion(text);
      }

      return {
        dsl: questionDsl || '',
        errors: questionDsl ? [] : [{ sentence: text, error: 'Could not parse question' }],
        success: !!questionDsl,
        source,
        type: 'question'
      };
    } else {
      // Translate as context/facts/rules
      switch (source) {
        case 'prontoqa':
          result = translateProntoQAContext(text);
          break;
        case 'folio':
        case 'folio_fol':
          result = translateFOLIOContext(text);
          break;
        case 'ruletaker':
          result = translateRuleTakerContext(text);
          break;
        default:
          result = translateGenericContext(text);
      }

      return {
        dsl: result.dsl,
        errors: result.errors,
        success: result.errors.length === 0,
        source,
        type: 'context'
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
  const { source = 'generic', context, question, label } = example;

  resetRefCounter();

  const contextResult = translateNL2DSL(context, { source, isQuestion: false });
  const questionResult = translateNL2DSL(question, { source, isQuestion: true });

  const expectProved = labelToExpectation(label);

  return {
    source,
    contextDsl: contextResult.dsl,
    contextErrors: contextResult.errors,
    questionDsl: questionResult.dsl,
    expectProved,
    label,
    original: example
  };
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
