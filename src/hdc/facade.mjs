/**
 * AGISystem2 - HDC Facade
 * @module hdc/facade
 *
 * SINGLE ENTRY POINT for all HDC operations.
 * NOTE: Level 0 (L0) Primitives mandates by DS07a (e.g. ___Bind, ___Bundle, ___Not)
 * are NOT implemented here. They are runtime built-ins found in:
 * src/runtime/executor-builtins.mjs
 *
 * The rest of the system imports ONLY from this module.
 * Direct imports from strategies/ are prohibited in upper layers.
 *
 * Usage:
 *   import { bind, bundle, similarity, createFromName } from '../hdc/facade.mjs';
 */

import { getStrategy, getDefaultStrategy, listStrategies } from './strategies/index.mjs';

const STRATEGY_INSTANCE_PROP = '__sys2StrategyInstance';
const SESSION_PROP = '__sys2Session';

function getAttachedStrategyInstance(vector) {
  if (!vector || typeof vector !== 'object') return null;
  return vector[STRATEGY_INSTANCE_PROP] || null;
}

function getAttachedSession(vector) {
  if (!vector || typeof vector !== 'object') return null;
  return vector[SESSION_PROP] || null;
}

function inferSessionFromVectors(vectors = []) {
  const sessions = [];
  for (const v of vectors || []) {
    const s = getAttachedSession(v);
    if (s) sessions.push(s);
  }
  const unique = Array.from(new Set(sessions));
  if (unique.length > 1) {
    throw new Error('Mixed Sessions in one HDC operation (cross-session vector mix).');
  }
  return unique[0] || null;
}

function bumpSessionCounter(session, key, delta = 1) {
  if (!session?.reasoningStats) return;
  const d = Number(delta || 0);
  if (!Number.isFinite(d) || d === 0) return;
  session.reasoningStats[key] = (session.reasoningStats[key] || 0) + d;
}

function attachStrategyInstance(vector, strategy, session = null) {
  if (!vector || typeof vector !== 'object') return vector;
  try {
    if (!Object.isExtensible(vector)) return vector;
    Object.defineProperty(vector, STRATEGY_INSTANCE_PROP, {
      value: strategy,
      enumerable: false,
      configurable: true
    });
    if (session) {
      Object.defineProperty(vector, SESSION_PROP, {
        value: session,
        enumerable: false,
        configurable: true
      });
    }
  } catch {
    // Best-effort tagging.
  }
  return vector;
}

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

/**
 * Environment variable for HDC strategy selection.
 * Default: 'dense-binary'
 */
const ENV_STRATEGY = process.env.SYS2_HDC_STRATEGY || 'dense-binary';

/**
 * Environment variable for default geometry
 * Set SYS2_GEOMETRY=32768 (or other valid geometry)
 * Default: 32768
 */
const ENV_GEOMETRY = parseInt(process.env.SYS2_GEOMETRY) || 32768;
const ENV_ALLOW_SHAPE_INFERENCE =
  process.env.SYS2_ALLOW_VECTOR_SHAPE_INFERENCE === '1' ||
  process.env.SYS2_ALLOW_VECTOR_SHAPE_INFERENCE === 'true';

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
// STRATEGY RESOLUTION (No process-global behavior required)
// ============================================================================

// Backward-compatible default strategy selector (for callers that don't pass strategyId/vectors).
let defaultStrategyId = ENV_STRATEGY;

/**
 * Backward-compatible initializer. Historically this selected a process-global active strategy.
 * New code should avoid relying on process-global state: operations dispatch based on vector.strategyId
 * or an explicit strategyId parameter.
 */
export function initHDC(strategyId = ENV_STRATEGY) {
  defaultStrategyId = strategyId;
  return getStrategy(strategyId);
}

/**
 * Infer strategyId from a vector (preferred), else fall back to env default.
 */
function inferStrategyId(vector) {
  if (!vector) return null;
  if (typeof vector.strategyId === 'string' && vector.strategyId.trim() !== '') return vector.strategyId;
  const attached = getAttachedStrategyInstance(vector);
  const attachedId = attached?.properties?.id || attached?.id || null;
  if (typeof attachedId === 'string' && attachedId.trim() !== '') return attachedId;

  // Legacy fallback heuristics (older vectors / test doubles).
  // Disabled by default to avoid silent mis-dispatch; enable only for legacy tooling/tests.
  if (ENV_ALLOW_SHAPE_INFERENCE) {
    if (vector.data instanceof Uint32Array) return 'dense-binary';
    if (vector.data instanceof Uint8Array) return 'metric-affine';
    if (vector.exponents instanceof Set) return 'sparse-polynomial';
  }
  return null;
}

/**
 * Resolve a strategy object from an explicit id, or from vectors.
 */
function resolveStrategy({ strategyId = null, vectors = [] } = {}) {
  // Prefer session-attached strategy instances to keep operations IoC-correct:
  // if vectors came from a Session-owned HDC context, use that same instance so
  // per-session configuration/state (e.g. EXACT unbind mode, allocators, stats) applies.
  const attached = [];
  for (const v of vectors || []) {
    const inst = getAttachedStrategyInstance(v);
    if (inst) attached.push(inst);
  }
  const uniqueAttached = Array.from(new Set(attached));
  if (uniqueAttached.length > 1) {
    // Keep legacy wording so existing tests/handlers still match this error class.
    throw new Error('Mixed HDC strategies in one operation (cross-session vector mix).');
  }
  if (uniqueAttached.length === 1) return uniqueAttached[0];

  const inferred = [];
  if (strategyId) inferred.push(strategyId);
  for (const v of vectors) {
    const id = inferStrategyId(v);
    if (id) inferred.push(id);
  }
  const unique = Array.from(new Set(inferred));
  if (unique.length > 1) {
    throw new Error(`Mixed HDC strategies in one operation: ${unique.join(', ')}`);
  }
  return getStrategy(unique[0] || defaultStrategyId);
}

/**
 * Get strategy properties (for a specific strategy, or inferred from a vector).
 * @param {string|Object} [strategyOrVector]
 * @returns {Object}
 */
export function getProperties(strategyOrVector = null) {
  if (typeof strategyOrVector === 'string') return getStrategy(strategyOrVector).properties;
  const inferred = inferStrategyId(strategyOrVector);
  return getStrategy(inferred || defaultStrategyId).properties;
}

/**
 * Get strategy ID (inferred from vector if provided, else default env).
 * @param {Object} [vector]
 * @returns {string}
 */
export function getStrategyId(vector = null) {
  return inferStrategyId(vector) || defaultStrategyId;
}

/**
 * List available strategies
 * @returns {string[]}
 */
export { listStrategies };

/**
 * Export getStrategy for upper layers that need validation/inspection.
 * (Upper layers should still avoid importing from strategies/ directly.)
 */
export { getStrategy };

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create zero vector
 * @param {number} [geometry] - Optional geometry (uses default if not specified)
 * @param {string} [strategyId] - Optional strategy override
 * @returns {Object} SemanticVector
 */
export function createZero(geometry = defaultGeometry, strategyId = null) {
  const strategy = resolveStrategy({ strategyId });
  return attachStrategyInstance(strategy.createZero(geometry), strategy, null);
}

/**
 * Create random vector with ~50% density
 * @param {number} [geometry] - Optional geometry (uses default if not specified)
 * @param {number} [seed] - Optional seed
 * @param {string} [strategyId] - Optional strategy override
 * @returns {Object} SemanticVector
 */
export function createRandom(geometry = defaultGeometry, seed = null, strategyId = null) {
  const strategy = resolveStrategy({ strategyId });
  return attachStrategyInstance(strategy.createRandom(geometry, seed), strategy);
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
 * @param {string|{theoryId?: string, strategyId?: string}} [theoryIdOrOptions='default'] - Theory scope for namespace isolation (or options)
 * @param {string} [strategyId] - Optional strategy override (when using a string theoryId)
 * @returns {Object} SemanticVector
 */
export function createFromName(name, geometry = defaultGeometry, theoryIdOrOptions = 'default', strategyId = null) {
  let theoryId = 'default';
  let resolvedStrategyId = strategyId;
  if (typeof theoryIdOrOptions === 'object' && theoryIdOrOptions) {
    theoryId = theoryIdOrOptions.theoryId || 'default';
    resolvedStrategyId = theoryIdOrOptions.strategyId || resolvedStrategyId;
  } else if (typeof theoryIdOrOptions === 'string') {
    theoryId = theoryIdOrOptions || 'default';
  }
  const strategy = resolveStrategy({ strategyId: resolvedStrategyId });
  return attachStrategyInstance(strategy.createFromName(name, geometry, theoryId), strategy);
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
  return attachStrategyInstance(strategy.deserialize(serialized), strategy);
}

// ============================================================================
// CORE HDC OPERATIONS
// ============================================================================

/**
 * Bind two vectors (XOR for binary)
 * Properties:
 * - Associative: bind(bind(a,b), c) ≡ bind(a, bind(b,c))
 * - Commutative: bind(a,b) ≡ bind(b,a)
 * - XOR cancellation (XOR-based strategies): bind(bind(a,b), b) ≈ a
 *
 * @param {Object} a - First vector
 * @param {Object} b - Second vector
 * @returns {Object} Bound result
 */
export function bind(a, b) {
  const strategy = resolveStrategy({ vectors: [a, b] });
  const session = inferSessionFromVectors([a, b]);
  bumpSessionCounter(session, 'hdcBindOps', 1);
  return attachStrategyInstance(strategy.bind(a, b), strategy, session);
}

/**
 * Bind multiple vectors together
 * @param {...Object} vectors
 * @returns {Object} Combined result
 */
export function bindAll(...vectors) {
  const strategy = resolveStrategy({ vectors });
  const session = inferSessionFromVectors(vectors);
  bumpSessionCounter(session, 'hdcBindOps', Math.max(0, vectors.length - 1));
  return attachStrategyInstance(strategy.bindAll(...vectors), strategy, session);
}

/**
 * Bundle vectors (superposition)
 * Result is similar to ALL input vectors.
 * @param {Object[]} vectors - Vectors to bundle
 * @param {Object} [tieBreaker] - Optional tiebreaker
 * @returns {Object} Bundled result
 */
export function bundle(vectors, tieBreaker = null) {
  const strategy = resolveStrategy({ vectors });
  const session = inferSessionFromVectors(vectors);
  bumpSessionCounter(session, 'hdcBundleOps', 1);
  return attachStrategyInstance(strategy.bundle(vectors, tieBreaker), strategy, session);
}

/**
 * Calculate similarity between vectors (0-1)
 * @param {Object} a - First vector
 * @param {Object} b - Second vector
 * @returns {number} Similarity (0 = different, 1 = identical)
 */
export function similarity(a, b) {
  return resolveStrategy({ vectors: [a, b] }).similarity(a, b);
}

/**
 * Unbind: inverse of bind
 * For XOR-based strategies: unbind ≡ bind
 * @param {Object} composite - Bound vector
 * @param {Object} component - Component to remove
 * @returns {Object} Remaining component
 */
export function unbind(composite, component) {
  const strategy = resolveStrategy({ vectors: [composite, component] });
  const session = inferSessionFromVectors([composite, component]);
  bumpSessionCounter(session, 'hdcUnbindOps', 1);
  return attachStrategyInstance(strategy.unbind(composite, component), strategy, session);
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
  const strategy = resolveStrategy({ vectors: [v] });
  const session = inferSessionFromVectors([v]);
  return attachStrategyInstance(strategy.clone(v), strategy, session);
}

/**
 * Check exact equality
 * @param {Object} a
 * @param {Object} b
 * @returns {boolean}
 */
export function equals(a, b) {
  return resolveStrategy({ vectors: [a, b] }).equals(a, b);
}

/**
 * Serialize vector for storage
 * @param {Object} v
 * @returns {Object}
 */
export function serialize(v) {
  return resolveStrategy({ vectors: [v] }).serialize(v);
}

/**
 * Find top-K most similar vectors from vocabulary
 * @param {Object} query
 * @param {Map<string, Object>|Object} vocabulary
 * @param {number} k
 * @returns {Array<{name: string, similarity: number}>}
 */
export function topKSimilar(query, vocabulary, k = 5, session = null) {
  const s = session || inferSessionFromVectors([query]);
  bumpSessionCounter(s, 'topKSimilarCalls', 1);
  return resolveStrategy({ vectors: [query] }).topKSimilar(query, vocabulary, k, s);
}

/**
 * Calculate distance (1 - similarity)
 * @param {Object} a
 * @param {Object} b
 * @returns {number}
 */
export function distance(a, b) {
  return resolveStrategy({ vectors: [a, b] }).distance(a, b);
}

/**
 * Check if vectors are approximately orthogonal (~0.5 similarity)
 * @param {Object} a
 * @param {Object} b
 * @param {number} threshold
 * @returns {boolean}
 */
export function isOrthogonal(a, b, threshold = 0.55) {
  return resolveStrategy({ vectors: [a, b] }).isOrthogonal(a, b, threshold);
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
  if (!facts || facts.length === 0) return resolveStrategy().serializeKB(facts);
  const vectors = facts.map(f => f?.vector).filter(Boolean);
  return resolveStrategy({ vectors }).serializeKB(facts);
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
  return resolveStrategy().Vector;
}

/**
 * Get the Vector class for a specific strategy.
 * @param {string} [strategyId]
 * @returns {Function}
 */
export function getVectorClassFor(strategyId = null) {
  return resolveStrategy({ strategyId }).Vector;
}

/**
 * Check if an object is a valid HDC vector from ANY registered strategy.
 * Use this instead of `instanceof Vector` for multi-strategy compatibility.
 *
 * Supported vector types:
 * - dense-binary: Uint32Array data + geometry (number of bits)
 * - sparse-polynomial: Set exponents + geometry (k parameter)
 * - metric-affine: Uint8Array data + geometry (number of dimensions)
 * - exact: bigint[] terms + geometry (compat placeholder)
 *
 * @param {any} obj - Object to check
 * @returns {boolean} True if obj is a vector from any strategy
 */
export function isVector(obj) {
  if (!obj || typeof obj !== 'object') return false;

  // Must have geometry property (all strategies)
  if (typeof obj.geometry !== 'number') return false;

  // Check for strategy-specific data representations
  // dense-binary: Uint32Array
  if (obj.data instanceof Uint32Array) return true;
  // metric-affine: Uint8Array
  if (obj.data instanceof Uint8Array) return true;
  // sparse-polynomial: Set of exponents
  if (obj.exponents instanceof Set) return true;
  // exact: bigint[] terms (polynomial over bitset monomials)
  if (Array.isArray(obj.terms) && obj.terms.every(t => typeof t === 'bigint')) return true;

  return false;
}

/**
 * Vector class for backward compatibility
 * @deprecated Use getVectorClass() for dynamic strategy support,
 *             or isVector() to check if an object is a vector.
 * NOTE: This is evaluated at import time and uses the DEFAULT strategy.
 * instanceof checks will FAIL for vectors from non-default strategies!
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
  Vector,
  getVectorClass,
  isVector
};
