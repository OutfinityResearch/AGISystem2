/**
 * AGISystem2 - Elastic Metric-Affine HDC Strategy (EMA)
 * @module hdc/strategies/metric-affine-elastic
 *
 * Extension of metric-affine:
 * - Space: Z256^D (D = bytes, typically 32/64/96/...)
 * - Bind/Unbind: byte-wise XOR
 * - Similarity: normalized L1 (Manhattan) similarity
 * - Bundle: chunked arithmetic-mean (bounded depth; no bundle-of-bundles)
 *
 * NOTE: "Elastic geometry growth" is a system-level operation (re-encoding facts/vocab).
 * This strategy supports variable D, but does not auto-grow session geometry.
 */

import { PRNG } from '../../util/prng.mjs';
import { djb2 } from '../../util/hash.mjs';

const DEFAULT_DIMENSIONS = 32; // bytes
const MAX_BYTE = 255;
const DEFAULT_CHUNK_CAPACITY = 32;

function assertSameGeometry(a, b) {
  if (a.geometry !== b.geometry) {
    throw new Error(`Geometry mismatch: ${a.geometry} vs ${b.geometry}`);
  }
}

function l1SimilarityBytes(aBytes, bBytes) {
  const D = aBytes.length;
  let l1 = 0;
  for (let i = 0; i < D; i++) l1 += Math.abs(aBytes[i] - bBytes[i]);
  const sim = 1 - (l1 / (D * MAX_BYTE));
  if (sim <= 0) return 0;
  if (sim >= 1) return 1;
  return sim;
}

function xorBytes(out, aBytes, bBytes) {
  const D = aBytes.length;
  for (let i = 0; i < D; i++) out[i] = aBytes[i] ^ bBytes[i];
  return out;
}

class MeanChunk {
  constructor(geometry) {
    this.k = 0;
    this.sum = new Uint32Array(geometry);
    this.mean = new Uint8Array(geometry);
  }

  isFull(chunkCapacity) {
    return this.k >= chunkCapacity;
  }

  addBytes(bytes) {
    const D = this.sum.length;
    for (let i = 0; i < D; i++) this.sum[i] += bytes[i];
    this.k += 1;
    for (let i = 0; i < D; i++) this.mean[i] = Math.round(this.sum[i] / this.k);
  }

  xorInPlace(bytes) {
    const D = this.sum.length;
    for (let i = 0; i < D; i++) this.mean[i] ^= bytes[i];
    for (let i = 0; i < D; i++) this.sum[i] = this.mean[i] * this.k;
  }

  clone() {
    const c = new MeanChunk(this.sum.length);
    c.k = this.k;
    c.sum.set(this.sum);
    c.mean.set(this.mean);
    return c;
  }

  serialize() {
    return {
      k: this.k,
      sum: Array.from(this.sum),
      mean: Array.from(this.mean)
    };
  }

  static deserialize(obj, geometry) {
    const c = new MeanChunk(geometry);
    c.k = obj.k;
    c.sum.set(obj.sum);
    c.mean.set(obj.mean);
    return c;
  }
}

function summarizeChunks(chunks, geometry) {
  if (!chunks || chunks.length === 0) return new Uint8Array(geometry);
  let totalK = 0;
  const globalSum = new Uint32Array(geometry);
  for (const c of chunks) {
    totalK += c.k;
    for (let i = 0; i < geometry; i++) globalSum[i] += c.sum[i];
  }
  const out = new Uint8Array(geometry);
  if (totalK <= 0) return out;
  for (let i = 0; i < geometry; i++) out[i] = Math.round(globalSum[i] / totalK);
  return out;
}

class ElasticMetricAffineVector {
  constructor(geometry = DEFAULT_DIMENSIONS, data = null, chunks = null, chunkCapacity = DEFAULT_CHUNK_CAPACITY) {
    this.geometry = geometry;
    this.data = data || new Uint8Array(geometry);
    this.chunks = chunks; // null for atomic; Array<MeanChunk> for bundle
    this.chunkCapacity = chunkCapacity;
    this.strategyId = 'metric-affine-elastic';
  }

  isBundle() {
    return Array.isArray(this.chunks) && this.chunks.length > 0;
  }

  clone() {
    const data = new Uint8Array(this.geometry);
    data.set(this.data);
    const chunks = this.chunks ? this.chunks.map(c => c.clone()) : null;
    return new ElasticMetricAffineVector(this.geometry, data, chunks, this.chunkCapacity);
  }

  notInPlace() {
    for (let i = 0; i < this.geometry; i++) {
      this.data[i] = MAX_BYTE - this.data[i];
    }
    if (this.chunks) {
      for (const chunk of this.chunks) {
        for (let i = 0; i < this.geometry; i++) {
          chunk.mean[i] = MAX_BYTE - chunk.mean[i];
        }
        for (let i = 0; i < this.geometry; i++) {
          chunk.sum[i] = chunk.mean[i] * chunk.k;
        }
      }
    }
    return this;
  }

  not() {
    return this.clone().notInPlace();
  }

  equals(other) {
    if (!other || other.strategyId !== this.strategyId) return false;
    if (other.geometry !== this.geometry) return false;
    if (!!this.chunks !== !!other.chunks) return false;
    if (!this.chunks) {
      for (let i = 0; i < this.geometry; i++) {
        if (this.data[i] !== other.data[i]) return false;
      }
      return true;
    }
    if (this.chunks.length !== other.chunks.length) return false;
    for (let ci = 0; ci < this.chunks.length; ci++) {
      const a = this.chunks[ci];
      const b = other.chunks[ci];
      if (a.k !== b.k) return false;
      for (let i = 0; i < this.geometry; i++) {
        if (a.mean[i] !== b.mean[i]) return false;
      }
    }
    return true;
  }

  serialize() {
    return {
      strategyId: this.strategyId,
      version: 1,
      geometry: this.geometry,
      data: Array.from(this.data),
      chunkCapacity: this.chunkCapacity,
      chunks: this.chunks ? this.chunks.map(c => c.serialize()) : null
    };
  }

  static deserialize(obj) {
    const geometry = obj.geometry;
    const data = new Uint8Array(geometry);
    data.set(obj.data);
    const chunks = obj.chunks
      ? obj.chunks.map(c => MeanChunk.deserialize(c, geometry))
      : null;
    return new ElasticMetricAffineVector(geometry, data, chunks, obj.chunkCapacity ?? DEFAULT_CHUNK_CAPACITY);
  }

  static zeros(geometry) {
    return new ElasticMetricAffineVector(geometry);
  }

  static random(geometry, randomFn = Math.random) {
    const data = new Uint8Array(geometry);
    for (let i = 0; i < geometry; i++) data[i] = Math.floor(randomFn() * 256);
    return new ElasticMetricAffineVector(geometry, data);
  }
}

const properties = {
  id: 'metric-affine-elastic',
  displayName: 'Elastic Metric-Affine (Z256^D, chunked mean)',
  defaultGeometry: DEFAULT_DIMENSIONS,
  recommendedBundleCapacity: DEFAULT_CHUNK_CAPACITY,
  maxBundleCapacity: 2048,
  bytesPerVector: (geometry) => geometry,
  bindComplexity: 'O(n)',
  sparseOptimized: false,
  description: 'Metric-affine XOR + L1, with chunked mean bundling (bounded depth)'
};

export const REASONING_THRESHOLDS = {
  SIMILARITY: 0.665,
  HDC_MATCH: 0.75,
  VERIFICATION: 0.70,
  ANALOGY_MIN: 0.75,
  ANALOGY_MAX: 0.98,
  RULE_MATCH: 0.90,
  CONCLUSION_MATCH: 0.80,

  DIRECT_MATCH: 0.95,
  TRANSITIVE_BASE: 0.9,
  TRANSITIVE_DECAY: 0.98,
  TRANSITIVE_DEPTH_DECAY: 0.05,
  CONFIDENCE_DECAY: 0.95,
  RULE_CONFIDENCE: 0.85,
  CONDITION_CONFIDENCE: 0.9,
  DISJOINT_CONFIDENCE: 0.95,
  DEFAULT_CONFIDENCE: 0.8,

  INDUCTION_MIN: 0.75,
  INDUCTION_PATTERN: 0.70,

  ANALOGY_DISCOUNT: 0.7,
  ABDUCTION_SCORE: 0.7,
  STRONG_MATCH: 0.80,
  VERY_STRONG_MATCH: 0.88,

  BUNDLE_COMMON_SCORE: 0.90
};

export const HOLOGRAPHIC_THRESHOLDS = {
  UNBIND_MIN_SIMILARITY: 0.70,
  UNBIND_MAX_CANDIDATES: 10,
  CSP_HEURISTIC_WEIGHT: 0.7,
  VALIDATION_REQUIRED: true,
  FALLBACK_TO_SYMBOLIC: true
};

function createZero(geometry = DEFAULT_DIMENSIONS) {
  return ElasticMetricAffineVector.zeros(geometry);
}

function createRandom(geometry = DEFAULT_DIMENSIONS, seed = null) {
  if (seed === null) return ElasticMetricAffineVector.random(geometry);
  const prng = new PRNG(seed);
  const data = new Uint8Array(geometry);
  for (let i = 0; i < geometry; i++) data[i] = prng.randomUint32() & 0xFF;
  return new ElasticMetricAffineVector(geometry, data);
}

function createFromName(name, geometry = DEFAULT_DIMENSIONS, theoryId = 'default') {
  const scopedName = `${theoryId}:${name}`;
  const seed = djb2(scopedName);
  const prng = new PRNG(seed);

  const data = new Uint8Array(geometry);
  for (let i = 0; i < geometry; i++) data[i] = prng.randomUint32() & 0xFF;
  for (let i = 0; i < Math.min(name.length, geometry); i++) data[i] ^= name.charCodeAt(i) & 0xFF;
  return new ElasticMetricAffineVector(geometry, data);
}

function deserialize(serialized) {
  if (serialized.strategyId !== 'metric-affine-elastic') {
    throw new Error(`Cannot deserialize ${serialized.strategyId} with metric-affine-elastic strategy`);
  }
  return ElasticMetricAffineVector.deserialize(serialized);
}

function clone(v) {
  return v.clone();
}

function equals(a, b) {
  return a.equals(b);
}

function serialize(v) {
  return v.serialize();
}

function bindAtomicAtomic(a, b) {
  const out = new Uint8Array(a.geometry);
  xorBytes(out, a.data, b.data);
  return new ElasticMetricAffineVector(a.geometry, out, null, a.chunkCapacity);
}

function bindBundleAtomic(bundleVec, atomicVec) {
  const keyBytes = atomicVec.data;
  const chunks = bundleVec.chunks.map(c => {
    const cc = c.clone();
    cc.xorInPlace(keyBytes);
    return cc;
  });
  const data = summarizeChunks(chunks, bundleVec.geometry);
  return new ElasticMetricAffineVector(bundleVec.geometry, data, chunks, bundleVec.chunkCapacity);
}

function bind(a, b) {
  assertSameGeometry(a, b);
  const aIsBundle = a.isBundle?.() ?? false;
  const bIsBundle = b.isBundle?.() ?? false;

  if (!aIsBundle && !bIsBundle) return bindAtomicAtomic(a, b);
  if (aIsBundle && !bIsBundle) return bindBundleAtomic(a, b);
  if (!aIsBundle && bIsBundle) return bindBundleAtomic(b, a);
  if (!aIsBundle && bIsBundle) return bindBundleAtomic(b, a);
  return bindBundleBundle(a, b);
}

function bindBundleBundle(a, b) {
  const resultChunks = [];
  // Cross-product of chunks: size = a.chunks.length * b.chunks.length
  // This can explode if bundles are large, but necessary for correctness of superposition binding.
  for (const chunkA of a.chunks) {
    for (const chunkB of b.chunks) {
      // Create a new chunk representing the binding of the two source chunks
      // We start with k=1 to treat the bound result as a distinct new point
      const newChunk = new MeanChunk(a.geometry);

      // Perform XOR of the means
      for (let i = 0; i < a.geometry; i++) {
        newChunk.mean[i] = chunkA.mean[i] ^ chunkB.mean[i];
      }

      // Initialize sum and k
      newChunk.k = 1;
      for (let i = 0; i < a.geometry; i++) {
        newChunk.sum[i] = newChunk.mean[i];
      }

      resultChunks.push(newChunk);
    }
  }

  // Summarize the chunks to update the main data vector
  const data = summarizeChunks(resultChunks, a.geometry);

  // Return new vector with the combined chunks
  // We use the larger capacity of the two to be safe
  const capacity = Math.max(a.chunkCapacity, b.chunkCapacity);
  return new ElasticMetricAffineVector(a.geometry, data, resultChunks, capacity);
}

function unbind(composite, component) {
  return bind(composite, component);
}

function appendAtomicToChunks(chunks, atomic, chunkCapacity) {
  const last = chunks.length > 0 ? chunks[chunks.length - 1] : null;
  if (last && !last.isFull(chunkCapacity)) {
    last.addBytes(atomic.data);
    return;
  }
  const c = new MeanChunk(atomic.geometry);
  c.addBytes(atomic.data);
  chunks.push(c);
}

function bundle(vectors, tieBreaker = null) {
  if (!Array.isArray(vectors) || vectors.length === 0) {
    throw new Error('bundle requires at least one vector');
  }
  if (vectors.length === 1) return clone(vectors[0]);

  const geometry = vectors[0].geometry;
  const chunkCapacity = vectors[0].chunkCapacity ?? DEFAULT_CHUNK_CAPACITY;
  const chunks = [];

  for (const v of vectors) {
    if (v.geometry !== geometry) throw new Error('All vectors must have same geometry');
    const isBundle = v.isBundle?.() ?? false;
    if (isBundle) {
      // No nested bundling: carry chunk means forward as-is.
      for (const c of v.chunks) chunks.push(c.clone());
      continue;
    }
    appendAtomicToChunks(chunks, v, chunkCapacity);
  }

  const data = summarizeChunks(chunks, geometry);
  return new ElasticMetricAffineVector(geometry, data, chunks, chunkCapacity);
}

function similarityAtomicAtomic(a, b) {
  return l1SimilarityBytes(a.data, b.data);
}

function similarityBundleAtomic(bundleVec, atomicVec) {
  let best = 0;
  for (const c of bundleVec.chunks) {
    const sim = l1SimilarityBytes(c.mean, atomicVec.data);
    if (sim > best) best = sim;
    if (best >= 1) return 1;
  }
  return best;
}

function similarity(a, b) {
  assertSameGeometry(a, b);
  const aIsBundle = a.isBundle?.() ?? false;
  const bIsBundle = b.isBundle?.() ?? false;
  if (!aIsBundle && !bIsBundle) return similarityAtomicAtomic(a, b);
  if (aIsBundle && !bIsBundle) return similarityBundleAtomic(a, b);
  if (!aIsBundle && bIsBundle) return similarityBundleAtomic(b, a);

  // Bundle ↔ Bundle (rare): max over chunk means.
  const outer = a.chunks.length <= b.chunks.length ? a : b;
  const inner = outer === a ? b : a;
  let best = 0;
  for (const ca of outer.chunks) {
    for (const cb of inner.chunks) {
      const sim = l1SimilarityBytes(ca.mean, cb.mean);
      if (sim > best) best = sim;
      if (best >= 1) return 1;
    }
  }
  return best;
}

function topKSimilar(query, vocabulary, k = 5, session = null) {
  const results = [];
  const entries = vocabulary instanceof Map ? vocabulary.entries() : Object.entries(vocabulary);
  for (const [name, vec] of entries) {
    if (session?.reasoningStats) session.reasoningStats.similarityChecks++;
    results.push({ name, similarity: similarity(query, vec) });
  }
  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, k);
}

function distance(a, b) {
  return 1 - similarity(a, b);
}

function isOrthogonal(a, b, threshold = 0.05) {
  const sim = similarity(a, b);
  const baseline = 0.665;
  return Math.abs(sim - baseline) < threshold;
}

function bindAll(...vectors) {
  if (vectors.length === 0) throw new Error('bindAll requires at least one vector');
  if (vectors.length === 1) return clone(vectors[0]);
  let result = clone(vectors[0]);
  for (let i = 1; i < vectors.length; i++) result = bind(result, vectors[i]);
  return result;
}

function serializeKB(facts) {
  if (!facts || facts.length === 0) {
    return { strategyId: 'metric-affine-elastic', version: 1, geometry: 0, count: 0, facts: [] };
  }
  const geometry = facts[0].vector.geometry;
  return {
    strategyId: 'metric-affine-elastic',
    version: 1,
    geometry,
    count: facts.length,
    facts: facts.map(f => ({
      vector: serialize(f.vector),
      name: f.name || null,
      metadata: f.metadata || null
    }))
  };
}

function deserializeKB(serialized) {
  if (!serialized || !serialized.facts || serialized.count === 0) return [];
  return serialized.facts.map(f => ({
    vector: deserialize(f.vector),
    name: f.name,
    metadata: f.metadata
  }));
}

export const metricAffineElasticStrategy = {
  id: 'metric-affine-elastic',
  properties,

  thresholds: REASONING_THRESHOLDS,
  holographicThresholds: HOLOGRAPHIC_THRESHOLDS,

  createZero,
  createRandom,
  createFromName,
  deserialize,

  bind,
  bindAll,
  bundle,
  similarity,
  unbind,

  clone,
  equals,
  serialize,
  topKSimilar,
  distance,
  isOrthogonal,

  serializeKB,
  deserializeKB,

  Vector: ElasticMetricAffineVector
};

export default metricAffineElasticStrategy;
