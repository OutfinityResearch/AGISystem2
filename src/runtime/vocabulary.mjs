/**
 * AGISystem2 - Vocabulary Management
 * @module runtime/vocabulary
 *
 * Manages the mapping between atom names and their hypervectors.
 * Strategy-agnostic: works with any HDC strategy (dense-binary, FSP, etc.)
 */

import { createFromName, serialize, deserialize, getStrategyId } from '../hdc/facade.mjs';

export class Vocabulary {
  /**
   * Create a new vocabulary
   * @param {number} geometry - Vector dimension
   */
  constructor(geometry) {
    this.geometry = geometry;
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

    // Create deterministic vector from name using active strategy
    const vec = createFromName(name, this.geometry);
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
    // Strategy-agnostic hashing
    // For dense-binary: use first few words
    if (vec.data && vec.words) {
      const parts = [];
      for (let i = 0; i < Math.min(4, vec.words); i++) {
        parts.push(vec.data[i].toString(16));
      }
      return parts.join(':');
    }
    // For FSP: use first few exponents
    if (vec.exponents) {
      const exps = Array.from(vec.exponents).slice(0, 4);
      return exps.map(e => e.toString(16)).join(':');
    }
    // Fallback: use serialization
    const serialized = serialize(vec);
    return JSON.stringify(serialized.data || serialized).substring(0, 64);
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
    return { geometry: this.geometry, atoms, strategyId: getStrategyId() };
  }

  /**
   * Deserialize vocabulary
   * Strategy-agnostic: uses facade deserialize
   * @param {Object} data - Serialized data
   * @returns {Vocabulary}
   */
  static deserializeVocab(data) {
    const vocab = new Vocabulary(data.geometry);
    for (const [name, vecData] of Object.entries(data.atoms)) {
      const vec = deserialize(vecData);
      vocab.atoms.set(name, vec);
      vocab.reverse.set(vocab.hashVector(vec), name);
    }
    return vocab;
  }
}

export default Vocabulary;
