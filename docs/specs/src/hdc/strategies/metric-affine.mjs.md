# Module: src/hdc/strategies/metric-affine.mjs

**Document Version:** 1.0
**Status:** Implemented
**Traces To:** DS18-Metric-Affine-HDC

---

## 1. Purpose

Metric-Affine HDC strategy using continuous-valued vectors with Euclidean-like operations. Provides different mathematical properties than binary or polynomial approaches.

---

## 2. Theory

### 2.1 Representation

- **Storage**: `Uint8Array` with 8-bit values [0-255]
- **Interpretation**: Continuous values normalized to [0, 1]
- **Geometry**: Number of dimensions (typically 32K-64K)

### 2.2 Mathematical Foundation

```
Vector: v = [v₁, v₂, ..., vₙ] where vᵢ ∈ [0, 255]

Operations based on:
- L₁ distance (Manhattan)
- Component-wise arithmetic
- Affine transformations
```

---

## 3. Public API

```javascript
export class MetricAffineVector {
  constructor(geometry: number, data?: Uint8Array)

  // Properties
  geometry: number      // Vector dimension
  data: Uint8Array     // Raw storage

  // Serialization
  serialize(): object
  static deserialize(obj: object): MetricAffineVector
}

// HDC Contract Implementation
export const metricAffineStrategy = {
  id: 'metric-affine',
  defaultGeometry: 32768,

  // Factory
  createZero(geometry: number): MetricAffineVector
  createRandom(geometry: number, seed?: number): MetricAffineVector
  createFromName(name: string, geometry: number, theoryId?: string): MetricAffineVector

  // Core Operations
  bind(a: MetricAffineVector, b: MetricAffineVector): MetricAffineVector
  bundle(vectors: MetricAffineVector[], tieBreaker?: Function): MetricAffineVector
  similarity(a: MetricAffineVector, b: MetricAffineVector): number
  unbind(composite: MetricAffineVector, component: MetricAffineVector): MetricAffineVector

  // Utilities
  clone(v: MetricAffineVector): MetricAffineVector
  equals(a: MetricAffineVector, b: MetricAffineVector): boolean
  isVector(v: any): boolean
}
```

---

## 4. Operations

### 4.1 Bind (Modular Addition)

```javascript
// Component-wise addition modulo 256
bind(a, b)[i] = (a[i] + b[i]) % 256
```

Properties:
- Associative
- Commutative
- Has identity (zero vector)
- Inverse exists: unbind(a, a) = zero

### 4.2 Bundle (Mean/Centroid)

```javascript
// Component-wise mean
bundle([v1, v2, ...])[i] = round(mean(v1[i], v2[i], ...))
```

Properties:
- Superposition as centroid
- Preserves neighborhood relationships

### 4.3 Similarity (L₁-based)

```javascript
// Normalized L₁ distance converted to similarity
similarity(a, b) = 1 - (L₁(a, b) / (geometry * 255))

L₁(a, b) = Σ|a[i] - b[i]|
```

---

## 5. Thresholds

```javascript
// Included in metric-affine.mjs
export const REASONING_THRESHOLDS = {
  SIMILARITY_THRESHOLD: 0.85,    // Higher than binary (L₁ metric)
  STRONG_CONFIDENCE: 0.92,
  ORTHOGONAL_THRESHOLD: 0.75,
  QUERY_MIN_SIMILARITY: 0.80,
  PROOF_MIN_CONFIDENCE: 0.88
};

export const HOLOGRAPHIC_THRESHOLDS = {
  UNBIND_MIN_SIMILARITY: 0.78,
  UNBIND_MAX_CANDIDATES: 8,
  CSP_HEURISTIC_WEIGHT: 0.75,
  VALIDATION_REQUIRED: true,
  FALLBACK_TO_SYMBOLIC: true
};
```

---

## 6. Usage

```javascript
import { Session } from 'agisystem2';

// Create session with metric-affine strategy
const session = new Session({
  hdcStrategy: 'metric-affine',
  geometry: 32768
});

// Or via environment variable
// SYS2_HDC_STRATEGY=metric-affine node app.mjs
```

---

## 7. Comparison with Other Strategies

| Aspect | Dense-Binary | Sparse-Polynomial | Metric-Affine |
|--------|--------------|-------------------|---------------|
| Storage | 1 bit/dim | Variable | 8 bits/dim |
| Bind | XOR | Polynomial mult | Modular add |
| Bundle | Majority | Coeff sum | Mean |
| Similarity | Hamming | Jaccard | L₁ |
| Memory @ 32K | 4 KB | Variable | 32 KB |
| Random baseline | ~0.5 | ~0.0 | ~0.5 |
| Precision | Binary | Integer | 8-bit |

---

## 8. Use Cases

Metric-affine is particularly suited for:
- **Continuous similarity gradients** (fine-grained ranking)
- **Interpolation** between concepts
- **Metric learning** applications
- **Integration with embedding models**

Less suited for:
- Memory-constrained environments
- Applications requiring exact matching

---

## 9. Dependencies

- `../../util/prng.mjs` - Random number generation
- `../../util/hash.mjs` - Hashing for deterministic init

---

## 10. Test Cases

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| MAFF-01 | Create vector | Valid Uint8Array |
| MAFF-02 | Bind operation | Modular addition |
| MAFF-03 | Bundle operation | Component mean |
| MAFF-04 | Similarity | L₁-based metric |
| MAFF-05 | Self-similarity | 1.0 |
| MAFF-06 | Random orthogonality | sim ~0.5 |
| MAFF-07 | Deterministic init | Same name = same vector |
| MAFF-08 | Serialize/deserialize | Round-trip works |
| MAFF-09 | Unbind inverse | bind(unbind(c,a),a) ≈ c |
| MAFF-10 | Memory footprint | 32KB for 32K geometry |

---

*End of Module Specification*
