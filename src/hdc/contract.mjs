/**
 * AGISystem2 - HDC Contract Definitions
 * @module hdc/contract
 *
 * Defines the contract (interface) that all HDC strategies must satisfy.
 * Uses JSDoc for type definitions since we're in pure JavaScript.
 */

/**
 * @typedef {Object} SemanticVector
 * @property {number} geometry - Vector dimension (number of bits/elements)
 * @property {number} words - Number of 32-bit words (for dense binary)
 * @property {*} data - Strategy-specific internal data representation
 * @property {string} [strategyId] - Identifier of the strategy that created this vector
 */

/**
 * @typedef {Object} SerializedVector
 * @property {string} strategyId - Strategy identifier for deserialization
 * @property {number} geometry - Vector dimension
 * @property {number} version - Format version for backward compat
 * @property {*} data - Strategy-specific serialized data
 */

/**
 * @typedef {Object} SimilarityResult
 * @property {string} name - Name of the matched vector
 * @property {number} similarity - Similarity score (0-1)
 */

/**
 * @typedef {Object} HDCStrategyProperties
 * @property {string} id - Strategy identifier (e.g., 'dense-binary')
 * @property {string} displayName - Human-readable name
 * @property {number} recommendedBundleCapacity - Optimal number of vectors to bundle
 * @property {number} maxBundleCapacity - Max before accuracy drops below 55%
 * @property {function(number): number} bytesPerVector - Memory estimate function
 * @property {string} bindComplexity - Big-O complexity of bind operation
 * @property {boolean} sparseOptimized - Whether strategy benefits from sparse data
 * @property {string} description - Strategy description
 */

/**
 * @typedef {Object} HDCStrategy
 * @property {string} id - Strategy identifier
 * @property {HDCStrategyProperties} properties - Non-functional properties
 *
 * Factory Methods:
 * @property {function(number): SemanticVector} createZero - Create zero vector
 * @property {function(number, number=): SemanticVector} createRandom - Create random vector
 * @property {function(string, number): SemanticVector} createFromName - Create deterministic vector
 * @property {function(SerializedVector): SemanticVector} deserialize - Restore from serialized
 *
 * Core Operations:
 * @property {function(SemanticVector, SemanticVector): SemanticVector} bind - Bind two vectors (XOR)
 * @property {function(...SemanticVector): SemanticVector} bindAll - Bind multiple vectors
 * @property {function(SemanticVector[], SemanticVector=): SemanticVector} bundle - Superposition
 * @property {function(SemanticVector, SemanticVector): number} similarity - Similarity measure
 * @property {function(SemanticVector, SemanticVector): SemanticVector} unbind - Inverse of bind
 *
 * Utility Operations:
 * @property {function(SemanticVector): SemanticVector} clone - Deep copy
 * @property {function(SemanticVector, SemanticVector): boolean} equals - Exact equality
 * @property {function(SemanticVector, Map<string,SemanticVector>, number): SimilarityResult[]} topKSimilar
 * @property {function(SemanticVector): SerializedVector} serialize - Export for storage
 */

/**
 * HDC Contract Constants
 * These properties must be satisfied by ALL valid HDC strategies.
 */
export const HDC_CONTRACT = {
  /**
   * Similarity is reflexive: similarity(v, v) = 1.0
   */
  SIMILARITY_REFLEXIVE: true,

  /**
   * Similarity is symmetric: similarity(a, b) = similarity(b, a)
   */
  SIMILARITY_SYMMETRIC: true,

  /**
   * Similarity range: [0, 1]
   */
  SIMILARITY_RANGE: [0, 1],
};

/**
 * Validates that a strategy satisfies the HDC contract.
 * Used in tests to verify custom strategies.
 *
 * @param {HDCStrategy} strategy - Strategy to validate
 * @param {number} geometry - Test geometry
 * @param {Object} [options]
 * @param {boolean} [options.expectSelfInverse] - Validate `unbind(bind(a,b), b) ≈ a` (XOR-like strategies)
 * @param {{expected:number, tolerance:number}} [options.expectRandomBaseline] - Validate similarity(random, random) baseline
 * @param {{min:number}} [options.expectBundleRetrievable] - Validate sim(bundle([a,b,c]), a) >= min
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validateStrategy(strategy, geometry = 2048, options = {}) {
  const errors = [];
  const warnings = [];

  // Check required methods exist
  const requiredMethods = [
    'createZero', 'createRandom', 'createFromName',
    'bind', 'bindAll', 'bundle', 'similarity', 'unbind',
    'clone', 'equals', 'serialize', 'deserialize'
  ];

  for (const method of requiredMethods) {
    if (typeof strategy[method] !== 'function') {
      errors.push(`Missing required method: ${method}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  const a = strategy.createRandom(geometry);
  const b = strategy.createRandom(geometry);

  // Test similarity reflexive
  const simSelf = strategy.similarity(a, a);
  if (Math.abs(simSelf - 1.0) > 0.001) {
    errors.push(`Similarity not reflexive: sim(a,a) = ${simSelf}`);
  }

  // Test similarity symmetric
  const simAB = strategy.similarity(a, b);
  const simBA = strategy.similarity(b, a);
  if (Math.abs(simAB - simBA) > 0.001) {
    errors.push(`Similarity not symmetric: ${simAB} vs ${simBA}`);
  }

  // Test similarity range for basic samples
  const range = HDC_CONTRACT.SIMILARITY_RANGE;
  for (const s of [simSelf, simAB]) {
    if (!(s >= range[0] && s <= range[1])) {
      errors.push(`Similarity out of range [${range[0]}, ${range[1]}]: ${s}`);
      break;
    }
  }

  // Test deterministic creation
  const name1 = strategy.createFromName('TestConcept', geometry);
  const name2 = strategy.createFromName('TestConcept', geometry);
  if (!strategy.equals(name1, name2)) {
    errors.push('createFromName not deterministic');
  }

  // Optional: self-inverse / XOR-like cancellation
  if (options?.expectSelfInverse) {
    const bound = strategy.bind(a, b);
    const unbound = strategy.unbind(bound, b);
    const simAfterUnbind = strategy.similarity(a, unbound);
    if (simAfterUnbind < 0.99) {
      errors.push(`Unbind not cancellative: similarity after unbind = ${simAfterUnbind}`);
    }
  }

  // Optional: random baseline (strategy-specific; not universal)
  if (options?.expectRandomBaseline) {
    const r1 = strategy.createRandom(geometry);
    const r2 = strategy.createRandom(geometry);
    const simRandom = strategy.similarity(r1, r2);
    const expected = Number(options.expectRandomBaseline.expected);
    const tolerance = Number(options.expectRandomBaseline.tolerance);
    if (!Number.isFinite(expected) || !Number.isFinite(tolerance)) {
      warnings.push('expectRandomBaseline provided but expected/tolerance are not finite numbers');
    } else if (Math.abs(simRandom - expected) > tolerance) {
      errors.push(`Random baseline off: ${simRandom} (expected ~${expected} ± ${tolerance})`);
    }
  }

  // Optional: bundle retrievability (strategy-specific)
  if (options?.expectBundleRetrievable) {
    const v1 = strategy.createRandom(geometry);
    const v2 = strategy.createRandom(geometry);
    const v3 = strategy.createRandom(geometry);
    const bundled = strategy.bundle([v1, v2, v3]);
    const bundleSim = strategy.similarity(bundled, v1);
    const min = Number(options.expectBundleRetrievable.min);
    if (!Number.isFinite(min)) {
      warnings.push('expectBundleRetrievable provided but min is not a finite number');
    } else if (bundleSim < min) {
      errors.push(`Bundle not retrievable: sim = ${bundleSim} (min ${min})`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export default {
  HDC_CONTRACT,
  validateStrategy
};
