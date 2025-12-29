/**
 * AGISystem2 - EXACT HDC Strategy
 * @module hdc/strategies/exact
 *
 * DS25: Exact Sparse Bitset Polynomial HDC (EXACT / "Exact-Sparse")
 *
 * Representation:
 * - Atom: one-hot BigInt (1n << index)
 * - Vector: polynomial = sorted unique bigint[] of monomials (bitset terms)
 *
 * Operations:
 * - BUNDLE: set union of terms (lossless)
 * - BIND: polynomial product with monomial×monomial = bitwise OR
 * - UNBIND: UNBIND_A (existential quotient): for terms t in composite and q in component,
 *           if q ⊆ t then emit (t \\ q)
 *
 * Notes:
 * - Atom identity uses a per-instance appearance-index dictionary.
 * - This strategy is intended to be instantiated per session via createInstance().
 */

import { PRNG } from '../../util/prng.mjs';

const STRATEGY_ID = 'exact';
const VERSION = 1;

class ExactVector {
  /**
   * @param {number} geometry
   * @param {bigint[]} terms - sorted unique monomials
   */
  constructor(geometry, terms = []) {
    this.geometry = Number.isFinite(geometry) ? geometry : 0;
    this.terms = terms;
    this.strategyId = STRATEGY_ID;
  }

  /**
   * Instance clone for backward compatibility (some runtime paths call vector.clone()).
   * @returns {ExactVector}
   */
  clone() {
    return new ExactVector(this.geometry, (this.terms || []).slice());
  }

  /**
   * Geometry is a compatibility field for the runtime. EXACT is elastic by construction,
   * so extending geometry is a no-op aside from updating the stored geometry value.
   * @param {number} newGeometry
   * @returns {ExactVector}
   */
  extend(newGeometry) {
    if (!Number.isFinite(newGeometry) || newGeometry <= 0) return this.clone();
    if (newGeometry === this.geometry) return this.clone();
    const v = this.clone();
    v.geometry = newGeometry;
    return v;
  }
}

function compareBigInt(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function sortUniqueTerms(terms) {
  if (!terms || terms.length === 0) return [];
  const sorted = Array.from(terms).sort(compareBigInt);
  const out = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const t = sorted[i];
    if (t !== out[out.length - 1]) out.push(t);
  }
  return out;
}

function unionTerms(aTerms, bTerms) {
  const a = aTerms || [];
  const b = bTerms || [];
  if (a.length === 0) return b.slice();
  if (b.length === 0) return a.slice();

  const out = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const av = a[i];
    const bv = b[j];
    if (av === bv) {
      out.push(av);
      i++; j++;
    } else if (av < bv) {
      out.push(av);
      i++;
    } else {
      out.push(bv);
      j++;
    }
  }
  while (i < a.length) out.push(a[i++]);
  while (j < b.length) out.push(b[j++]);
  return out;
}

function bindTerms(aTerms, bTerms) {
  const a = aTerms || [];
  const b = bTerms || [];
  if (a.length === 0 || b.length === 0) return [];
  const out = [];
  for (const ta of a) {
    for (const tb of b) {
      out.push(ta | tb);
    }
  }
  return sortUniqueTerms(out);
}

function isSubsetBits(q, t) {
  // q ⊆ t  ⇔  (t & q) === q
  return (t & q) === q;
}

function unbindTerms(compositeTerms, componentTerms) {
  const composite = compositeTerms || [];
  const component = componentTerms || [];
  if (composite.length === 0 || component.length === 0) return [];

  const out = [];
  for (const t of composite) {
    for (const q of component) {
      if (!isSubsetBits(q, t)) continue;
      // t \ q  (clear q bits from t)
      out.push(t & ~q);
    }
  }
  return sortUniqueTerms(out);
}

function unbindTermsResidual(compositeTerms, componentTerms) {
  const composite = compositeTerms || [];
  const component = componentTerms || [];
  if (composite.length === 0 || component.length === 0) return [];
  if (component.length === 1) return unbindTerms(composite, component);

  // UNBIND_B (right residual): intersect residual solutions across all q in component.
  let acc = null;
  for (const q of component) {
    const residuals = unbindTerms(composite, [q]);
    const set = new Set(residuals);
    if (acc === null) {
      acc = set;
    } else {
      const next = new Set();
      for (const t of acc) {
        if (set.has(t)) next.add(t);
      }
      acc = next;
      if (acc.size === 0) break;
    }
  }
  return sortUniqueTerms(acc ? Array.from(acc) : []);
}

function popcountBigInt(x) {
  let v = x < 0n ? -x : x;
  let count = 0;
  while (v) {
    v &= (v - 1n);
    count++;
  }
  return count;
}

function bitJaccard(a, b) {
  if (a === b) return 1;
  if (a === 0n && b === 0n) return 1;
  const inter = a & b;
  if (inter === 0n) return 0;
  const uni = a | b;
  const denom = popcountBigInt(uni);
  if (denom === 0) return 0;
  return popcountBigInt(inter) / denom;
}

function similarity(a, b) {
  if (!a || !b) return 0;
  const aTerms = a.terms || [];
  const bTerms = b.terms || [];
  if (aTerms.length === 0 && bTerms.length === 0) return 1;
  if (aTerms.length === 0 || bTerms.length === 0) return 0;

  // Max monomial similarity (works well for exact matches in a superposed candidate set).
  let best = 0;
  for (const ta of aTerms) {
    for (const tb of bTerms) {
      const sim = bitJaccard(ta, tb);
      if (sim > best) best = sim;
      if (best >= 1) return 1;
    }
  }
  return best;
}

function distance(a, b) {
  return 1 - similarity(a, b);
}

function isOrthogonal(a, b, threshold = 0.05) {
  return similarity(a, b) <= threshold;
}

function createZero(geometry = 0) {
  return new ExactVector(geometry, []);
}

function createRandom(geometry = 0, seed = null) {
  const geo = Number.isFinite(geometry) && geometry > 0 ? geometry : 1024;
  const rng = new PRNG(seed ?? (Date.now() & 0xFFFFFFFF));

  // Build a single random monomial with ~16 set bits (bounded by geometry).
  const targetBits = Math.max(1, Math.min(16, geo));
  let term = 0n;
  const used = new Set();
  while (used.size < targetBits) {
    const idx = Math.floor(rng.random() * geo);
    if (used.has(idx)) continue;
    used.add(idx);
    term |= (1n << BigInt(idx));
  }
  return new ExactVector(geo, [term]);
}

function makeAtomVector(geometry, index) {
  if (!Number.isInteger(index) || index < 0) throw new Error(`Invalid atom index: ${index}`);
  const term = 1n << BigInt(index);
  return new ExactVector(geometry, [term]);
}

function clone(v) {
  return new ExactVector(v.geometry, (v.terms || []).slice());
}

function equals(a, b) {
  if (!a || !b) return false;
  if (a.geometry !== b.geometry) return false;
  const at = a.terms || [];
  const bt = b.terms || [];
  if (at.length !== bt.length) return false;
  for (let i = 0; i < at.length; i++) {
    if (at[i] !== bt[i]) return false;
  }
  return true;
}

function bind(a, b) {
  if (!a || !b) throw new Error('bind requires two vectors');
  if (a.strategyId !== STRATEGY_ID || b.strategyId !== STRATEGY_ID) {
    throw new Error(`EXACT bind received non-EXACT vectors: ${a.strategyId} / ${b.strategyId}`);
  }
  const geometry = Math.max(a.geometry || 0, b.geometry || 0);
  return new ExactVector(geometry, bindTerms(a.terms, b.terms));
}

function bindAll(...vectors) {
  if (!vectors || vectors.length === 0) return createZero(0);
  let acc = clone(vectors[0]);
  for (let i = 1; i < vectors.length; i++) acc = bind(acc, vectors[i]);
  return acc;
}

function bundle(vectors, _tieBreaker = null) {
  if (!Array.isArray(vectors) || vectors.length === 0) return createZero(0);
  let geometry = 0;
  let terms = [];
  for (const v of vectors) {
    if (!v) continue;
    geometry = Math.max(geometry, v.geometry || 0);
    terms = unionTerms(terms, v.terms || []);
  }
  return new ExactVector(geometry, terms);
}

function unbind(composite, component) {
  if (!composite || !component) throw new Error('unbind requires two vectors');
  if (composite.strategyId !== STRATEGY_ID || component.strategyId !== STRATEGY_ID) {
    throw new Error(`EXACT unbind received non-EXACT vectors: ${composite.strategyId} / ${component.strategyId}`);
  }
  const geometry = Math.max(composite.geometry || 0, component.geometry || 0);
  return new ExactVector(geometry, unbindTerms(composite.terms, component.terms));
}

function topKSimilar(query, vocabulary, k = 5, session = null) {
  const results = [];
  const entries = vocabulary instanceof Map
    ? vocabulary.entries()
    : Object.entries(vocabulary);

  for (const [name, vec] of entries) {
    if (session?.reasoningStats) session.reasoningStats.similarityChecks++;
    results.push({ name, similarity: similarity(query, vec) });
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, k);
}

function serialize(v) {
  return {
    strategyId: STRATEGY_ID,
    version: VERSION,
    geometry: v.geometry,
    data: (v.terms || []).map(t => t.toString())
  };
}

function deserialize(serialized) {
  if (!serialized || serialized.strategyId !== STRATEGY_ID) {
    throw new Error(`Invalid serialized EXACT vector: ${serialized?.strategyId}`);
  }
  const geometry = Number.isFinite(serialized.geometry) ? serialized.geometry : 0;
  const data = Array.isArray(serialized.data) ? serialized.data : [];
  const terms = data.map(s => BigInt(s));
  return new ExactVector(geometry, sortUniqueTerms(terms));
}

function serializeKB(facts) {
  if (!facts || facts.length === 0) {
    return { strategyId: STRATEGY_ID, version: VERSION, geometry: 0, count: 0, facts: [] };
  }
  const geometry = facts[0]?.vector?.geometry ?? 0;
  return {
    strategyId: STRATEGY_ID,
    version: VERSION,
    geometry,
    count: facts.length,
    facts: facts.map(f => ({
      data: (f.vector?.terms || []).map(t => t.toString()),
      name: f.name || null,
      metadata: f.metadata || null
    }))
  };
}

function deserializeKB(serialized) {
  if (!serialized || !Array.isArray(serialized.facts) || serialized.count === 0) return [];
  const geometry = serialized.geometry ?? 0;
  return serialized.facts.map(f => ({
    vector: new ExactVector(geometry, sortUniqueTerms((f.data || []).map(s => BigInt(s)))),
    name: f.name,
    metadata: f.metadata
  }));
}

function makeAllocator() {
  const atomToIndex = new Map();
  const indexToAtom = [];

  function ensureIndex(name) {
    if (atomToIndex.has(name)) return atomToIndex.get(name);
    const idx = indexToAtom.length;
    atomToIndex.set(name, idx);
    indexToAtom.push(name);
    return idx;
  }

  return {
    atomToIndex,
    indexToAtom,
    ensureIndex
  };
}

function makeStats() {
  return {
    atomsDeclared: 0,

    bindCalls: 0,
    bindPairs: 0,
    bindOutTerms: 0,

    bundleCalls: 0,
    bundleInTerms: 0,
    bundleOutTerms: 0,

    unbindCalls: 0,
    unbindChecks: 0,
    unbindMatches: 0,
    unbindOutTerms: 0,
    unbindResidualMembershipChecks: 0
  };
}

function createInstance({ geometry = 0, session = null } = {}) {
  const alloc = makeAllocator();
  const stats = makeStats();
  const mode = String(
    // Prefer session-local option if available (passed via createHDCContext).
    session?.exactUnbindMode ||
    process.env.SYS2_EXACT_UNBIND_MODE ||
    'A'
  ).trim().toUpperCase();

  function bumpSessionOp(key, delta) {
    if (!session?.reasoningStats?.operations) return;
    const d = Number(delta || 0);
    if (!Number.isFinite(d) || d === 0) return;
    session.reasoningStats.operations[key] = (session.reasoningStats.operations[key] || 0) + d;
  }

  function createFromName(name, geo = geometry, _theoryId = 'default') {
    if (!name || typeof name !== 'string') throw new Error('createFromName requires a string name');
    const idx = alloc.ensureIndex(name);
    stats.atomsDeclared++;
    return makeAtomVector(geo, idx);
  }

  function bindInst(a, b) {
    if (!a || !b) throw new Error('bind requires two vectors');
    if (a.strategyId !== STRATEGY_ID || b.strategyId !== STRATEGY_ID) {
      throw new Error(`EXACT bind received non-EXACT vectors: ${a.strategyId} / ${b.strategyId}`);
    }
    stats.bindCalls++;
    const aTerms = a.terms || [];
    const bTerms = b.terms || [];
    stats.bindPairs += aTerms.length * bTerms.length;

    const geometryOut = Math.max(a.geometry || 0, b.geometry || 0);
    const terms = bindTerms(aTerms, bTerms);
    stats.bindOutTerms += terms.length;
    bumpSessionOp('exact_bind_pairs', aTerms.length * bTerms.length);
    bumpSessionOp('exact_bind_out_terms', terms.length);
    return new ExactVector(geometryOut, terms);
  }

  function bindAllInst(...vectors) {
    if (!vectors || vectors.length === 0) return createZero(0);
    let acc = clone(vectors[0]);
    for (let i = 1; i < vectors.length; i++) acc = bindInst(acc, vectors[i]);
    return acc;
  }

  function bundleInst(vectors, _tieBreaker = null) {
    stats.bundleCalls++;
    if (!Array.isArray(vectors) || vectors.length === 0) {
      bumpSessionOp('exact_bundle_out_terms', 0);
      return createZero(0);
    }
    let geometryOut = 0;
    let terms = [];
    let inTerms = 0;
    for (const v of vectors) {
      if (!v) continue;
      if (v.strategyId !== STRATEGY_ID) {
        throw new Error(`EXACT bundle received non-EXACT vector: ${v.strategyId}`);
      }
      geometryOut = Math.max(geometryOut, v.geometry || 0);
      const vt = v.terms || [];
      inTerms += vt.length;
      terms = unionTerms(terms, vt);
    }
    stats.bundleInTerms += inTerms;
    stats.bundleOutTerms += terms.length;
    bumpSessionOp('exact_bundle_in_terms', inTerms);
    bumpSessionOp('exact_bundle_out_terms', terms.length);
    return new ExactVector(geometryOut, terms);
  }

  function unbindA(compositeTerms, componentTerms) {
    const composite = compositeTerms || [];
    const component = componentTerms || [];
    if (composite.length === 0 || component.length === 0) return [];
    stats.unbindChecks += composite.length * component.length;
    bumpSessionOp('exact_unbind_checks', composite.length * component.length);

    const out = [];
    for (const t of composite) {
      for (const q of component) {
        if (!isSubsetBits(q, t)) continue;
        stats.unbindMatches++;
        bumpSessionOp('exact_unbind_matches', 1);
        out.push(t & ~q);
      }
    }
    return sortUniqueTerms(out);
  }

  function unbindB(compositeTerms, componentTerms) {
    const composite = compositeTerms || [];
    const component = componentTerms || [];
    if (composite.length === 0 || component.length === 0) return [];
    if (component.length === 1) return unbindA(composite, component);

    // UNBIND_B (right residual): intersect residual solutions across all q in component.
    let acc = null;
    for (const q of component) {
      stats.unbindChecks += composite.length;
      bumpSessionOp('exact_unbind_checks', composite.length);

      const residuals = [];
      for (const t of composite) {
        if (!isSubsetBits(q, t)) continue;
        stats.unbindMatches++;
        bumpSessionOp('exact_unbind_matches', 1);
        residuals.push(t & ~q);
      }
      const residualSet = new Set(sortUniqueTerms(residuals));
      if (acc === null) {
        acc = residualSet;
      } else {
        const next = new Set();
        // Count membership checks for transparency (Set.has is a real operation).
        stats.unbindResidualMembershipChecks += acc.size;
        bumpSessionOp('exact_unbind_membership_checks', acc.size);
        for (const candidate of acc) {
          if (residualSet.has(candidate)) next.add(candidate);
        }
        acc = next;
        if (acc.size === 0) break;
      }
    }
    return sortUniqueTerms(acc ? Array.from(acc) : []);
  }

  function unbindWithMode(composite, component) {
    if (!composite || !component) throw new Error('unbind requires two vectors');
    if (composite.strategyId !== STRATEGY_ID || component.strategyId !== STRATEGY_ID) {
      throw new Error(`EXACT unbind received non-EXACT vectors: ${composite.strategyId} / ${component.strategyId}`);
    }
    stats.unbindCalls++;
    bumpSessionOp('exact_unbind_calls', 1);

    const geometryOut = Math.max(composite.geometry || 0, component.geometry || 0);
    const terms = mode === 'B'
      ? unbindB(composite.terms, component.terms)
      : unbindA(composite.terms, component.terms);
    stats.unbindOutTerms += terms.length;
    bumpSessionOp('exact_unbind_out_terms', terms.length);
    return new ExactVector(geometryOut, terms);
  }

  return {
    id: STRATEGY_ID,
    properties,

    // Factory
    createZero,
    createRandom,
    createFromName,
    deserialize,

    // Ops
    bind: bindInst,
    bindAll: bindAllInst,
    bundle: bundleInst,
    unbind: unbindWithMode,
    similarity,
    distance,
    topKSimilar,
    isOrthogonal,

    // Utils
    clone,
    equals,
    serialize,
    serializeKB,
    deserializeKB,

    // Introspection (session-local)
    _allocator: alloc,
    _stats: stats,
    unbindMode: mode,
    Vector: ExactVector
  };
}

const properties = {
  id: STRATEGY_ID,
  displayName: 'EXACT (Exact-Sparse Bitset Polynomial)',
  recommendedBundleCapacity: 1000,
  maxBundleCapacity: 100000,
  bytesPerVector: (_geometry) => 0,
  bindComplexity: 'O(|A||B|·W)',
  sparseOptimized: true,
  // The Master Equation decode is structural (subset-based), not statistical.
  // When the query key matches a fact term, the recovered hole can be exact.
  // This enables an HDC-first engine to skip symbolic validation for speed.
  reasoningEquationReliable: true,
  description: 'Exact sparse polynomial over bitset monomials (BigInt); union bundle + OR-product bind.'
};

export const exactStrategy = {
  id: STRATEGY_ID,
  properties,

  // Session-local instantiation
  createInstance,

  // Factory (process-global fallback allocator; not recommended for multi-session)
  ...createInstance({ geometry: 0 })
};

export default exactStrategy;
