/**
 * AGISystem2 - Hash Utilities
 * @module util/hash
 *
 * DJB2 and other hash functions for string hashing.
 */

/**
 * DJB2 hash function
 * @param {string} str - String to hash
 * @returns {number} 32-bit hash value
 */
export function djb2(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash >>> 0; // Convert to unsigned 32-bit
  }
  return hash;
}

/**
 * FNV-1a hash function
 * @param {string} str - String to hash
 * @returns {number} 32-bit hash value
 */
export function fnv1a(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
    hash = hash >>> 0;
  }
  return hash;
}

/**
 * Simple string hash combining multiple hash functions
 * @param {string} str - String to hash
 * @returns {number} Combined hash value
 */
export function stringHash(str) {
  return djb2(str) ^ fnv1a(str);
}

export default { djb2, fnv1a, stringHash };
