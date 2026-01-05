# Module: src/hdc/strategies/metric-affine-elastic.mjs

**Document Version:** 1.0  
**Status:** Proposed  
**Traces To:** DS23-Elastic-Metric-Affine-HDC  

---

## 1. Purpose

Implements **Elastic Metric-Affine (EMA)** as an HDC strategy:

- Storage: `Uint8Array(D)` with `D` byte channels (default 32)
- Bind/unbind: byte-wise XOR
- Similarity: normalized L₁ similarity (baseline ≈ 0.665)
- Bundle: chunked arithmetic-mean superposition (bounded depth)

Strategy ID: `metric-affine-elastic`.

---

## 2. Strategy Properties (expected)

```js
{
  id: 'metric-affine-elastic',
  displayName: 'Elastic Metric-Affine (Z256^D, chunked mean)',
  defaultGeometry: 32,                // bytes
  recommendedBundleCapacity: 32,      // chunk size B (default)
  maxBundleCapacity: 2048,            // depends on configured max geometry / memory
  bytesPerVector: (geometry) => geometry,
  bindComplexity: 'O(D)',
  sparseOptimized: false,
  description: 'Metric-affine XOR + L1, with chunked bundling and optional elastic geometry'
}
```

---

## 3. Internal Vector Class (expected)

EMA vectors should remain compatible with runtime expectations:

- `strategyId` string present
- `geometry` numeric
- `data` present as a `Uint8Array` (summary representation)
- `clone()` instance method present (used by `Session.addToKB`)

Proposed internal representation:

```js
class ElasticMetricAffineVector {
  constructor(geometry, data?: Uint8Array, chunks?: Array<{ mean: Uint8Array, k: number }>)
  geometry: number
  data: Uint8Array
  chunks: null | Array<Chunk>     // null for atomic vectors
  strategyId: 'metric-affine-elastic'

  clone(): ElasticMetricAffineVector
  equals(other): boolean
  serialize(): object
  static deserialize(obj): ElasticMetricAffineVector
}
```

Where `chunks !== null` indicates a “bundle-like” vector whose operational semantics are defined by its chunk means.

---

## 4. Core Operations

### 4.1 bind(a, b) / unbind(composite, component)

- Atomic BIND atomic → atomic
- Bundle BIND atomic → bundle (apply XOR to each chunk mean; update summary `data`)
- Bundle BIND bundle → implementation-defined (must be documented; ideally avoided in core pipelines)

### 4.2 bundle(vectors)

Returns a bundle-like vector with chunked means:

- partitions inputs into chunks of size `B`
- each chunk stores `{k, mean}`
- merges bundle inputs by concatenating chunks (no bundling of means)

### 4.3 similarity(a, b)

- Atomic ↔ atomic: normalized L₁
- Bundle ↔ atomic: `max_j sim(mean_j, atomic)`
- Bundle ↔ bundle: `max_{i,j} sim(mean_i, mean_j)` (or documented approximation)

---

## 5. Thresholds

EMA thresholds should be strategy-specific exports (mirroring `metric-affine.mjs`) and wired into `src/core/constants.mjs` mappings.

Baseline note: random similarity ≈ 0.665.

---

*End of Module Specification*
