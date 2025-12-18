/**
 * AGISystem2 - Dense Binary Strategy Thresholds
 * @module hdc/strategies/dense-binary-thresholds
 *
 * Reasoning and holographic thresholds for dense-binary HDC strategy.
 * Calibrated for Hamming similarity with baseline ~0.5
 */

/**
 * Reasoning thresholds for dense-binary strategy
 *
 * Dense binary vectors have:
 * - Random baseline similarity: ~0.5
 * - Good discrimination in range [0.5, 0.8]
 * - Hamming-based similarity
 */
export const REASONING_THRESHOLDS = {
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
  VERY_STRONG_MATCH: 0.7,

  // Bundle/Induce meta-operators
  BUNDLE_COMMON_SCORE: 0.90
};

/**
 * Holographic mode thresholds for dense-binary strategy
 *
 * Controls HDC-first reasoning behavior
 */
export const HOLOGRAPHIC_THRESHOLDS = {
  UNBIND_MIN_SIMILARITY: 0.4,
  UNBIND_MAX_CANDIDATES: 10,
  CSP_HEURISTIC_WEIGHT: 0.7,
  VALIDATION_REQUIRED: true,
  FALLBACK_TO_SYMBOLIC: true
};

export default {
  REASONING_THRESHOLDS,
  HOLOGRAPHIC_THRESHOLDS
};
