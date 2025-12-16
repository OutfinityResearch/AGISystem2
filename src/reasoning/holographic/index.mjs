/**
 * AGISystem2 - Holographic Priority Mode
 * @module reasoning/holographic
 *
 * HDC-first reasoning with symbolic validation.
 * This module provides alternative implementations that prioritize
 * HDC operations (unbind, similarity) with symbolic validation fallback.
 *
 * Same interfaces as symbolic counterparts - drop-in replacement.
 */

export { HolographicQueryEngine } from './query-hdc-first.mjs';
export { HolographicProofEngine } from './prove-hdc-first.mjs';
export { HolographicCSPSolver, buildConstraintSatisfaction, scoreCandidate, orderDomainByHDC } from './csp-hdc-heuristic.mjs';
