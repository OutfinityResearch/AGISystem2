import { isVector } from '../hdc/facade.mjs';

function fingerprintVector(vec) {
  if (!vec) return null;

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
  if (/^[A-Za-z_][A-Za-z0-9_]*Type$/.test(token)) return token;
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
