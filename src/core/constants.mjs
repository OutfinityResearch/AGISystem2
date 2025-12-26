/**
 * AGISystem2 - Core Constants
 * @module core/constants
 */

// Import strategy-specific thresholds from separate files
import {
  REASONING_THRESHOLDS as DENSE_BINARY_THRESHOLDS,
  HOLOGRAPHIC_THRESHOLDS as DENSE_BINARY_HOLO
} from '../hdc/strategies/dense-binary-thresholds.mjs';

import {
  REASONING_THRESHOLDS as SPARSE_POLY_THRESHOLDS,
  HOLOGRAPHIC_THRESHOLDS as SPARSE_POLY_HOLO
} from '../hdc/strategies/sparse-polynomial-thresholds.mjs';

import {
  REASONING_THRESHOLDS as METRIC_AFFINE_THRESHOLDS,
  HOLOGRAPHIC_THRESHOLDS as METRIC_AFFINE_HOLO
} from '../hdc/strategies/metric-affine.mjs';

import {
  REASONING_THRESHOLDS as METRIC_AFFINE_ELASTIC_THRESHOLDS,
  HOLOGRAPHIC_THRESHOLDS as METRIC_AFFINE_ELASTIC_HOLO
} from '../hdc/strategies/metric-affine-elastic.mjs';

// Default geometry (vector dimension in bits)
export const DEFAULT_GEOMETRY = 32768;

// Position vector count
export const MAX_POSITIONS = 20;

// Legacy similarity thresholds (use getThresholds() for new code)
export const SIMILARITY_THRESHOLD = 0.5;
export const STRONG_CONFIDENCE = 0.65;
export const ORTHOGONAL_THRESHOLD = 0.55;

/**
 * Strategy-dependent reasoning thresholds
 *
 * Thresholds are now loaded from per-strategy files:
 * - dense-binary-thresholds.mjs
 * - sparse-polynomial-thresholds.mjs
 * - metric-affine.mjs (thresholds included in strategy file)
 *
 * Each strategy has different optimal thresholds based on:
 * - Random baseline similarity
 * - Similarity metric (Hamming, Jaccard, L1)
 * - Vector representation properties
 */
export const REASONING_THRESHOLDS = {
  'dense-binary': DENSE_BINARY_THRESHOLDS,
  'sparse-polynomial': SPARSE_POLY_THRESHOLDS,
  'metric-affine': METRIC_AFFINE_THRESHOLDS,
  'metric-affine-elastic': METRIC_AFFINE_ELASTIC_THRESHOLDS
};

/**
 * Get thresholds for a specific strategy
 * @param {string} strategy - Strategy ID
 * @returns {object} Thresholds object
 */
export function getThresholds(strategy = 'dense-binary') {
  return REASONING_THRESHOLDS[strategy] || REASONING_THRESHOLDS['dense-binary'];
}

// ============================================================================
// REASONING PRIORITY MODE
// ============================================================================

/**
 * Reasoning priority modes
 *
 * symbolicPriority: Symbolic reasoning first, HDC for storage/verification (default)
 * holographicPriority: HDC operations first, symbolic for validation
 */
export const REASONING_PRIORITY = {
  SYMBOLIC: 'symbolicPriority',
  HOLOGRAPHIC: 'holographicPriority'
};

/**
 * Get current reasoning priority from environment
 * @returns {string} 'symbolicPriority' or 'holographicPriority'
 */
export function getReasoningPriority() {
  return process.env.REASONING_PRIORITY || REASONING_PRIORITY.SYMBOLIC;
}

/**
 * Check if holographic priority mode is enabled
 * @returns {boolean}
 */
export function isHolographicPriority() {
  return getReasoningPriority() === REASONING_PRIORITY.HOLOGRAPHIC;
}

/**
 * Holographic mode thresholds
 *
 * Loaded from per-strategy threshold files.
 * Controls HDC-first reasoning behavior:
 * - UNBIND_MIN_SIMILARITY: Minimum similarity for HDC unbind candidates
 * - UNBIND_MAX_CANDIDATES: Maximum candidates to validate symbolically
 * - CSP_HEURISTIC_WEIGHT: Weight for HDC similarity in CSP domain ordering
 * - VALIDATION_REQUIRED: Always validate HDC results with symbolic
 * - FALLBACK_TO_SYMBOLIC: Fall back to symbolic if HDC fails
 */
export const HOLOGRAPHIC_THRESHOLDS = {
  'dense-binary': DENSE_BINARY_HOLO,
  'sparse-polynomial': SPARSE_POLY_HOLO,
  'metric-affine': METRIC_AFFINE_HOLO,
  'metric-affine-elastic': METRIC_AFFINE_ELASTIC_HOLO
};

/**
 * Get holographic thresholds for a specific strategy
 * @param {string} strategy - Strategy ID
 * @returns {object} Holographic thresholds object
 */
export function getHolographicThresholds(strategy = 'dense-binary') {
  return HOLOGRAPHIC_THRESHOLDS[strategy] || HOLOGRAPHIC_THRESHOLDS['dense-binary'];
}

// Query limits
export const MAX_HOLES = 3;
export const TOP_K_DEFAULT = 5;

// Proof limits
export const MAX_PROOF_DEPTH = 200;  // Support deep chains up to 200 steps
export const PROOF_TIMEOUT_MS = 5000;  // 5 seconds timeout
export const MAX_REASONING_STEPS = 1000;  // Total step limit to prevent infinite loops

// Decoding limits
export const MAX_NESTING_DEPTH = 3;

// Reserved operator names
export const RESERVED_OPERATORS = [
  'Implies',
  'And',
  'Or',
  'Not',
  'ForAll',
  'Exists'
];

// Token types for lexer
export const TOKEN_TYPES = {
  AT: 'AT',
  IDENTIFIER: 'IDENTIFIER',
  HOLE: 'HOLE',
  REFERENCE: 'REFERENCE',
  NUMBER: 'NUMBER',
  STRING: 'STRING',
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  LBRACKET: 'LBRACKET',
  RBRACKET: 'RBRACKET',
  LBRACE: 'LBRACE',
  RBRACE: 'RBRACE',
  COMMA: 'COMMA',
  COLON: 'COLON',
  NEWLINE: 'NEWLINE',
  EOF: 'EOF',
  COMMENT: 'COMMENT',
  KEYWORD: 'KEYWORD'
};

// Keywords - only those with special parsing in parser.mjs
export const KEYWORDS = [
  'theory',
  'import',
  'rule',
  'graph',   // HDC point relationship graph
  'macro',   // deprecated synonym for 'graph'
  'begin',
  'end',
  'return'
];
