/**
 * AGISystem2 - Seeded Pseudo-Random Number Generator
 * @module util/prng
 *
 * xorshift128+ algorithm for deterministic random generation.
 * This ensures identical vectors are generated from the same seed.
 */

export class PRNG {
  /**
   * Create a new PRNG with seed
   * @param {number} seed - Integer seed value
   */
  constructor(seed = 1) {
    // Initialize state from seed
    this.s0 = BigInt(seed) | BigInt(1);
    this.s1 = BigInt(seed * 0x6C078965) | BigInt(1);
  }

  /**
   * Generate next random number
   * @returns {number} Random value 0 to 1
   */
  random() {
    let s1 = this.s0;
    const s0 = this.s1;
    this.s0 = s0;
    s1 ^= s1 << BigInt(23);
    s1 ^= s1 >> BigInt(17);
    s1 ^= s0;
    s1 ^= s0 >> BigInt(26);
    this.s1 = s1;

    // Convert to 0-1 range using lower 32 bits
    const result = Number(BigInt.asUintN(32, s0 + s1));
    return result / 0xFFFFFFFF;
  }

  /**
   * Generate random integer in range [min, max]
   * @param {number} min - Minimum value (inclusive)
   * @param {number} max - Maximum value (inclusive)
   * @returns {number} Random integer
   */
  randomInt(min, max) {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * Generate random 32-bit unsigned integer
   * @returns {number} Random uint32
   */
  randomUint32() {
    return Math.floor(this.random() * 0xFFFFFFFF) >>> 0;
  }

  /**
   * Create PRNG from string seed
   * @param {string} str - String to hash as seed
   * @returns {PRNG} New PRNG instance
   */
  static fromString(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return new PRNG(hash);
  }
}

export default PRNG;
