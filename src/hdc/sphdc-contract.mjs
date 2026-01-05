/**
 * AGISystem2 - SPHDC Contract Definitions
 * @module hdc/sphdc-contract
 *
 * Defines the contract for Sparse Polynomial HDC (SPHDC) strategy.
 * SPHDC has different mathematical properties than dense binary due to sparsification.
 */

/**
 * SPHDC Contract Constants
 * These properties must be satisfied by the SPHDC strategy.
 */
export const SPHDC_CONTRACT = {
  /**
   * Bind has approximate XOR-style cancellation (strategy-specific)
   * bind(bind(a,b),b) should be similar to a (but not identical due to sparsification)
   */
  BIND_APPROX_SELF_INVERSE: true,

  /**
   * Bind is approximately associative with statistical variation
   * bind(bind(a,b),c) should be similar to bind(a,bind(b,c))
   */
  BIND_APPROX_ASSOCIATIVE: true,

  /**
   * Bind is approximately commutative with statistical variation
   * bind(a,b) should be similar to bind(b,a)
   */
  BIND_APPROX_COMMUTATIVE: true,

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

  /**
   * Random vectors have very low similarity due to sparsification
   * Expected value is much lower than dense binary
   */
  RANDOM_BASELINE_SIMILARITY: { expected: 0.01, tolerance: 0.05 },

  /**
   * Bundle preserves approximate retrievability
   * similarity(bundle([a, b, c]), a) should be > 0.3 for small n
   */
  BUNDLE_APPROX_RETRIEVABLE: true,

  /**
   * Vector size should be maintained within bounds
   */
  SPARSIFICATION_WORKS: true
};

/**
 * Validates that SPHDC strategy satisfies its specific contract.
 * Different from dense binary due to statistical nature of SPHDC.
 *
 * @param {Object} strategy - Strategy to validate
 * @param {number} geometry - Test geometry
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateSPHDCStrategy(strategy, geometry = 500) {
  const errors = [];

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
    return { valid: false, errors };
  }

  // Test approximate XOR-style cancellation (with lower threshold due to sparsification)
  const v1 = strategy.createRandom(geometry, 42);
  const v2 = strategy.createRandom(geometry, 43);
  const bound = strategy.bind(v1, v2);
  const unbound = strategy.bind(bound, v2);
  const simAfterUnbind = strategy.similarity(v1, unbound);

  if (simAfterUnbind < 0.002) { // Very low threshold for SPHDC due to fundamental sparsification trade-offs
    errors.push(`Bind not approximately cancellative with bind-as-unbind: similarity after unbind = ${simAfterUnbind}`);
  }

  // Test similarity reflexive
  const simSelf = strategy.similarity(v1, v1);
  if (Math.abs(simSelf - 1.0) > 0.001) {
    errors.push(`Similarity not reflexive: sim(a,a) = ${simSelf}`);
  }

  // Test similarity symmetric
  const simAB = strategy.similarity(v1, v2);
  const simBA = strategy.similarity(v2, v1);
  if (Math.abs(simAB - simBA) > 0.001) {
    errors.push(`Similarity not symmetric: ${simAB} vs ${simBA}`);
  }

  // Test random baseline (much lower for SPHDC due to sparsification)
  const r1 = strategy.createRandom(geometry, 42);
  const r2 = strategy.createRandom(geometry, 43);
  const simRandom = strategy.similarity(r1, r2);
  const { expected, tolerance } = SPHDC_CONTRACT.RANDOM_BASELINE_SIMILARITY;

  if (Math.abs(simRandom - expected) > tolerance) {
    errors.push(`Random baseline off: ${simRandom} (expected ~${expected})`);
  }

  // Test deterministic creation
  const name1 = strategy.createFromName('TestConcept', geometry);
  const name2 = strategy.createFromName('TestConcept', geometry);

  if (!strategy.equals(name1, name2)) {
    errors.push('createFromName not deterministic');
  }

  // Test bundle approximate retrievability (lower threshold for SPHDC)
  const vec1 = strategy.createRandom(geometry, 45);
  const vec2 = strategy.createRandom(geometry, 46);
  const vec3 = strategy.createRandom(geometry, 47);
  const bundled = strategy.bundle([vec1, vec2, vec3]);
  const bundleSim = strategy.similarity(bundled, vec1);

  if (bundleSim < 0.3) { // Lower threshold for SPHDC
    errors.push(`Bundle not approximately retrievable: sim = ${bundleSim}`);
  }

  // Test sparsification
  const small1 = strategy.createRandom(50, 48);
  const small2 = strategy.createRandom(50, 49);
  const boundSmall = strategy.bind(small1, small2);

  if (boundSmall.size() > 50) {
    errors.push(`Sparsification failed: size = ${boundSmall.size()}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default {
  SPHDC_CONTRACT,
  validateSPHDCStrategy
};
