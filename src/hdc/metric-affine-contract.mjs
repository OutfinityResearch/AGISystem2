/**
 * AGISystem2 - Metric-Affine Contract Definitions
 * @module hdc/metric-affine-contract
 *
 * Defines the contract for Metric-Affine HDC strategy.
 * Metric-Affine has different mathematical properties than dense binary:
 * - Baseline similarity ~0.67 (not 0.5)
 * - Continuous values [0, 255] (not binary)
 * - L1 distance metric (not Hamming)
 */

/**
 * Metric-Affine Contract Constants
 * These properties must be satisfied by the metric-affine strategy.
 */
export const METRIC_AFFINE_CONTRACT = {
  /**
   * Bind has exact XOR-style cancellation (strategy-specific)
   * bind(bind(a,b),b) = a exactly
   */
  BIND_SELF_INVERSE: true,

  /**
   * Bind is associative
   * bind(bind(a,b),c) = bind(a,bind(b,c))
   */
  BIND_ASSOCIATIVE: true,

  /**
   * Bind is commutative
   * bind(a,b) = bind(b,a)
   */
  BIND_COMMUTATIVE: true,

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
   * Random vectors have higher baseline similarity (~0.67) due to L1 metric
   * This is mathematically derived from uniform distribution over [0, 255]
   */
  RANDOM_BASELINE_SIMILARITY: { expected: 0.67, tolerance: 0.05 },

  /**
   * Bundle preserves retrievability
   * similarity(bundle([a, b, c]), a) should be > baseline for small n
   */
  BUNDLE_RETRIEVABLE: true,

  /**
   * Geometry (number of byte channels)
   * Default is 32 (32 bytes = 256 bits)
   */
  DEFAULT_GEOMETRY: 32
};

/**
 * Validates that metric-affine strategy satisfies its specific contract.
 *
 * @param {Object} strategy - Strategy to validate
 * @param {number} geometry - Test geometry (number of byte channels, default 32)
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validateMetricAffineStrategy(strategy, geometry = 32) {
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

  // Test exact XOR-style cancellation (XOR preserves this property)
  const v1 = strategy.createRandom(geometry, 42);
  const v2 = strategy.createRandom(geometry, 43);
  const bound = strategy.bind(v1, v2);
  const unbound = strategy.bind(bound, v2);
  const simAfterUnbind = strategy.similarity(v1, unbound);

  if (simAfterUnbind < 0.999) {
    errors.push(`Bind not cancellative with bind-as-unbind: similarity after unbind = ${simAfterUnbind} (expected 1.0)`);
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

  // Test similarity range
  const simMax = strategy.similarity(v1, v1);
  const simMin = strategy.similarity(v1, strategy.createZero(geometry));

  if (simMax > 1.0 || simMin < 0.0) {
    errors.push(`Similarity out of range: [${simMin}, ${simMax}]`);
  }

  // Test random baseline (should be ~0.67 for metric-affine)
  const numSamples = 20;
  let totalSim = 0;
  for (let i = 0; i < numSamples; i++) {
    const r1 = strategy.createRandom(geometry, i * 2);
    const r2 = strategy.createRandom(geometry, i * 2 + 1);
    totalSim += strategy.similarity(r1, r2);
  }
  const avgRandomSim = totalSim / numSamples;
  const { expected, tolerance } = METRIC_AFFINE_CONTRACT.RANDOM_BASELINE_SIMILARITY;

  if (Math.abs(avgRandomSim - expected) > tolerance) {
    errors.push(`Random baseline off: ${avgRandomSim.toFixed(4)} (expected ~${expected})`);
  }

  // Test deterministic creation
  const name1 = strategy.createFromName('TestConcept', geometry);
  const name2 = strategy.createFromName('TestConcept', geometry);

  if (!strategy.equals(name1, name2)) {
    errors.push('createFromName not deterministic');
  }

  // Test bundle retrievability
  const vec1 = strategy.createRandom(geometry, 100);
  const vec2 = strategy.createRandom(geometry, 101);
  const vec3 = strategy.createRandom(geometry, 102);
  const bundled = strategy.bundle([vec1, vec2, vec3]);
  const bundleSim = strategy.similarity(bundled, vec1);

  if (bundleSim <= expected) {
    warnings.push(`Bundle may not be well retrievable: sim = ${bundleSim.toFixed(4)} (should be > ${expected})`);
  }

  // Test associativity
  const a = strategy.createRandom(geometry, 200);
  const b = strategy.createRandom(geometry, 201);
  const c = strategy.createRandom(geometry, 202);

  const ab_c = strategy.bind(strategy.bind(a, b), c);
  const a_bc = strategy.bind(a, strategy.bind(b, c));

  if (!strategy.equals(ab_c, a_bc)) {
    errors.push('Bind is not associative');
  }

  // Test commutativity
  const ab = strategy.bind(a, b);
  const ba = strategy.bind(b, a);

  if (!strategy.equals(ab, ba)) {
    errors.push('Bind is not commutative');
  }

  // Test zero vector behavior
  const zero = strategy.createZero(geometry);
  const aBindZero = strategy.bind(a, zero);

  if (!strategy.equals(a, aBindZero)) {
    errors.push('Zero is not identity for bind');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Run comprehensive validation with detailed output
 *
 * @param {Object} strategy - Strategy to validate
 * @param {number} geometry - Test geometry
 * @returns {Object} Detailed validation results
 */
export function runMetricAffineValidation(strategy, geometry = 32) {
  const results = validateMetricAffineStrategy(strategy, geometry);

  return {
    ...results,
    contractName: 'METRIC_AFFINE_CONTRACT',
    strategy: strategy.id || 'unknown',
    geometry,
    summary: results.valid
      ? 'Metric-Affine contract satisfied'
      : `Contract violated: ${results.errors.length} errors`
  };
}

export default {
  METRIC_AFFINE_CONTRACT,
  validateMetricAffineStrategy,
  runMetricAffineValidation
};
