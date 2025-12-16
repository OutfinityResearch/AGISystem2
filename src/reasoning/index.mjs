/**
 * AGISystem2 - Reasoning Module Exports
 * @module reasoning
 *
 * Core reasoning capabilities:
 * - QueryEngine: KB search with hole filling
 * - ProofEngine: Goal-directed backward chaining
 * - AbductionEngine: "Best explanation" reasoning
 * - InductionEngine: Pattern generalization and rule learning
 */

export { QueryEngine } from './query.mjs';
export { ProofEngine } from './prove.mjs';
export { AbductionEngine } from './abduction.mjs';
export { InductionEngine } from './induction.mjs';
