/**
 * AGISystem2 - Metric-Affine HDC Strategy
 * @module hdc/strategies/metric-affine
 *
 * Metric-Affine Algebra over Z₂₅₆³² (Fuzzy-Boolean Hyper-Lattice)
 *
 * Mathematical Structure:
 * - Space: Z₂₅₆³² (32 dimensions × 8 bits = 256 bytes per vector)
 * - Bind: XOR component-wise (abelian group, self-inverse)
 * - Bundle: Weighted arithmetic mean with clamp to [0,255]
 * - Metric: Manhattan L₁ distance, normalized to [0,1]
 * - Cardinality: 256³² ≈ 10⁷⁷ possible states
 *
 * Key Properties:
 * - Holographic: Information distributed across all 32 channels
 * - Graceful degradation: Losing k channels preserves relative distances
 * - Compact: 32 bytes per vector (vs 4KB dense-binary, 32B SPHDC)
 *
 * Differences from Dense-Binary:
 * - Continuous values [0,255] instead of binary [0,1]
 * - L1 distance instead of Hamming distance
 * - Higher baseline similarity (~0.67 vs 0.5)
 * - Fuzzy bundle behavior (mean vs majority vote)
 */

import { PRNG } from '../../util/prng.mjs';
import { djb2 } from '../../util/hash.mjs';

// ============================================================================
// CONSTANTS
// ============================================================================

const DIMENSIONS = 32;        // Number of byte channels
const MAX_BYTE = 255;         // Maximum value per channel
const BYTES_PER_VECTOR = 32;  // Total bytes per vector

// ============================================================================
// VECTOR CLASS
// ============================================================================

/**
 * Metric-Affine Vector using Uint8Array
 * 32 dimensions × 8 bits = 256 bits = 32 bytes
 */
class MetricAffineVector {
  /**
   * @param {number} geometry - Number of dimensions (default 32)
   * @param {Uint8Array} [data] - Optional pre-initialized data
   */
  constructor(geometry = DIMENSIONS, data = null) {
    this.geometry = geometry;
    this.data = data || new Uint8Array(geometry);
    this.strategyId = 'metric-affine';
  }

  /**
   * Get value at index
   * @param {number} index
   * @returns {number} Value 0-255
   */
  get(index) {
    if (index < 0 || index >= this.geometry) {
      throw new RangeError(`Index ${index} out of range [0, ${this.geometry})`);
    }
    return this.data[index];
  }

  /**
   * Set value at index
   * @param {number} index
   * @param {number} value - Value 0-255
   * @returns {MetricAffineVector}
   */
  set(index, value) {
    if (index < 0 || index >= this.geometry) {
      throw new RangeError(`Index ${index} out of range [0, ${this.geometry})`);
    }
    this.data[index] = Math.min(MAX_BYTE, Math.max(0, Math.round(value)));
    return this;
  }

  /**
   * XOR in place (for bind)
   * @param {MetricAffineVector} other
   * @returns {MetricAffineVector}
   */
  xorInPlace(other) {
    for (let i = 0; i < this.geometry; i++) {
      this.data[i] ^= other.data[i];
    }
    return this;
  }

  /**
   * Set all values to zero
   * @returns {MetricAffineVector}
   */
  zero() {
    this.data.fill(0);
    return this;
  }

  /**
   * Set all values to max (255)
   * @returns {MetricAffineVector}
   */
  max() {
    this.data.fill(MAX_BYTE);
    return this;
  }

  /**
   * Clone this vector
   * @returns {MetricAffineVector}
   */
  clone() {
    const v = new MetricAffineVector(this.geometry);
    v.data.set(this.data);
    return v;
  }

  /**
   * Check equality
   * @param {MetricAffineVector} other
   * @returns {boolean}
   */
  equals(other) {
    if (other.geometry !== this.geometry) return false;
    for (let i = 0; i < this.geometry; i++) {
      if (this.data[i] !== other.data[i]) return false;
    }
    return true;
  }

  /**
   * Compute L1 (Manhattan) distance to another vector
   * @param {MetricAffineVector} other
   * @returns {number} Sum of absolute differences
   */
  l1Distance(other) {
    let sum = 0;
    for (let i = 0; i < this.geometry; i++) {
      sum += Math.abs(this.data[i] - other.data[i]);
    }
    return sum;
  }

  /**
   * Serialize to JSON-compatible object
   * @returns {Object}
   */
  serialize() {
    return {
      strategyId: 'metric-affine',
      geometry: this.geometry,
      version: 1,
      data: Array.from(this.data)
    };
  }

  /**
   * Create random vector
   * @param {number} geometry
   * @param {function} [randomFn]
   * @returns {MetricAffineVector}
   */
  static random(geometry, randomFn = Math.random) {
    const v = new MetricAffineVector(geometry);
    for (let i = 0; i < geometry; i++) {
      v.data[i] = Math.floor(randomFn() * 256);
    }
    return v;
  }

  /**
   * Create zero vector
   * @param {number} geometry
   * @returns {MetricAffineVector}
   */
  static zeros(geometry) {
    return new MetricAffineVector(geometry);
  }

  /**
   * Deserialize from object
   * @param {Object} obj
   * @returns {MetricAffineVector}
   */
  static deserialize(obj) {
    const v = new MetricAffineVector(obj.geometry);
    v.data.set(obj.data);
    return v;
  }
}

// ============================================================================
// STRATEGY PROPERTIES
// ============================================================================

const properties = {
  id: 'metric-affine',
  displayName: 'Metric-Affine Algebra (Z₂₅₆³²)',
  defaultGeometry: DIMENSIONS,
  recommendedBundleCapacity: 50,
  maxBundleCapacity: 200,
  bytesPerVector: (geometry) => geometry,
  bindComplexity: 'O(n)',
  sparseOptimized: false,
  description: 'Fuzzy-Boolean Hyper-Lattice with L1 metric and XOR binding'
};

// ============================================================================
// THRESHOLDS (Strategy-specific)
// ============================================================================

/**
 * Reasoning thresholds for metric-affine strategy
 *
 * Metric-affine vectors have:
 * - Random baseline similarity: ~0.67 (higher than dense-binary)
 * - Good discrimination in range [0.67, 0.95]
 * - L1-based similarity normalized to [0,1]
 */
export const REASONING_THRESHOLDS = {
  // Similarity thresholds - adjusted for baseline ~0.67
  SIMILARITY: 0.67,
  HDC_MATCH: 0.72,
  VERIFICATION: 0.70,
  ANALOGY_MIN: 0.75,
  ANALOGY_MAX: 0.98,
  RULE_MATCH: 0.90,
  CONCLUSION_MATCH: 0.80,

  // Confidence values - same as other strategies (logical confidence)
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
  INDUCTION_MIN: 0.75,
  INDUCTION_PATTERN: 0.70,

  // Scoring
  ANALOGY_DISCOUNT: 0.7,
  ABDUCTION_SCORE: 0.7,
  STRONG_MATCH: 0.75,
  VERY_STRONG_MATCH: 0.85,

  // Bundle/Induce meta-operators
  BUNDLE_COMMON_SCORE: 0.90
};

/**
 * Holographic mode thresholds for metric-affine strategy
 */
export const HOLOGRAPHIC_THRESHOLDS = {
  UNBIND_MIN_SIMILARITY: 0.70,
  UNBIND_MAX_CANDIDATES: 10,
  CSP_HEURISTIC_WEIGHT: 0.7,
  VALIDATION_REQUIRED: true,
  FALLBACK_TO_SYMBOLIC: true
};

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create zero vector
 * @param {number} geometry
 * @returns {MetricAffineVector}
 */
function createZero(geometry = DIMENSIONS) {
  return new MetricAffineVector(geometry);
}

/**
 * Create random vector with uniform distribution over [0,255]
 * @param {number} geometry
 * @param {number} [seed] - Optional seed for determinism
 * @returns {MetricAffineVector}
 */
function createRandom(geometry = DIMENSIONS, seed = null) {
  const v = new MetricAffineVector(geometry);
  if (seed !== null) {
    const prng = new PRNG(seed);
    for (let i = 0; i < geometry; i++) {
      v.data[i] = prng.randomUint32() & 0xFF;
    }
  } else {
    for (let i = 0; i < geometry; i++) {
      v.data[i] = Math.floor(Math.random() * 256);
    }
  }
  return v;
}

/**
 * Create deterministic vector from name
 *
 * Algorithm:
 * 1. Hash (theoryId + name) to get seed
 * 2. Use PRNG to generate deterministic byte values
 * 3. Mix in ASCII values for recognizability
 *
 * @param {string} name - Identifier string
 * @param {number} geometry - Vector dimension
 * @param {string} [theoryId='default'] - Theory scope for isolation
 * @returns {MetricAffineVector}
 */
function createFromName(name, geometry = DIMENSIONS, theoryId = 'default') {
  const scopedName = theoryId + ':' + name;
  const seed = djb2(scopedName);
  const prng = new PRNG(seed);

  const v = new MetricAffineVector(geometry);

  // Generate bytes from PRNG
  for (let i = 0; i < geometry; i++) {
    v.data[i] = prng.randomUint32() & 0xFF;
  }

  // Mix in ASCII values from name for recognizability
  // XOR first bytes with ASCII codes of name
  for (let i = 0; i < Math.min(name.length, geometry); i++) {
    v.data[i] ^= name.charCodeAt(i) & 0xFF;
  }

  return v;
}

/**
 * Deserialize vector from storage format
 * @param {Object} serialized
 * @returns {MetricAffineVector}
 */
function deserialize(serialized) {
  if (serialized.strategyId !== 'metric-affine') {
    throw new Error(`Cannot deserialize ${serialized.strategyId} with metric-affine strategy`);
  }
  const v = new MetricAffineVector(serialized.geometry);
  v.data.set(serialized.data);
  return v;
}

// ============================================================================
// CORE OPERATIONS
// ============================================================================

/**
 * Bind two vectors using XOR
 *
 * Properties:
 * - Associative: bind(bind(a,b), c) = bind(a, bind(b,c))
 * - Commutative: bind(a,b) = bind(b,a)
 * - Self-inverse: bind(bind(a,b), b) = a
 *
 * @param {MetricAffineVector} a
 * @param {MetricAffineVector} b
 * @returns {MetricAffineVector}
 */
function bind(a, b) {
  if (a.geometry !== b.geometry) {
    throw new Error(`Geometry mismatch: ${a.geometry} vs ${b.geometry}`);
  }
  const result = clone(a);
  result.xorInPlace(b);
  return result;
}

/**
 * Bind multiple vectors together
 * @param {...MetricAffineVector} vectors
 * @returns {MetricAffineVector}
 */
function bindAll(...vectors) {
  if (vectors.length === 0) {
    throw new Error('bindAll requires at least one vector');
  }
  if (vectors.length === 1) {
    return clone(vectors[0]);
  }
  let result = clone(vectors[0]);
  for (let i = 1; i < vectors.length; i++) {
    result.xorInPlace(vectors[i]);
  }
  return result;
}

/**
 * Bundle vectors using weighted arithmetic mean
 *
 * Each dimension is averaged across all vectors, then clamped to [0,255].
 * This produces a "fuzzy superposition" where the result is similar
 * to all inputs proportionally.
 *
 * @param {MetricAffineVector[]} vectors
 * @param {MetricAffineVector} [tieBreaker] - Not used (for interface compat)
 * @returns {MetricAffineVector}
 */
function bundle(vectors, tieBreaker = null) {
  if (vectors.length === 0) {
    throw new Error('bundle requires at least one vector');
  }
  if (vectors.length === 1) {
    return clone(vectors[0]);
  }

  const geometry = vectors[0].geometry;
  const result = new MetricAffineVector(geometry);

  for (let i = 0; i < geometry; i++) {
    let sum = 0;
    for (const v of vectors) {
      if (v.geometry !== geometry) {
        throw new Error('All vectors must have same geometry');
      }
      sum += v.data[i];
    }
    // Arithmetic mean with rounding and clamping
    result.data[i] = Math.min(MAX_BYTE, Math.max(0, Math.round(sum / vectors.length)));
  }

  return result;
}

/**
 * Calculate similarity using normalized L1 (Manhattan) distance
 *
 * Formula: sim(a,b) = 1 - L1(a,b) / max_L1
 * where max_L1 = geometry * 255
 *
 * Returns value in [0, 1]:
 * - 1.0 = identical
 * - ~0.67 = random (expected for uniform distribution)
 * - 0.0 = maximally different
 *
 * @param {MetricAffineVector} a
 * @param {MetricAffineVector} b
 * @returns {number}
 */
function similarity(a, b) {
  if (a.geometry !== b.geometry) {
    throw new Error(`Geometry mismatch: ${a.geometry} vs ${b.geometry}`);
  }

  const l1 = a.l1Distance(b);
  const maxL1 = a.geometry * MAX_BYTE;

  const sim = 1 - (l1 / maxL1);
  if (sim <= 0) return 0;
  if (sim >= 1) return 1;
  return sim;
}

/**
 * Unbind (same as bind for XOR)
 * @param {MetricAffineVector} composite
 * @param {MetricAffineVector} component
 * @returns {MetricAffineVector}
 */
function unbind(composite, component) {
  return bind(composite, component);
}

// ============================================================================
// UTILITY OPERATIONS
// ============================================================================

/**
 * Clone a vector
 * @param {MetricAffineVector} v
 * @returns {MetricAffineVector}
 */
function clone(v) {
  return v.clone();
}

/**
 * Check vector equality
 * @param {MetricAffineVector} a
 * @param {MetricAffineVector} b
 * @returns {boolean}
 */
function equals(a, b) {
  return a.equals(b);
}

/**
 * Serialize vector for storage
 * @param {MetricAffineVector} v
 * @returns {Object}
 */
function serialize(v) {
  return v.serialize();
}

/**
 * Find top-K most similar vectors
 * @param {MetricAffineVector} query
 * @param {Map<string, MetricAffineVector>|Object} vocabulary
 * @param {number} k
 * @returns {Array<{name: string, similarity: number}>}
 */
 function topKSimilar(query, vocabulary, k = 5, session = null) {
  const results = [];

  const entries = vocabulary instanceof Map
    ? vocabulary.entries()
    : Object.entries(vocabulary);

  for (const [name, vec] of entries) {
    if (session?.reasoningStats) session.reasoningStats.similarityChecks++;
    const sim = similarity(query, vec);
    results.push({ name, similarity: sim });
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, k);
}

/**
 * Calculate distance (1 - similarity)
 * @param {MetricAffineVector} a
 * @param {MetricAffineVector} b
 * @returns {number}
 */
function distance(a, b) {
  return 1 - similarity(a, b);
}

/**
 * Check if vectors are approximately orthogonal
 * For metric-affine, "orthogonal" means similarity near baseline (~0.67)
 * @param {MetricAffineVector} a
 * @param {MetricAffineVector} b
 * @param {number} threshold - Tolerance around baseline
 * @returns {boolean}
 */
function isOrthogonal(a, b, threshold = 0.05) {
  const sim = similarity(a, b);
  const baseline = 0.67;  // Expected random similarity
  return Math.abs(sim - baseline) < threshold;
}

// ============================================================================
// KB SERIALIZATION
// ============================================================================

/**
 * Serialize a knowledge base for persistence
 * @param {Array<{vector: MetricAffineVector, name?: string, metadata?: Object}>} facts
 * @returns {Object}
 */
function serializeKB(facts) {
  if (!facts || facts.length === 0) {
    return {
      strategyId: 'metric-affine',
      version: 1,
      geometry: 0,
      count: 0,
      facts: []
    };
  }

  const geometry = facts[0].vector.geometry;

  return {
    strategyId: 'metric-affine',
    version: 1,
    geometry,
    count: facts.length,
    facts: facts.map(f => ({
      data: Array.from(f.vector.data),
      name: f.name || null,
      metadata: f.metadata || null
    }))
  };
}

/**
 * Deserialize a knowledge base from storage
 * @param {Object} serialized
 * @returns {Array<{vector: MetricAffineVector, name?: string, metadata?: Object}>}
 */
function deserializeKB(serialized) {
  if (!serialized || !serialized.facts || serialized.count === 0) {
    return [];
  }

  const geometry = serialized.geometry;

  return serialized.facts.map(f => ({
    vector: deserialize({
      strategyId: serialized.strategyId,
      geometry,
      data: f.data
    }),
    name: f.name,
    metadata: f.metadata
  }));
}

// ============================================================================
// STRATEGY EXPORT
// ============================================================================

/**
 * Metric-Affine Strategy Object
 * Implements the HDCStrategy contract
 */
export const metricAffineStrategy = {
  id: 'metric-affine',
  properties,

  // Thresholds (strategy-specific)
  thresholds: REASONING_THRESHOLDS,
  holographicThresholds: HOLOGRAPHIC_THRESHOLDS,

  // Factory
  createZero,
  createRandom,
  createFromName,
  deserialize,

  // Core operations
  bind,
  bindAll,
  bundle,
  similarity,
  unbind,

  // Utilities
  clone,
  equals,
  serialize,
  topKSimilar,
  distance,
  isOrthogonal,

  // KB Serialization
  serializeKB,
  deserializeKB,

  // Internal class
  Vector: MetricAffineVector
};

export default metricAffineStrategy;
