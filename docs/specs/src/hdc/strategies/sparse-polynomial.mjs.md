# Module: src/hdc/strategies/sparse-polynomial.mjs

**Document Version:** 1.0
**Status:** Implemented
**Traces To:** DS15-Sparse-Polynomial-HDC

---

## 1. Purpose

Sparse Polynomial Hyperdimensional Computing (SPHDC) strategy. Uses polynomial rings over finite fields for memory-efficient vector representation with different mathematical properties than dense-binary.

---

## 2. Theory

### 2.1 Representation

Instead of dense binary vectors, SPHDC uses:
- **Sparse representation**: Only non-zero coefficients stored
- **Polynomial rings**: Elements from finite field GF(p)
- **Efficient storage**: O(k) where k << n (sparsity)

### 2.2 Mathematical Foundation

```
Vector: f(x) = a₁x^{i₁} + a₂x^{i₂} + ... + aₖx^{iₖ}

Where:
- aᵢ ∈ GF(p) (finite field)
- iⱼ ∈ [0, maxSize)
- k = number of non-zero terms (sparsity)
```

---

## 3. Public API

```javascript
export class SparsePolynomialVector {
  constructor(maxSize: number, data?: Map<number, number>)

  // Properties
  maxSize: number          // Maximum polynomial degree
  data: Map<number, number> // Sparse coefficient storage

  // Serialization
  serialize(): object
  static deserialize(obj: object): SparsePolynomialVector
}

// HDC Contract Implementation
export const sparsePolynomialStrategy = {
  id: 'sparse-polynomial',
  defaultGeometry: 65536,

  // Factory
  createZero(geometry: number): SparsePolynomialVector
  createRandom(geometry: number, seed?: number): SparsePolynomialVector
  createFromName(name: string, geometry: number, theoryId?: string): SparsePolynomialVector

  // Core Operations
  bind(a: SparsePolynomialVector, b: SparsePolynomialVector): SparsePolynomialVector
  bundle(vectors: SparsePolynomialVector[], tieBreaker?: Function): SparsePolynomialVector
  similarity(a: SparsePolynomialVector, b: SparsePolynomialVector): number
  unbind(composite: SparsePolynomialVector, component: SparsePolynomialVector): SparsePolynomialVector

  // Utilities
  clone(v: SparsePolynomialVector): SparsePolynomialVector
  equals(a: SparsePolynomialVector, b: SparsePolynomialVector): boolean
  isVector(v: any): boolean
}
```

---

## 4. Operations

### 4.1 Bind (Polynomial Multiplication)

```javascript
// Multiplication in polynomial ring modulo x^n - 1
bind(a, b) → c where c(x) = a(x) * b(x) mod (x^n - 1)
```

Properties:
- Associative: bind(bind(a,b),c) = bind(a,bind(b,c))
- Commutative: bind(a,b) = bind(b,a)
- Has identity (constant 1)
- Self-inverse for certain constructions

### 4.2 Bundle (Coefficient Addition)

```javascript
// Component-wise addition in GF(p)
bundle([v1, v2, ...]) → sum of coefficient vectors
```

Properties:
- Superposition preserves sparsity (approximately)
- Majority voting for large bundles

### 4.3 Similarity (Jaccard-like)

```javascript
// Based on common non-zero positions
similarity(a, b) → |common positions| / |union positions|
```

---

## 5. Thresholds

```javascript
// From sparse-polynomial-thresholds.mjs
export const REASONING_THRESHOLDS = {
  SIMILARITY_THRESHOLD: 0.3,     // Lower than dense-binary
  STRONG_CONFIDENCE: 0.5,
  ORTHOGONAL_THRESHOLD: 0.2,
  QUERY_MIN_SIMILARITY: 0.25,
  PROOF_MIN_CONFIDENCE: 0.35
};

export const HOLOGRAPHIC_THRESHOLDS = {
  UNBIND_MIN_SIMILARITY: 0.25,
  UNBIND_MAX_CANDIDATES: 15,
  CSP_HEURISTIC_WEIGHT: 0.6,
  VALIDATION_REQUIRED: true,
  FALLBACK_TO_SYMBOLIC: true
};
```

---

## 6. Usage

```javascript
import { Session } from 'agisystem2';

// Create session with sparse-polynomial strategy
const session = new Session({
  hdcStrategy: 'sparse-polynomial',
  geometry: 65536  // Higher dimension typical for SPHDC
});

// Or via environment variable
// SYS2_HDC_STRATEGY=sparse-polynomial node app.mjs
```

---

## 7. Comparison with Dense-Binary

| Aspect | Dense-Binary | Sparse-Polynomial |
|--------|--------------|-------------------|
| Storage | O(n) bits | O(k) integers |
| Bind | XOR (O(n)) | Polynomial mult (O(k²)) |
| Bundle | Majority (O(n)) | Addition (O(k)) |
| Similarity | Hamming | Jaccard |
| Memory | 4KB @ 32K | Variable (sparse) |
| Random baseline | ~0.5 | ~0.0 |
| Typical geometry | 32K | 64K+ |

---

## 8. Dependencies

- `../../util/prng.mjs` - Random number generation
- `../../util/hash.mjs` - Hashing for deterministic init

---

## 9. Test Cases

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| SPHDC-01 | Create vector | Valid sparse vector |
| SPHDC-02 | Bind operation | Polynomial multiplication |
| SPHDC-03 | Bundle operation | Coefficient sum |
| SPHDC-04 | Similarity | Jaccard-like metric |
| SPHDC-05 | Self-similarity | 1.0 |
| SPHDC-06 | Random orthogonality | sim < 0.2 |
| SPHDC-07 | Deterministic init | Same name = same vector |
| SPHDC-08 | Serialize/deserialize | Round-trip works |

---

*End of Module Specification*
