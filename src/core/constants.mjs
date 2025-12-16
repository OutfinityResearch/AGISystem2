/**
 * AGISystem2 - Core Constants
 * @module core/constants
 */

// Default geometry (vector dimension in bits)
export const DEFAULT_GEOMETRY = 32768;

// Position vector count
export const MAX_POSITIONS = 20;

// Legacy similarity thresholds (use REASONING_THRESHOLDS for new code)
export const SIMILARITY_THRESHOLD = 0.5;
export const STRONG_CONFIDENCE = 0.65;
export const ORTHOGONAL_THRESHOLD = 0.55;

/**
 * Strategy-dependent reasoning thresholds
 *
 * Dense-binary: Higher similarities (0.5-0.8) due to dense bit patterns
 * Sparse-polynomial: Lower similarities (0.05-0.2) due to sparse structure
 *
 * Each strategy has different optimal thresholds for:
 * - SIMILARITY: Minimum similarity to consider a match
 * - HDC_MATCH: Minimum similarity for HDC Master Equation results
 * - VERIFICATION: Minimum similarity for solution verification
 * - ANALOGY: Minimum similarity for analogical reasoning
 * - RULE_MATCH: Similarity for rule-based matches
 * - TRANSITIVE_BASE: Base confidence for transitive chains
 * - TRANSITIVE_DECAY: Decay factor per step in transitive chains
 * - CONFIDENCE_DECAY: General confidence decay for derived results
 * - DIRECT_MATCH: Confidence for direct KB matches
 * - INDUCTION_MIN: Minimum confidence for inductive reasoning
 * - ANALOGY_DISCOUNT: Discount factor for analogical results
 */
export const REASONING_THRESHOLDS = {
  'dense-binary': {
    // Similarity thresholds
    SIMILARITY: 0.5,
    HDC_MATCH: 0.5,
    VERIFICATION: 0.4,
    ANALOGY_MIN: 0.6,
    ANALOGY_MAX: 0.95,
    RULE_MATCH: 0.85,
    CONCLUSION_MATCH: 0.7,

    // Confidence values
    DIRECT_MATCH: 0.95,
    TRANSITIVE_BASE: 0.9,
    TRANSITIVE_DECAY: 0.98,
    TRANSITIVE_DEPTH_DECAY: 0.05,
    CONFIDENCE_DECAY: 0.95,
    RULE_CONFIDENCE: 0.85,
    CONDITION_CONFIDENCE: 0.9,
    DISJOINT_CONFIDENCE: 0.95,
    DEFAULT_CONFIDENCE: 0.8,

    // Induction thresholds
    INDUCTION_MIN: 0.6,
    INDUCTION_PATTERN: 0.5,

    // Scoring
    ANALOGY_DISCOUNT: 0.7,
    ABDUCTION_SCORE: 0.7,
    STRONG_MATCH: 0.55,
    VERY_STRONG_MATCH: 0.7
  },

  'sparse-polynomial': {
    // Similarity thresholds - much lower for sparse vectors
    SIMILARITY: 0.05,
    HDC_MATCH: 0.02,
    VERIFICATION: 0.02,
    ANALOGY_MIN: 0.03,
    ANALOGY_MAX: 0.5,
    RULE_MATCH: 0.1,
    CONCLUSION_MATCH: 0.05,

    // Confidence values - similar to dense-binary (logical confidence)
    DIRECT_MATCH: 0.95,
    TRANSITIVE_BASE: 0.9,
    TRANSITIVE_DECAY: 0.98,
    TRANSITIVE_DEPTH_DECAY: 0.05,
    CONFIDENCE_DECAY: 0.95,
    RULE_CONFIDENCE: 0.85,
    CONDITION_CONFIDENCE: 0.9,
    DISJOINT_CONFIDENCE: 0.95,
    DEFAULT_CONFIDENCE: 0.8,

    // Induction thresholds
    INDUCTION_MIN: 0.3,
    INDUCTION_PATTERN: 0.3,

    // Scoring
    ANALOGY_DISCOUNT: 0.7,
    ABDUCTION_SCORE: 0.7,
    STRONG_MATCH: 0.03,
    VERY_STRONG_MATCH: 0.05
  }
};

/**
 * Get thresholds for a specific strategy
 * @param {string} strategy - 'dense-binary' or 'sparse-polynomial'
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
 * These control HDC-first reasoning behavior:
 * - UNBIND_MIN_SIMILARITY: Minimum similarity for HDC unbind candidates
 * - UNBIND_MAX_CANDIDATES: Maximum candidates to validate symbolically
 * - CSP_HEURISTIC_WEIGHT: Weight for HDC similarity in CSP domain ordering
 * - VALIDATION_REQUIRED: Always validate HDC results with symbolic
 * - FALLBACK_TO_SYMBOLIC: Fall back to symbolic if HDC fails
 */
export const HOLOGRAPHIC_THRESHOLDS = {
  'dense-binary': {
    UNBIND_MIN_SIMILARITY: 0.4,
    UNBIND_MAX_CANDIDATES: 10,
    CSP_HEURISTIC_WEIGHT: 0.7,
    VALIDATION_REQUIRED: true,
    FALLBACK_TO_SYMBOLIC: true
  },
  'sparse-polynomial': {
    UNBIND_MIN_SIMILARITY: 0.02,
    UNBIND_MAX_CANDIDATES: 10,
    CSP_HEURISTIC_WEIGHT: 0.7,
    VALIDATION_REQUIRED: true,
    FALLBACK_TO_SYMBOLIC: true
  }
};

/**
 * Get holographic thresholds for a specific strategy
 * @param {string} strategy - 'dense-binary' or 'sparse-polynomial'
 * @returns {object} Holographic thresholds object
 */
export function getHolographicThresholds(strategy = 'dense-binary') {
  return HOLOGRAPHIC_THRESHOLDS[strategy] || HOLOGRAPHIC_THRESHOLDS['dense-binary'];
}

// Query limits
export const MAX_HOLES = 3;
export const TOP_K_DEFAULT = 5;

// Proof limits
export const MAX_PROOF_DEPTH = 50;  // Support deep chains up to 50 steps
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
  'macro',
  'begin',
  'end',
  'return',
  'solve'
  // Note: 'from', 'noConflict', 'allDifferent' are handled contextually in parseSolveBlock
  // to avoid conflicts with identifier parsing (e.g., macro parameter names)
];
