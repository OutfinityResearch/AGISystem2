/**
 * FOLIO + Generic Translator
 * @module nlp/nl2dsl/folio
 *
 * For now, we treat FOLIO as "English-like" and use the shared grammar parser.
 * This intentionally avoids a large, brittle set of dataset-specific regex templates.
 *
 * Note: FOLIO contains many phenomena we don't fully support yet (real-world entities,
 * multi-clause logic, disjunction in questions). Those should fail fast with errors
 * rather than produce misleading DSL.
 */

import { translateContextWithGrammar, translateQuestionWithGrammar } from './grammar.mjs';

export function translateFOLIOContext(context) {
  return translateContextWithGrammar(context);
}

export function translateFOLIOQuestion(question) {
  return translateQuestionWithGrammar(question);
}

export function translateGenericContext(context) {
  return translateContextWithGrammar(context);
}

export function translateGenericQuestion(question) {
  return translateQuestionWithGrammar(question);
}

