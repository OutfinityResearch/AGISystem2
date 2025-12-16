/**
 * AGISystem2 - ASCII Stamp Generator
 * @module util/ascii-stamp
 *
 * BACKWARD COMPATIBILITY LAYER
 * Uses hdc/facade for deterministic vector generation.
 *
 * New code should use createFromName directly:
 *   import { createFromName } from '../hdc/facade.mjs';
 */

import { createFromName } from '../hdc/facade.mjs';

/**
 * Generate a deterministic vector from a string identifier
 * @param {string} identifier - String to encode
 * @param {number} geometry - Vector dimension
 * @returns {Object} Deterministic vector
 */
export function asciiStamp(identifier, geometry) {
  return createFromName(identifier, geometry);
}

/**
 * Generate multiple vectors from base identifier
 * @param {string} baseId - Base identifier
 * @param {number} count - Number of vectors
 * @param {number} geometry - Vector dimension
 * @returns {Object[]} Array of vectors
 */
export function asciiStampBatch(baseId, count, geometry) {
  const vectors = [];
  for (let i = 0; i < count; i++) {
    vectors.push(createFromName(`${baseId}:${i}`, geometry));
  }
  return vectors;
}

export default asciiStamp;
