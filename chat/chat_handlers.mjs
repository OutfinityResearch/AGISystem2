/**
 * DS(/chat/chat_handlers.mjs) - Chat Intent Handler Facade
 *
 * Thin facade that exposes the public chat handler API:
 * - Teaching new facts
 * - Asking questions
 * - Importing files
 * - Theory management
 * - Listing knowledge
 *
 * Concrete implementations live in:
 * - DS(/chat/handler_utils.mjs)
 * - DS(/chat/handlers_teach.mjs)
 * - DS(/chat/handlers_ask.mjs)
 * - DS(/chat/handlers_theory.mjs)
 *
 * @module chat/chat_handlers
 */

import {
  handleTeach as handleTeachImpl,
  ONTOLOGY_CONFIG as ONTOLOGY_CONFIG_IMPL,
  CONTRADICTION_CONFIG as CONTRADICTION_CONFIG_IMPL,
  checkContradictions as checkContradictionsImpl,
  suggestTheoryBranch as suggestTheoryBranchImpl
} from './handlers_teach.mjs';
import {
  handleAsk as handleAskImpl,
  generateResponse as generateResponseImpl
} from './handlers_ask.mjs';
import {
  handleImport as handleImportImpl,
  handleTheoryManagement as handleTheoryManagementImpl,
  handleList as handleListImpl,
  handleHelp as handleHelpImpl
} from './handlers_theory.mjs';

export const ONTOLOGY_CONFIG = ONTOLOGY_CONFIG_IMPL;
export const CONTRADICTION_CONFIG = CONTRADICTION_CONFIG_IMPL;

/**
 * Public handler: teach new facts from NL.
 */
export async function handleTeach(ctx, message, details) {
  return handleTeachImpl(ctx, message, details);
}

/**
 * Public handler: answer questions using inference engine.
 * Injects ontology config into the handler context.
 */
export async function handleAsk(ctx, message, details) {
  const extendedCtx = { ...ctx, ontologyConfig: ONTOLOGY_CONFIG_IMPL };
  return handleAskImpl(extendedCtx, message, details);
}

/**
 * Public handler: import facts from files.
 */
export async function handleImport(ctx, message, details) {
  return handleImportImpl(ctx, message, details);
}

/**
 * Public handler: manage theory branches.
 */
export async function handleTheoryManagement(ctx, message, details) {
  return handleTheoryManagementImpl(ctx, message, details);
}

/**
 * Public handler: list facts, concepts, or theories.
 */
export async function handleList(ctx, details) {
  return handleListImpl(ctx, details);
}

/**
 * Public handler: chat help text.
 */
export function handleHelp() {
  return handleHelpImpl();
}

/**
 * Re-export helpers for callers that used to import them from here.
 */
export async function checkContradictions(ctx, newFacts) {
  return checkContradictionsImpl(ctx, newFacts);
}

export async function suggestTheoryBranch(ctx, facts, contradictions) {
  return suggestTheoryBranchImpl(ctx, facts, contradictions);
}

export async function generateResponse(ctx, result, originalQuestion) {
  return generateResponseImpl(ctx, result, originalQuestion);
}

