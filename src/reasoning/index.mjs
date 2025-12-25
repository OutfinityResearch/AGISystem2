/**
 * AGISystem2 - Reasoning Module Exports
 * @module reasoning
 *
 * Core reasoning capabilities:
 * - QueryEngine: KB search with hole filling
 * - ProofEngine: Goal-directed backward chaining
 * - AbductionEngine: "Best explanation" reasoning
 * - InductionEngine: Pattern generalization and rule learning
 * - ForwardChainEngine: Level-ordered forward chaining
 *
 * Reasoning Priority Modes:
 * - symbolicPriority (default): Symbolic reasoning first, HDC for storage
 * - holographicPriority: HDC operations first, symbolic for validation
 *
 * Optimizations:
 * - Constructivist Level: Hierarchical concept ordering for search pruning
 */

import { isHolographicPriority, getReasoningPriority, REASONING_PRIORITY } from '../core/constants.mjs';

// Import engines for local use AND re-export
import { QueryEngine } from './query.mjs';
import { ProofEngine } from './prove.mjs';
import { AbductionEngine } from './abduction.mjs';
import { InductionEngine } from './induction.mjs';
import { HolographicQueryEngine } from './holographic/query-hdc-first.mjs';
import { HolographicProofEngine } from './holographic/prove-hdc-first.mjs';
import { HolographicCSPSolver, buildConstraintSatisfaction, scoreCandidate, orderDomainByHDC } from './holographic/csp-hdc-heuristic.mjs';
import { CSPSolver, solveWeddingSeating } from './csp/solver.mjs';

// Constructivist Level Optimization
import { LevelManager, computeConstructivistLevel, computeGoalLevel, computeRuleLevels, extractDependencies } from './constructivist-level.mjs';
import { ForwardChainEngine, createForwardChainEngine } from './forward-chain.mjs';

// Re-export all engines
export { QueryEngine, ProofEngine, AbductionEngine, InductionEngine };
export { HolographicQueryEngine, HolographicProofEngine };
export { HolographicCSPSolver, buildConstraintSatisfaction, scoreCandidate, orderDomainByHDC };
export { CSPSolver, solveWeddingSeating };

// Export constructivist level optimization
export { LevelManager, computeConstructivistLevel, computeGoalLevel, computeRuleLevels, extractDependencies };
export { ForwardChainEngine, createForwardChainEngine };

/**
 * Check if session or global config uses holographic priority
 * Session option takes precedence over environment variable
 * @param {Session} session - Session instance (optional)
 * @returns {boolean}
 */
function sessionIsHolographic(session) {
  // Session option takes precedence
  if (session?.reasoningPriority === 'holographicPriority') {
    return true;
  }
  if (session?.reasoningPriority === 'symbolicPriority') {
    return false;
  }
  // Fall back to global (env var) setting
  return isHolographicPriority();
}

/**
 * Create query engine based on reasoning priority
 * Uses static imports already loaded above (ESM compatible)
 * @param {Session} session - Session instance
 * @returns {QueryEngine|HolographicQueryEngine}
 */
export function createQueryEngine(session) {
  if (sessionIsHolographic(session)) {
    return new HolographicQueryEngine(session);
  }
  return new QueryEngine(session);
}

/**
 * Create proof engine based on reasoning priority
 * Uses static imports already loaded above (ESM compatible)
 * @param {Session} session - Session instance
 * @param {Object} options - Proof options
 * @returns {ProofEngine|HolographicProofEngine}
 */
export function createProofEngine(session, options = {}) {
  if (sessionIsHolographic(session)) {
    return new HolographicProofEngine(session, options);
  }
  return new ProofEngine(session, options);
}

/**
 * Create CSP solver based on reasoning priority
 * Uses static imports already loaded above (ESM compatible)
 * @param {Session} session - Session instance
 * @param {Object} options - Solver options
 * @returns {CSPSolver|HolographicCSPSolver}
 */
export function createCSPSolver(session, options = {}) {
  if (sessionIsHolographic(session)) {
    return new HolographicCSPSolver(session, options);
  }
  return new CSPSolver(session, options);
}

/**
 * Get current reasoning priority mode
 * @returns {string} 'symbolicPriority' or 'holographicPriority'
 */
export { getReasoningPriority, isHolographicPriority, REASONING_PRIORITY };
