import { isVector } from '../hdc/facade.mjs';
import { debug_trace } from '../utils/debug.js';

function fingerprintVector(vec) {
  if (!vec) return null;

  // EXACT strategy: bigint monomial polynomial representation.
  if (Array.isArray(vec.terms) && Number.isInteger(vec.geometry)) {
    const terms = vec.terms;
    const parts = new Array(terms.length);
    for (let i = 0; i < terms.length; i++) {
      const t = terms[i];
      parts[i] = (typeof t === 'bigint') ? t.toString(16) : String(t);
    }
    // Terms are already sorted/unique by strategy contract.
    return `exact:${vec.geometry}:${parts.join('.')}`;
  }

  // Dense-binary / metric-affine share the DenseBinaryVector storage format.
  if (vec.data && Number.isInteger(vec.geometry)) {
    const words = vec.data;
    // Stable, collision-resistant within a session: include all words.
    // (Used only for type bookkeeping; overhead acceptable for Core-scale programs.)
    const parts = new Array(words.length);
    for (let i = 0; i < words.length; i++) {
      parts[i] = (words[i] >>> 0).toString(16);
    }
    return `dense:${vec.geometry}:${parts.join('.')}`;
  }

  // Sparse-polynomial strategy: exponents set.
  if (vec.exponents && Number.isInteger(vec.geometry)) {
    const raw = [...vec.exponents];
    const bigints = raw.every(e => typeof e === 'bigint');
    const exps = bigints
      ? raw.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)).map(e => e.toString(16))
      : raw.map(e => String(e)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    return `sparse:${vec.geometry}:${exps.join('.')}`;
  }

  return null;
}

function asTypeMarkerName(session, token) {
  if (!token || typeof token !== 'string') return null;
  const idx = session?.semanticIndex;
  if (idx?.isTypeMarker?.(token)) return token;
  // Safe fallback (for legacy configs): keep it conservative.
  if (/^[A-Za-z_][A-Za-z0-9_]*Type_*$/.test(token)) return token;
  return null;
}

export class TypeRegistry {
  constructor(session) {
    this.session = session;
    this._byFingerprint = new Map(); // fingerprint -> { primary: string, all: string[] }
  }

  _getEntry(vec) {
    const fp = fingerprintVector(vec);
    if (!fp) return null;
    return this._byFingerprint.get(fp) || null;
  }

  _setEntry(vec, entry) {
    const fp = fingerprintVector(vec);
    if (!fp) return;
    this._byFingerprint.set(fp, entry);
  }

  getPrimaryTypeName(vec) {
    const entry = this._getEntry(vec);
    return entry?.primary || null;
  }

  getAllTypeNames(vec) {
    const entry = this._getEntry(vec);
    return entry?.all ? [...entry.all] : [];
  }

  /**
   * Propagate typing through a bind:
   * - output inherits input types
   * - if rhsTypeMarker is provided, it becomes the new primary type
   */
  recordBind({ inputVec, outputVec, rhsTypeMarker }) {
    if (!isVector(outputVec)) return;
    const inherited = this.getAllTypeNames(inputVec);
    const all = inherited.length > 0 ? inherited : [];

    if (rhsTypeMarker) {
      const nextAll = all.includes(rhsTypeMarker) ? all : [...all, rhsTypeMarker];
      this._setEntry(outputVec, { primary: rhsTypeMarker, all: nextAll });
      return;
    }

    const primary = this.getPrimaryTypeName(inputVec);
    if (primary || all.length > 0) {
      this._setEntry(outputVec, { primary: primary || (all[all.length - 1] || null), all });
    }
    if (primary || all.length > 0) {
      this._setEntry(outputVec, { primary: primary || (all[all.length - 1] || null), all });
    }
  }

  /**
   * Propagate typing through a bundle:
   * - output inherits all unique types from inputs
   * - if any input is a TypeMarker, it is treated as a type assignment
   */
  recordBundle({ inputVecs, outputVec }) {
    if (!isVector(outputVec)) return;
    if (!Array.isArray(inputVecs)) return;

    let collectedTypes = new Set();
    debug_trace('[TypeRegistry:recordBundle]', 'inputs:', inputVecs.length);

    for (const v of inputVecs) {
      // 1. Is the vector itself a type marker?
      const name = this.session?.vocabulary?.reverseLookup?.(v);
      const asType = this.resolveTypeMarkerName(name);
      debug_trace('[TypeRegistry:recordBundle]', `check: name=${name}, asType=${asType}, fp=${fingerprintVector(v)}`);
      if (asType) {
        collectedTypes.add(asType);
        continue;
      }

      // 2. Does the vector have known types?
      const types = this.getAllTypeNames(v);
      for (const t of types) collectedTypes.add(t);
    }

    const all = Array.from(collectedTypes);
    debug_trace('[TypeRegistry:recordBundle]', 'found types:', all);
    if (all.length > 0) {
      // For bundle, the "primary" type is ambiguous if multiple are present.
      // We pick the last one lexicographically or by insertion order (from Set iteration) as a heuristic,
      // or just the last distinct one found.
      this._setEntry(outputVec, { primary: all[all.length - 1], all });
    }
  }

  /**
   * Record a direct type assignment (rare; mostly used for testing/bootstrapping).
   */
  setType(vec, typeName) {
    const t = asTypeMarkerName(this.session, typeName);
    if (!t) return;
    this._setEntry(vec, { primary: t, all: [t] });
  }

  resolveTypeMarkerName(token) {
    return asTypeMarkerName(this.session, token);
  }
}
