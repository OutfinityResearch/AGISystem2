/**
 * AGISystem2 - Position Vectors
 * @module core/position
 *
 * Position vectors (Pos1, Pos2, ..., Pos20) provide argument ordering
 * without relying on permutation. Each position vector is orthogonal
 * to all others.
 */

import { bind, unbind, getStrategyId, createFromName } from '../hdc/facade.mjs';
import { MAX_POSITIONS, DEFAULT_GEOMETRY } from './constants.mjs';

// Cache for position vectors (per geometry AND per strategy)
const positionCache = new Map();

/**
 * Get position vector for given position and geometry
 * Strategy-aware: returns vector compatible with current HDC strategy
 * @param {number} position - Position number (1-20)
 * @param {number} geometry - Vector dimension
 * @returns {Object} Position vector (type depends on active strategy)
 */
export function getPositionVector(position, geometry = DEFAULT_GEOMETRY, strategyId = null, sessionOrHdc = null) {
  if (position < 1 || position > MAX_POSITIONS) {
    throw new RangeError(`Position must be 1-${MAX_POSITIONS}, got ${position}`);
  }

  // IoC path: if a Session is provided, position vectors must be session-local
  // (some strategies may require per-session allocators / dictionaries).
  if (sessionOrHdc && sessionOrHdc.vocabulary?.getOrCreate) {
    return sessionOrHdc.vocabulary.getOrCreate(`Pos${position}`);
  }

  // Include strategy in cache key to support multi-strategy execution
  const resolvedStrategyId = strategyId || getStrategyId();
  const cacheKey = `${resolvedStrategyId}:${geometry}:${position}`;
  if (positionCache.has(cacheKey)) {
    return positionCache.get(cacheKey);
  }

  // Generate deterministic position vector using active strategy
  const posVec = createFromName(`Pos${position}`, geometry, { strategyId: resolvedStrategyId });
  positionCache.set(cacheKey, posVec);
  return posVec;
}

/**
 * Initialize all position vectors for a geometry
 * @param {number} geometry - Vector dimension
 * @returns {Vector[]} Array of position vectors (index 0 = Pos1)
 */
export function initPositionVectors(geometry = DEFAULT_GEOMETRY) {
  const vectors = [];
  for (let i = 1; i <= MAX_POSITIONS; i++) {
    vectors.push(getPositionVector(i, geometry));
  }
  return vectors;
}

/**
 * Get geometry from vector (strategy-agnostic)
 * @param {Object} vector - Vector (dense-binary or SPHDC)
 * @returns {number}
 */
function getVectorGeometry(vector) {
  // dense-binary uses .geometry, SPHDC uses .maxSize
  return vector.geometry || vector.maxSize || DEFAULT_GEOMETRY;
}

/**
 * Bind a vector with its position marker
 * Strategy-agnostic: works with any vector type
 * @param {number} position - Argument position (1-based)
 * @param {Object} vector - Vector to position
 * @returns {Object} Positioned vector
 */
export function withPosition(position, vector, sessionOrHdc = null) {
  const geometry = getVectorGeometry(vector);
  const posVec = getPositionVector(position, geometry, getStrategyId(vector), sessionOrHdc);
  return bind(vector, posVec);
}

/**
 * Remove position marker from a vector
 * Strategy-agnostic: works with any vector type
 * @param {number} position - Position to remove
 * @param {Object} vector - Positioned vector
 * @returns {Object} Unpositioned vector
 */
export function removePosition(position, vector, sessionOrHdc = null) {
  const geometry = getVectorGeometry(vector);
  const posVec = getPositionVector(position, geometry, getStrategyId(vector), sessionOrHdc);
  return unbind(vector, posVec);
}

/**
 * Extract content at a specific position from composite
 * @param {number} position - Position to extract
 * @param {Vector} composite - Composite vector
 * @returns {Vector} Content at that position
 */
export function extractAtPosition(position, composite) {
  return removePosition(position, composite);
}

/**
 * Clear position vector cache
 */
export function clearPositionCache() {
  positionCache.clear();
}

export default {
  getPositionVector,
  initPositionVectors,
  withPosition,
  removePosition,
  extractAtPosition,
  clearPositionCache
};
