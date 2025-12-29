/**
 * AGISystem2 - EXACT Strategy Thresholds
 * @module hdc/strategies/exact-thresholds
 *
 * Thresholds for DS25 EXACT (Exact-Sparse Bitset Polynomial).
 *
 * Similarity in EXACT is "max monomial similarity" and exact matches often score 1.0,
 * while unrelated candidates typically score ~0.0.
 */

export const REASONING_THRESHOLDS = {
  // Similarity thresholds (EXACT matches are usually 1.0)
  SIMILARITY: 0.99,
  HDC_MATCH: 0.99,
  HDC_MATCH_HIGH: 0.999,
  VERIFICATION: 0.99,
  ANALOGY_MIN: 0.9,
  ANALOGY_MAX: 1.0,
  RULE_MATCH: 0.99,
  CONCLUSION_MATCH: 0.99,

  // Confidence values (logical confidence; keep consistent defaults)
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
  INDUCTION_MIN: 0.9,
  INDUCTION_PATTERN: 0.9,

  // Scoring
  ANALOGY_DISCOUNT: 0.7,
  ABDUCTION_SCORE: 0.7,
  STRONG_MATCH: 0.99,
  VERY_STRONG_MATCH: 0.999,

  // Bundle/Induce meta-operators
  BUNDLE_COMMON_SCORE: 0.90
};

export const HOLOGRAPHIC_THRESHOLDS = {
  // EXACT unbind is structural, not noisy; keep permissive gates.
  UNBIND_MIN_SIMILARITY: 0.0,
  UNBIND_MAX_CANDIDATES: 25,
  CSP_HEURISTIC_WEIGHT: 0.7,
  VALIDATION_REQUIRED: true,
  FALLBACK_TO_SYMBOLIC: true
};

export default { REASONING_THRESHOLDS, HOLOGRAPHIC_THRESHOLDS };

