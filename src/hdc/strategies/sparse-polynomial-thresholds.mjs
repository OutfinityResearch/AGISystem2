/**
 * AGISystem2 - Sparse Polynomial Strategy Thresholds
 * @module hdc/strategies/sparse-polynomial-thresholds
 *
 * Reasoning and holographic thresholds for sparse-polynomial (SPHDC) strategy.
 * Calibrated for Jaccard similarity with baseline ~0.01
 */

/**
 * Reasoning thresholds for sparse-polynomial strategy
 *
 * Sparse polynomial vectors have:
 * - Random baseline similarity: ~0.01 (very low due to sparse structure)
 * - Good discrimination in range [0.02, 0.5]
 * - Jaccard-based similarity (set overlap)
 */
export const REASONING_THRESHOLDS = {
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
  VERY_STRONG_MATCH: 0.05,

  // Bundle/Induce meta-operators
  BUNDLE_COMMON_SCORE: 0.90
};

/**
 * Holographic mode thresholds for sparse-polynomial strategy
 *
 * Controls HDC-first reasoning behavior
 */
export const HOLOGRAPHIC_THRESHOLDS = {
  UNBIND_MIN_SIMILARITY: 0.02,
  UNBIND_MAX_CANDIDATES: 10,
  CSP_HEURISTIC_WEIGHT: 0.7,
  VALIDATION_REQUIRED: true,
  FALLBACK_TO_SYMBOLIC: true
};

export default {
  REASONING_THRESHOLDS,
  HOLOGRAPHIC_THRESHOLDS
};
