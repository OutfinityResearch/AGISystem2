/**
 * ProntoQA Translator
 * @module nlp/nl2dsl/prontoqa
 *
 * This module intentionally contains minimal dataset-specific logic.
 * Most syntax is handled by the shared English grammar translator.
 */

import { translateContextWithGrammar, translateQuestionWithGrammar } from './grammar.mjs';

export function translateProntoQASentence(sent) {
  const result = translateContextWithGrammar(sent);
  if (!result || (result.errors && result.errors.length > 0)) return null;
  return result.dsl || null;
}

export function translateProntoQAContext(context) {
  return translateContextWithGrammar(context);
}

export function translateProntoQAQuestion(question) {
  return translateQuestionWithGrammar(question);
}

