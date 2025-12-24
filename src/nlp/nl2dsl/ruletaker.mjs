/**
 * RuleTaker Translator
 * @module nlp/nl2dsl/ruletaker
 *
 * RuleTaker input largely follows a small English grammar (copula facts, if/then rules,
 * all/every quantification). We delegate parsing to the shared grammar module to avoid
 * hardcoding per-word inventories.
 */

import { translateContextWithGrammar, translateQuestionWithGrammar } from './grammar.mjs';

export function translateRuleTakerFact(sentence) {
  const result = translateContextWithGrammar(sentence);
  if (!result || (result.errors && result.errors.length > 0)) return null;
  return result.dsl || null;
}

export function translateRuleTakerRule(sentence) {
  const result = translateContextWithGrammar(sentence);
  if (!result || (result.errors && result.errors.length > 0)) return null;
  return result.dsl || null;
}

export function translateRuleTakerContext(context) {
  return translateContextWithGrammar(context);
}

export function translateRuleTakerQuestion(question) {
  return translateQuestionWithGrammar(question);
}

