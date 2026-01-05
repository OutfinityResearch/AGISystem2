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

function ensureSortedUniqueTerms(terms) {
  const arr = Array.isArray(terms) ? terms : [];
  if (arr.length <= 1) return arr;
  let prev = arr[0];
  for (let i = 1; i < arr.length; i++) {
    const cur = arr[i];
    if (cur <= prev) {
      return sortUniqueTerms(arr);
    }
    prev = cur;
  }
  return arr;
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

function popcountExceeds(x, limit) {
  if (!Number.isFinite(limit) || limit <= 0) return false;
  let v = x < 0n ? -x : x;
  let count = 0;
  while (v) {
    v &= (v - 1n);
    count++;
    if (count > limit) return true;
  }
  return false;
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
  // Align sorted monomials; pad missing slots with zero-bit monomials.
  const aTerms = ensureSortedUniqueTerms(a.terms);
  const bTerms = ensureSortedUniqueTerms(b.terms);
  const len = Math.max(aTerms.length, bTerms.length);
  if (len === 0) return 1;

  // Compare aligned monomials (sorted ascending). Missing terms are treated as 0 bits.
  let total = 0;
  for (let i = 0; i < len; i++) {
    const ta = aTerms[i] ?? 0n;
    const tb = bTerms[i] ?? 0n;
    total += bitJaccard(ta, tb);
  }
  return total / len;
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

  // DS25 ceilings (URC alignment).
  // - `BOTTOM_IMPOSSIBLE` is absorbing for monomials (dead-end).
  // - `TOP_INEFFABLE` is absorbing for monomials (resource boundary / unknown).
  const bottomBit = 1n << BigInt(alloc.ensureIndex('BOTTOM_IMPOSSIBLE'));
  const topBit = 1n << BigInt(alloc.ensureIndex('TOP_INEFFABLE'));

  function getCeilings() {
    const cfg = session?.exactCeilings || {};
    const monomBitLimitRaw = Number(cfg.monomBitLimit);
    const polyTermLimitRaw = Number(cfg.polyTermLimit);
    const monomBitLimit = Number.isFinite(monomBitLimitRaw) ? Math.max(0, Math.floor(monomBitLimitRaw)) : 1000;
    const polyTermLimit = Number.isFinite(polyTermLimitRaw) ? Math.max(0, Math.floor(polyTermLimitRaw)) : 200000;
    return { monomBitLimit, polyTermLimit };
  }

  function normalizeMonom(termBits, ceilings) {
    // Contradiction wins first.
    if ((termBits & bottomBit) === bottomBit) return bottomBit;
    // Resource boundary next.
    if ((termBits & topBit) === topBit) return topBit;
    // Density ceiling.
    if (ceilings.monomBitLimit > 0 && popcountExceeds(termBits, ceilings.monomBitLimit)) return topBit;
    return termBits;
  }

  function normalizePolynomialTerms(termsIn) {
    const terms = termsIn || [];
    if (terms.length === 0) return [];
    const ceilings = getCeilings();

    // Monom-level normalization first.
    const mapped = terms.map(t => normalizeMonom(t, ceilings));
    const out = sortUniqueTerms(mapped);

    // Poly-level ceiling: collapse to TOP when term count is too large.
    if (ceilings.polyTermLimit > 0 && out.length > ceilings.polyTermLimit) {
      return [topBit];
    }
    return out;
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
    const terms = normalizePolynomialTerms(bindTerms(aTerms, bTerms));
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
    terms = normalizePolynomialTerms(terms);
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
    return new ExactVector(geometryOut, normalizePolynomialTerms(terms));
  }

  function* iterSetBitIndices32(word) {
    let v = Number(word >>> 0);
    while (v !== 0) {
      const lsb = v & -v;
      const bit = 31 - Math.clz32(lsb);
      yield bit;
      v &= (v - 1);
    }
  }

  function extractCandidateAtomsFromTerm(termBits, options = {}) {
    const out = [];
    let t = termBits;
    let offset = 0;
    while (t !== 0n) {
      const word = Number(t & 0xffffffffn);
      if (word !== 0) {
        for (const bit of iterSetBitIndices32(word)) {
          const idx = offset + bit;
          const name = alloc.indexToAtom[idx] || null;
          if (!name) continue;
          out.push(name);
        }
      }
      t >>= 32n;
      offset += 32;
    }

    const sessionRef = options.session || session || null;
    const knownNames = options.knownNames instanceof Set ? options.knownNames : null;
    const isValidEntity = options.isValidEntity || null;

    return out.filter((name) => {
      if (!name) return false;
      if (knownNames && knownNames.has(name)) return false;
      if (typeof name !== 'string') return false;
      if (name.startsWith('__')) return false;
      if (name.startsWith('@') || name.startsWith('$') || name.startsWith('?')) return false;
      // Session pre-initializes position atoms as PosN (noise for hole decoding).
      if (/^Pos\d+$/.test(name)) return false;
      // If provided, defer to system-level entity filtering (filters operators, reserved tokens, etc.).
      if (typeof isValidEntity === 'function') {
        return isValidEntity(name, sessionRef);
      }
      return true;
    });
  }

  /**
   * Strategy-specific candidate decoding for unbound vectors.
   *
   * EXACT unbind can leave structural residue (e.g., wrapped graph operators like `location`
   * contribute extra operator bits like `at`). This decoder projects unbound terms to plausible
   * entity atoms by dropping reserved/internal tokens and scoring by witness counts.
   *
   * @param {ExactVector} unboundVec
   * @param {Object} options
   * @param {Object} [options.session]
   * @param {string} [options.operatorName]
   * @param {number} [options.holeIndex]
   * @param {number} [options.maxCandidates]
   * @param {string[]} [options.domain] - Optional allowed names
   * @param {string[]} [options.knowns] - Optional known arg names to exclude
   * @param {(name:string, session:any)=>boolean} [options.isValidEntity]
   * @returns {Array<{name:string, similarity:number, witnesses:number, source:string}>}
   */
  function decodeUnboundCandidates(unboundVec, options = {}) {
    if (!unboundVec || unboundVec.strategyId !== STRATEGY_ID) return [];
    const terms = unboundVec.terms || [];
    if (terms.length === 0) return [];

    const maxCandidates = Number.isFinite(options.maxCandidates) ? Math.max(1, options.maxCandidates) : 25;
    const domain = Array.isArray(options.domain) && options.domain.length > 0 ? new Set(options.domain) : null;
    const knownNames = Array.isArray(options.knowns) && options.knowns.length > 0 ? new Set(options.knowns) : null;

    const counts = new Map();
    let witnessesTotal = 0;

    for (const term of terms) {
      const atoms = extractCandidateAtomsFromTerm(term, { ...options, knownNames });
      if (atoms.length === 0) continue;
      witnessesTotal++;
      for (const name of atoms) {
        if (domain && !domain.has(name)) continue;
        counts.set(name, (counts.get(name) || 0) + 1);
      }
    }

    if (counts.size === 0) return [];

    const denom = Math.max(1, witnessesTotal);
    const out = Array.from(counts.entries())
      .map(([name, witnesses]) => ({
        name,
        witnesses,
        similarity: witnesses / denom,
        source: 'decode'
      }))
      .sort((a, b) => (b.witnesses - a.witnesses) || (b.similarity - a.similarity) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

    return out.slice(0, maxCandidates);
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
    decodeUnboundCandidates,

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
  defaultGeometry: 256,
  recommendedBundleCapacity: 1000,
  maxBundleCapacity: 100000,
  bytesPerVector: (_geometry) => 0,
  bindComplexity: 'O(|A||B|·W)',
  sparseOptimized: true,
  description: 'Exact sparse polynomial over bitset monomials (BigInt); union bundle + OR-product bind.'
};

export const exactStrategy = {
  id: STRATEGY_ID,
  properties,

  // Session-local instantiation
  createInstance,

  // NOTE: EXACT requires a session-local instance (appearance-index dictionary).
  // The process-global facade MUST NOT use EXACT without a Session/IoC context.
  // Provide explicit methods that throw to make accidental usage obvious.
  createZero: () => { throw new Error('EXACT requires a Session-local instance; use Session({ hdcStrategy: \"exact\" })'); },
  createRandom: () => { throw new Error('EXACT requires a Session-local instance; use Session({ hdcStrategy: \"exact\" })'); },
  createFromName: () => { throw new Error('EXACT requires a Session-local instance; use Session({ hdcStrategy: \"exact\" })'); },
  deserialize: () => { throw new Error('EXACT requires a Session-local instance; use Session({ hdcStrategy: \"exact\" })'); },
  bind: () => { throw new Error('EXACT requires a Session-local instance; use Session({ hdcStrategy: \"exact\" })'); },
  bindAll: () => { throw new Error('EXACT requires a Session-local instance; use Session({ hdcStrategy: \"exact\" })'); },
  bundle: () => { throw new Error('EXACT requires a Session-local instance; use Session({ hdcStrategy: \"exact\" })'); },
  unbind: () => { throw new Error('EXACT requires a Session-local instance; use Session({ hdcStrategy: \"exact\" })'); },
  similarity: () => { throw new Error('EXACT requires a Session-local instance; use Session({ hdcStrategy: \"exact\" })'); },
  distance: () => { throw new Error('EXACT requires a Session-local instance; use Session({ hdcStrategy: \"exact\" })'); },
  topKSimilar: () => { throw new Error('EXACT requires a Session-local instance; use Session({ hdcStrategy: \"exact\" })'); },
  isOrthogonal: () => { throw new Error('EXACT requires a Session-local instance; use Session({ hdcStrategy: \"exact\" })'); },
  decodeUnboundCandidates: () => { throw new Error('EXACT requires a Session-local instance; use Session({ hdcStrategy: \"exact\" })'); },
  clone: () => { throw new Error('EXACT requires a Session-local instance; use Session({ hdcStrategy: \"exact\" })'); },
  equals: () => { throw new Error('EXACT requires a Session-local instance; use Session({ hdcStrategy: \"exact\" })'); },
  serialize: () => { throw new Error('EXACT requires a Session-local instance; use Session({ hdcStrategy: \"exact\" })'); },
  serializeKB: () => { throw new Error('EXACT requires a Session-local instance; use Session({ hdcStrategy: \"exact\" })'); },
  deserializeKB: () => { throw new Error('EXACT requires a Session-local instance; use Session({ hdcStrategy: \"exact\" })'); },
  Vector: ExactVector
};

export default exactStrategy;
