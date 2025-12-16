/**
 * AGISystem2 - HDC Facade
 * @module hdc/facade
 *
 * SINGLE ENTRY POINT for all HDC operations.
 *
 * The rest of the system imports ONLY from this module.
 * Direct imports from strategies/ are prohibited in upper layers.
 *
 * Usage:
 *   import { bind, bundle, similarity, createFromName } from '../hdc/facade.mjs';
 */

import { getStrategy, getDefaultStrategy, listStrategies } from './strategies/index.mjs';

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

/**
 * Environment variable for HDC strategy selection
 * Set SYS2_HDC_STRATEGY=dense-binary (or future strategies)
 * Default: 'dense-binary'
 */
const ENV_STRATEGY = process.env.SYS2_HDC_STRATEGY || 'dense-binary';

/**
 * Environment variable for default geometry
 * Set SYS2_GEOMETRY=32768 (or other valid geometry)
 * Default: 32768
 */
const ENV_GEOMETRY = parseInt(process.env.SYS2_GEOMETRY) || 32768;

// ============================================================================
// GEOMETRY MANAGEMENT (Strategy Level)
// ============================================================================

let defaultGeometry = ENV_GEOMETRY;

/**
 * Get the default geometry for vector operations.
 * Upper layers should use this instead of storing geometry directly.
 * @returns {number} Default geometry
 */
export function getDefaultGeometry() {
  return defaultGeometry;
}

/**
 * Set the default geometry for vector operations.
 * Should be called before creating sessions.
 * @param {number} geometry - New default geometry (must be divisible by 32)
 */
export function setDefaultGeometry(geometry) {
  if (geometry % 32 !== 0) {
    throw new Error(`Geometry must be divisible by 32, got ${geometry}`);
  }
  defaultGeometry = geometry;
}

// ============================================================================
// ACTIVE STRATEGY MANAGEMENT
// ============================================================================

let activeStrategy = null;

/**
 * Initialize HDC with a specific strategy
 * @param {string} strategyId - Strategy identifier (default from env or 'dense-binary')
 * @param {Object} options - Strategy-specific options
 * @returns {Object} Active strategy
 */
export function initHDC(strategyId = ENV_STRATEGY, options = {}) {
  activeStrategy = getStrategy(strategyId);
  return activeStrategy;
}

/**
 * Get the active strategy (initializes from env if needed)
 * @returns {Object}
 */
function getActiveStrategy() {
  if (!activeStrategy) {
    activeStrategy = getStrategy(ENV_STRATEGY);
  }
  return activeStrategy;
}

/**
 * Get strategy properties
 * @returns {Object}
 */
export function getProperties() {
  return getActiveStrategy().properties;
}

/**
 * Get strategy ID
 * @returns {string}
 */
export function getStrategyId() {
  return getActiveStrategy().id;
}

/**
 * List available strategies
 * @returns {string[]}
 */
export { listStrategies };

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create zero vector
 * @param {number} [geometry] - Optional geometry (uses default if not specified)
 * @returns {Object} SemanticVector
 */
export function createZero(geometry = defaultGeometry) {
  return getActiveStrategy().createZero(geometry);
}

/**
 * Create random vector with ~50% density
 * @param {number} [geometry] - Optional geometry (uses default if not specified)
 * @param {number} [seed] - Optional seed
 * @returns {Object} SemanticVector
 */
export function createRandom(geometry = defaultGeometry, seed = null) {
  return getActiveStrategy().createRandom(geometry, seed);
}

/**
 * Create deterministic vector from name using ASCII Stamping
 * Same (name, geometry, theoryId) always produces same vector.
 *
 * Theory scoping allows the same name to produce different vectors
 * in different theories, enabling namespace isolation.
 *
 * @param {string} name - Identifier
 * @param {number} [geometry] - Optional geometry (uses default if not specified)
 * @param {string} [theoryId='default'] - Theory scope for namespace isolation
 * @returns {Object} SemanticVector
 */
export function createFromName(name, geometry = defaultGeometry, theoryId = 'default') {
  return getActiveStrategy().createFromName(name, geometry, theoryId);
}

/**
 * Deserialize vector from storage format
 * @param {Object} serialized
 * @returns {Object} SemanticVector
 */
export function deserialize(serialized) {
  // Use the strategy indicated in serialized data
  const strategyId = serialized.strategyId || 'dense-binary';
  const strategy = getStrategy(strategyId);
  return strategy.deserialize(serialized);
}

// ============================================================================
// CORE HDC OPERATIONS
// ============================================================================

/**
 * Bind two vectors (XOR for binary)
 * Properties:
 * - Associative: bind(bind(a,b), c) ≡ bind(a, bind(b,c))
 * - Commutative: bind(a,b) ≡ bind(b,a)
 * - Self-inverse: bind(bind(a,b), b) ≈ a
 *
 * @param {Object} a - First vector
 * @param {Object} b - Second vector
 * @returns {Object} Bound result
 */
export function bind(a, b) {
  return getActiveStrategy().bind(a, b);
}

/**
 * Bind multiple vectors together
 * @param {...Object} vectors
 * @returns {Object} Combined result
 */
export function bindAll(...vectors) {
  return getActiveStrategy().bindAll(...vectors);
}

/**
 * Bundle vectors (superposition)
 * Result is similar to ALL input vectors.
 * @param {Object[]} vectors - Vectors to bundle
 * @param {Object} [tieBreaker] - Optional tiebreaker
 * @returns {Object} Bundled result
 */
export function bundle(vectors, tieBreaker = null) {
  return getActiveStrategy().bundle(vectors, tieBreaker);
}

/**
 * Calculate similarity between vectors (0-1)
 * @param {Object} a - First vector
 * @param {Object} b - Second vector
 * @returns {number} Similarity (0 = different, 1 = identical)
 */
export function similarity(a, b) {
  return getActiveStrategy().similarity(a, b);
}

/**
 * Unbind: inverse of bind
 * For XOR-based strategies: unbind ≡ bind
 * @param {Object} composite - Bound vector
 * @param {Object} component - Component to remove
 * @returns {Object} Remaining component
 */
export function unbind(composite, component) {
  return getActiveStrategy().unbind(composite, component);
}

// ============================================================================
// UTILITY OPERATIONS
// ============================================================================

/**
 * Clone a vector (deep copy)
 * @param {Object} v
 * @returns {Object}
 */
export function clone(v) {
  return getActiveStrategy().clone(v);
}

/**
 * Check exact equality
 * @param {Object} a
 * @param {Object} b
 * @returns {boolean}
 */
export function equals(a, b) {
  return getActiveStrategy().equals(a, b);
}

/**
 * Serialize vector for storage
 * @param {Object} v
 * @returns {Object}
 */
export function serialize(v) {
  return getActiveStrategy().serialize(v);
}

/**
 * Find top-K most similar vectors from vocabulary
 * @param {Object} query
 * @param {Map<string, Object>|Object} vocabulary
 * @param {number} k
 * @returns {Array<{name: string, similarity: number}>}
 */
export function topKSimilar(query, vocabulary, k = 5) {
  return getActiveStrategy().topKSimilar(query, vocabulary, k);
}

/**
 * Calculate distance (1 - similarity)
 * @param {Object} a
 * @param {Object} b
 * @returns {number}
 */
export function distance(a, b) {
  return getActiveStrategy().distance(a, b);
}

/**
 * Check if vectors are approximately orthogonal (~0.5 similarity)
 * @param {Object} a
 * @param {Object} b
 * @param {number} threshold
 * @returns {boolean}
 */
export function isOrthogonal(a, b, threshold = 0.55) {
  return getActiveStrategy().isOrthogonal(a, b, threshold);
}

// ============================================================================
// KB SERIALIZATION (Strategy Level)
// ============================================================================

/**
 * Serialize a knowledge base for persistence.
 * Uses strategy-level serialization for optimal storage.
 *
 * @param {Array<{vector: Object, name?: string, metadata?: Object}>} facts
 * @returns {Object} Serialized KB
 */
export function serializeKB(facts) {
  return getActiveStrategy().serializeKB(facts);
}

/**
 * Deserialize a knowledge base from storage.
 * Automatically selects the correct strategy based on serialized data.
 *
 * @param {Object} serialized - Serialized KB object
 * @returns {Array<{vector: Object, name?: string, metadata?: Object}>}
 */
export function deserializeKB(serialized) {
  const strategyId = serialized.strategyId || 'dense-binary';
  const strategy = getStrategy(strategyId);
  return strategy.deserializeKB(serialized);
}

// ============================================================================
// BACKWARD COMPATIBILITY - Vector Class
// ============================================================================

/**
 * Get the Vector class from the active strategy
 * DYNAMIC: Returns the current strategy's Vector class, not a static reference.
 * @returns {Function} Vector class constructor
 */
export function getVectorClass() {
  return getActiveStrategy().Vector;
}

/**
 * Vector class for backward compatibility
 * NOTE: This is evaluated at import time and uses the DEFAULT strategy.
 * For multi-strategy support, use getVectorClass() instead.
 */
export const Vector = getDefaultStrategy().Vector;

// ============================================================================
// CONTRACT RE-EXPORTS
// ============================================================================

export { HDC_CONTRACT, validateStrategy } from './contract.mjs';

// ============================================================================
// BENCHMARK INFRASTRUCTURE
// ============================================================================

/**
 * Benchmark a single operation
 * @param {string} name - Operation name
 * @param {function} fn - Operation to benchmark
 * @param {number} iterations - Number of iterations
 * @returns {{name: string, iterations: number, totalMs: number, avgMs: number, opsPerSec: number}}
 */
function benchmarkOp(name, fn, iterations = 1000) {
  // Warmup
  for (let i = 0; i < 100; i++) fn();

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const totalMs = performance.now() - start;

  return {
    name,
    iterations,
    totalMs: Math.round(totalMs * 100) / 100,
    avgMs: Math.round((totalMs / iterations) * 1000) / 1000,
    opsPerSec: Math.round(iterations / (totalMs / 1000))
  };
}

/**
 * Run benchmark suite for a strategy
 * @param {string} strategyId - Strategy to benchmark
 * @param {number} geometry - Vector dimension
 * @param {Object} options - Benchmark options
 * @returns {Object} Benchmark results
 */
export function benchmarkStrategy(strategyId = ENV_STRATEGY, geometry = 8192, options = {}) {
  const iterations = options.iterations || 1000;
  const bundleSize = options.bundleSize || 5;

  const strategy = getStrategy(strategyId);
  const results = {
    strategyId,
    geometry,
    iterations,
    timestamp: new Date().toISOString(),
    operations: {}
  };

  // Prepare test vectors
  const v1 = strategy.createRandom(geometry);
  const v2 = strategy.createRandom(geometry);
  const vectors = Array.from({ length: bundleSize }, () => strategy.createRandom(geometry));

  // Benchmark each operation
  results.operations.createRandom = benchmarkOp(
    'createRandom',
    () => strategy.createRandom(geometry),
    iterations
  );

  results.operations.createFromName = benchmarkOp(
    'createFromName',
    () => strategy.createFromName(`test_${Math.random()}`, geometry),
    iterations
  );

  results.operations.bind = benchmarkOp(
    'bind',
    () => strategy.bind(v1, v2),
    iterations
  );

  results.operations.similarity = benchmarkOp(
    'similarity',
    () => strategy.similarity(v1, v2),
    iterations
  );

  results.operations.bundle = benchmarkOp(
    'bundle',
    () => strategy.bundle(vectors),
    iterations / 10 // Bundle is more expensive
  );

  results.operations.clone = benchmarkOp(
    'clone',
    () => strategy.clone(v1),
    iterations
  );

  // Calculate summary
  const totalOps = Object.values(results.operations).reduce((sum, op) => sum + op.opsPerSec, 0);
  results.summary = {
    avgOpsPerSec: Math.round(totalOps / Object.keys(results.operations).length),
    memoryPerVector: strategy.properties.bytesPerVector(geometry)
  };

  return results;
}

/**
 * Compare multiple strategies
 * @param {string[]} strategyIds - Strategies to compare
 * @param {number} geometry
 * @param {Object} options
 * @returns {Object} Comparison results
 */
export function compareStrategies(strategyIds = null, geometry = 8192, options = {}) {
  const ids = strategyIds || listStrategies();
  const results = {
    geometry,
    timestamp: new Date().toISOString(),
    strategies: {}
  };

  for (const id of ids) {
    try {
      results.strategies[id] = benchmarkStrategy(id, geometry, options);
    } catch (e) {
      results.strategies[id] = { error: e.message };
    }
  }

  return results;
}

/**
 * Print benchmark results in human-readable format
 * @param {Object} results - Benchmark results
 */
export function printBenchmark(results) {
  console.log('\n=== HDC Strategy Benchmark ===');
  console.log(`Strategy: ${results.strategyId}`);
  console.log(`Geometry: ${results.geometry}`);
  console.log(`Iterations: ${results.iterations}`);
  console.log(`Memory/vector: ${results.summary.memoryPerVector} bytes`);
  console.log('\nOperations:');
  console.log('─'.repeat(60));
  console.log('Operation'.padEnd(20) + 'Avg (ms)'.padEnd(12) + 'Ops/sec'.padEnd(15) + 'Total (ms)');
  console.log('─'.repeat(60));

  for (const [name, op] of Object.entries(results.operations)) {
    console.log(
      name.padEnd(20) +
      op.avgMs.toString().padEnd(12) +
      op.opsPerSec.toString().padEnd(15) +
      op.totalMs.toString()
    );
  }
  console.log('─'.repeat(60));
  console.log(`Average: ${results.summary.avgOpsPerSec} ops/sec\n`);
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  // Initialization
  initHDC,
  getProperties,
  getStrategyId,
  listStrategies,

  // Geometry management
  getDefaultGeometry,
  setDefaultGeometry,

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

  // Benchmark
  benchmarkStrategy,
  compareStrategies,
  printBenchmark,

  // Backward compat
  Vector
};
