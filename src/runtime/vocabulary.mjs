/**
 * AGISystem2 - Vocabulary Management
 * @module runtime/vocabulary
 *
 * Manages the mapping between atom names and their hypervectors.
 * Strategy-agnostic: works with any HDC strategy (dense-binary, SPHDC, etc.)
 */

import { createFromName, serialize, deserialize, getStrategyId } from '../hdc/facade.mjs';
import { createHash } from 'node:crypto';

export class Vocabulary {
  /**
   * Create a new vocabulary
   * @param {number} geometry - Vector dimension
   * @param {string} [strategyId] - HDC strategy identifier for this vocabulary
   * @param {Object} [hdc] - Optional session-local HDC context/instance (IoC)
   */
  constructor(geometry, strategyId = null, hdc = null) {
    this.geometry = geometry;
    this.strategyId = strategyId || getStrategyId();
    this.hdc = hdc;
    this.atoms = new Map();      // name -> Vector
    this.reverse = new Map();    // Vector hash -> name (for decoding)
  }

  /**
   * Get or create atom vector
   * @param {string} name - Atom name
   * @returns {Object} Atom vector (strategy-dependent type)
   */
  getOrCreate(name) {
    if (this.atoms.has(name)) {
      return this.atoms.get(name);
    }

    // Create deterministic vector from name using this vocabulary strategy.
    // If a session-local HDC context is provided, prefer it to avoid any
    // cross-session shared state in strategies that need per-session allocators.
    const vec = this.hdc?.createFromName
      ? this.hdc.createFromName(name, this.geometry, 'default')
      : createFromName(name, this.geometry, { strategyId: this.strategyId });
    this.atoms.set(name, vec);

    // Store reverse mapping for decoding
    const hash = this.hashVector(vec);
    this.reverse.set(hash, name);

    return vec;
  }

  /**
   * Get atom vector if exists
   * @param {string} name - Atom name
   * @returns {Vector|undefined}
   */
  get(name) {
    return this.atoms.get(name);
  }

  /**
   * Check if atom exists
   * @param {string} name - Atom name
   * @returns {boolean}
   */
  has(name) {
    return this.atoms.has(name);
  }

  /**
   * Get atom name from vector (best match)
   * @param {Vector} vec - Vector to look up
   * @returns {string|null} Atom name or null
   */
  reverseLookup(vec) {
    const hash = this.hashVector(vec);
    return this.reverse.get(hash) || null;
  }

  /**
   * Get all atom names
   * @returns {string[]}
   */
  names() {
    return Array.from(this.atoms.keys());
  }

  /**
   * Get iterator over atoms
   * @returns {Iterator}
   */
  entries() {
    return this.atoms.entries();
  }

  /**
   * Get atom count
   * @returns {number}
   */
  get size() {
    return this.atoms.size;
  }

  /**
   * Simple vector hash for reverse lookup
   * Strategy-agnostic: works with any vector type
   * @param {Object} vec - Vector to hash
   * @returns {string}
   */
  hashVector(vec) {
    // Reverse-lookup hashing MUST be collision-resistant because it is used to resolve
    // $refs back into stable atom names during metadata extraction.
    //
    // Previous implementation used only a prefix of the vector, which can collide and
    // corrupt Reference resolution inside graphs/macros (e.g., `$effect` resolving to
    // the wrong atom). We instead hash the full vector payload.

    const strategy = getStrategyId?.(vec) || this.strategyId || 'unknown';

    // Dense-binary: hash all words.
    if (vec?.data && Number.isInteger(vec?.words)) {
      const words = vec.words;
      const u32 = vec.data instanceof Uint32Array ? vec.data : Uint32Array.from(vec.data);
      const bytes = Buffer.from(u32.buffer, u32.byteOffset, Math.min(u32.byteLength, words * 4));
      return `${strategy}:${createHash('sha256').update(bytes).digest('hex')}`;
    }

    // SPHDC: hash sorted exponents.
    if (vec?.exponents) {
      // Exponents are BigInt 64-bit values; converting to Number loses precision and causes
      // catastrophic collisions in reverseLookup (especially for k>1).
      const raw = Array.from(vec.exponents);
      const bigints = raw.every(e => typeof e === 'bigint');
      const exps = bigints
        ? raw.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)).map(e => e.toString(16))
        : raw.map(e => String(e)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      const payload = `${strategy}:${exps.join(',')}`;
      return `${strategy}:${createHash('sha256').update(payload).digest('hex')}`;
    }

    // Fallback: use serialization (stable) and hash it.
    const serialized = serialize(vec);
    const payload = JSON.stringify(serialized?.data || serialized);
    return `${strategy}:${createHash('sha256').update(payload).digest('hex')}`;
  }

  /**
   * Serialize vocabulary
   * Strategy-agnostic: uses facade serialize
   * @returns {Object}
   */
  serializeVocab() {
    const atoms = {};
    for (const [name, vec] of this.atoms) {
      atoms[name] = serialize(vec);
    }
    return { geometry: this.geometry, atoms, strategyId: this.strategyId };
  }

  /**
   * Deserialize vocabulary
   * Strategy-agnostic: uses facade deserialize
   * @param {Object} data - Serialized data
   * @returns {Vocabulary}
   */
  static deserializeVocab(data) {
    const vocab = new Vocabulary(data.geometry, data.strategyId);
    for (const [name, vecData] of Object.entries(data.atoms)) {
      const vec = deserialize(vecData);
      vocab.atoms.set(name, vec);
      vocab.reverse.set(vocab.hashVector(vec), name);
    }
    return vocab;
  }
}

export default Vocabulary;
