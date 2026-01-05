# AGISystem2 - System Specifications

# Chapter 18: Metric-Affine HDC Strategy

**Document Version:** 1.0
**Author:** Sînică Alboaie
**Status:** Implemented
**Audience:** Technical Architects, HDC Researchers, Core Developers

---

## 1. Executive Summary

This document specifies the **Metric-Affine HDC Strategy** — a compact hyperdimensional computing approach that represents concepts as **byte vectors** over Z₂₅₆ (integers 0-255), using XOR for binding and L₁ (Manhattan) distance for similarity.

In AGISystem2 terms, the strategy’s **geometry** is:

- `D` = the number of byte channels per vector (`Uint8Array(D)`)
- **memory per atomic vector = `D` bytes**
- default `D = 32` (so “32 bytes” is the default configuration, not a hard limit)

**Key Innovation:** Metric-Affine provides a middle ground between dense-binary (4KB vectors) and sparse-polynomial (32 bytes) with continuous fuzzy values instead of binary.

**Design Characteristics:**
- **Memory:** `D` bytes per vector (default 32; typically 8/16/32/64/128)
- **Baseline Similarity:** ~0.67 (different from standard 0.5)
- **Bundle Behavior:** Arithmetic mean (fuzzy superposition)
- **Metric:** Manhattan L₁ distance

---

## 2. Mathematical Foundation

### 2.1 Core Structure

The Metric-Affine algebra operates on Z₂₅₆ᴰ (Fuzzy-Boolean Hyper-Lattice), where `D` is the geometry:

| Component | Definition |
|-----------|------------|
| **Space** | Z₂₅₆ᴰ (`D` dimensions × 8 bits) |
| **Bind** | XOR component-wise (abelian group) |
| **Bundle** | Arithmetic mean with clamp to [0,255] |
| **Metric** | Manhattan L₁ distance |
| **Cardinality** | 256ᴰ possible states |

### 2.2 Vector Representation

```
┌─────────────────────────────────────────────────────────────┐
│  Metric-Affine Vector: D bytes (example shown at D = 32)     │
├─────────────────────────────────────────────────────────────┤
│  [b₀][b₁][b₂][b₃]...[b₃₀][b₃₁]  where bᵢ ∈ {0..255}        │
├─────────────────────────────────────────────────────────────┤
│  Storage: Uint8Array(D) = D bytes                           │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Algebraic Properties

**Bind (XOR):**
- Associative: (A BIND B) BIND C = A BIND (B BIND C)
- Commutative: A BIND B = B BIND A
- XOR cancellation: A BIND A = 0 (zero vector)
- XOR cancellation (bind with same key): (A BIND B) BIND B = A

**Bundle (Mean):**
- Idempotent for single vector: bundle([A]) = A
- Commutative: bundle([A, B]) = bundle([B, A])
- Non-associative: bundle([bundle([A,B]), C]) ≠ bundle([A, B, C]) in general
- Convergent: Repeated bundling converges toward center of space

**Similarity:**
- Reflexive: sim(A, A) = 1.0
- Symmetric: sim(A, B) = sim(B, A)
- Range: [0, 1] with baseline ~0.67 for random vectors

---

## 3. Operations Specification

### 3.1 Bind (XOR Component-wise)

```javascript
function bind(a, b) {
  const D = a.geometry;
  const result = new Uint8Array(D);
  for (let i = 0; i < D; i++) {
    result[i] = a.data[i] ^ b.data[i];
  }
  return result;
}
```

**Properties Verified:**
- `bind(a, a)` produces zero vector ✓
- `bind(bind(a, b), b)` equals `a` exactly ✓

### 3.2 Bundle (Arithmetic Mean)

```javascript
function bundle(vectors) {
  const D = vectors[0].geometry;
  const result = new Uint8Array(D);
  for (let i = 0; i < D; i++) {
    let sum = 0;
    for (const v of vectors) {
      sum += v.data[i];
    }
    result[i] = Math.min(255, Math.max(0, Math.round(sum / vectors.length)));
  }
  return result;
}
```

**Bundle Capacity:**

| Vectors Bundled | Similarity to Each | Quality |
|-----------------|-------------------|---------|
| 3 | ~0.80 | Excellent |
| 10 | ~0.75 | Good |
| 30 | ~0.72 | Usable |
| 50 | ~0.70 | Marginal |
| 100+ | ~0.68 | Near baseline |

**Note:** Unlike binary majority vote, arithmetic mean bundling can experience "gray convergence" - values drift toward 128 over repeated bundling operations.

### 3.3 Similarity (Normalized L₁)

```javascript
function similarity(a, b) {
  const D = a.geometry;
  let l1 = 0;
  for (let i = 0; i < D; i++) {
    l1 += Math.abs(a.data[i] - b.data[i]);
  }
  const maxL1 = D * 255;
  return 1 - (l1 / maxL1);
}
```

**Expected Values:**
- Identical vectors: 1.0
- Random vectors: ~0.67 (NOT 0.5!)
- Inverse vectors: ~0.33

**Mathematical Derivation:**
```
For X, Y ~ Uniform(0, 255):
  E[|X - Y|] = (256² - 1) / (3 × 256) ≈ 85.33

Expected L₁ = D × 85.33
max L₁ = D × 255

Similarity = 1 - (D × 85.33) / (D × 255) ≈ 0.665
```

**Important note:** the expected *baseline* similarity is approximately constant in `D`, but increasing `D` typically tightens the distribution (lower variance), which can change practical margins and threshold tuning.

---

## 4. Holographic Properties

### 4.1 Dense HRR Characteristics

| Criterion | Mechanism |
|-----------|-----------|
| **Distribution** | Information encoded across all 32 channels |
| **Graceful Degradation** | Losing k channels preserves relative distances |
| **Holistic Composition** | XOR modulates A with B across full width |
| **Native Transform** | Walsh-Hadamard implicit (no FFT needed) |

### 4.2 Limitations

- Resolution "lower" than classic HRR at default `D=32` (classic HRR often uses 10,000+ dimensions)
- Capacity: ~30-50 superposed concepts before significant interference
- Baseline similarity ~0.67 requires adjusted thresholds

---

## 5. Comparison with Other Strategies

| Aspect | Dense-Binary | SPHDC | Metric-Affine |
|--------|--------------|-------|---------------|
| **Space** | {0,1}^32768 | Set<BigInt> k=4 | Z₂₅₆³² |
| **Memory** | 4 KB | 32 bytes | 32 bytes |
| **Bind** | XOR bitwise | Cartesian XOR | XOR byte-wise |
| **Bundle** | Majority vote | Set union | Arithmetic mean |
| **Similarity** | Hamming | Jaccard | L₁ Manhattan |
| **Baseline** | 0.5 | ~0.01 | ~0.67 |
| **Holographic** | Yes (classic) | Limited | Yes (fuzzy) |
| **Best For** | General HDC | Symbolic only | Fuzzy reasoning |

---

## 6. Thresholds

### 6.1 Reasoning Thresholds

Due to the higher baseline (~0.67), all similarity thresholds are shifted:

| Threshold | Value | Purpose |
|-----------|-------|---------|
| SIMILARITY | 0.67 | Baseline for random |
| HDC_MATCH | 0.72 | Minimum for HDC retrieval |
| VERIFICATION | 0.70 | Minimum for verification |
| STRONG_MATCH | 0.75 | High confidence match |
| VERY_STRONG_MATCH | 0.85 | Near-identical |

### 6.2 Holographic Thresholds

| Threshold | Value |
|-----------|-------|
| UNBIND_MIN_SIMILARITY | 0.70 |
| UNBIND_MAX_CANDIDATES | 10 |
| CSP_HEURISTIC_WEIGHT | 0.7 |

**Note:** These values are initial estimates. Calibration against the evaluation suite may adjust them.

---

## 7. Contract Considerations

### 7.1 Standard Contract Deviation

The metric-affine strategy does NOT satisfy the standard `HDC_CONTRACT` due to:
- `RANDOM_BASELINE_SIMILARITY: 0.67` (expected 0.5 ± 0.05)

### 7.2 Metric-Affine Contract

A separate contract `METRIC_AFFINE_CONTRACT` is defined in `src/hdc/metric-affine-contract.mjs`:

```javascript
export const METRIC_AFFINE_CONTRACT = {
  BIND_SELF_INVERSE: true,
  BIND_ASSOCIATIVE: true,
  BIND_COMMUTATIVE: true,
  SIMILARITY_REFLEXIVE: true,
  SIMILARITY_SYMMETRIC: true,
  SIMILARITY_RANGE: [0, 1],
  RANDOM_BASELINE_SIMILARITY: { expected: 0.67, tolerance: 0.05 },
  BUNDLE_RETRIEVABLE: true
};
```

---

## 8. Implementation

### 8.1 File Structure

```
src/hdc/strategies/
├── metric-affine.mjs           # Strategy implementation + thresholds
└── index.mjs                   # Registers strategy

src/hdc/
└── metric-affine-contract.mjs  # Separate contract for validation
```

### 8.2 Usage

**Environment Variable:**
```bash
export SYS2_HDC_STRATEGY=metric-affine
```

**Programmatic:**
```javascript
import { initHDC, setDefaultGeometry } from './src/hdc/facade.mjs';
import { Session } from './src/runtime/session.mjs';

initHDC('metric-affine');
setDefaultGeometry(32);

const session = new Session({ geometry: 32 });
session.learn('isA Dog Animal');
session.query('isA Dog ?what');
```

---

## 9. Use Cases

### 9.1 Ideal For

1. **Fuzzy Reasoning** - Continuous values enable graded similarity
2. **Compact Storage** - 32 bytes ideal for embedded systems
3. **Low-Dimensional Holography** - When full HRR is overkill
4. **Privacy-Sensitive** - Smaller vectors = less information exposure

### 9.2 Not Ideal For

1. **Large Knowledge Bases** - Bundle capacity limited (~50 concepts)
2. **Precise Retrieval** - High baseline means lower discrimination
3. **Deep Transitive Chains** - Noise accumulates faster

---

## 10. Theoretical Background

### 10.1 Relation to HRR

Holographic Reduced Representations (Plate, 1995) typically use:
- Real-valued vectors (10,000+ dimensions)
- Circular convolution for binding
- FFT for efficient computation

Metric-Affine can be seen as a "quantized HRR" where:
- Real values → integers 0-255
- Circular convolution → simplified XOR
- Continuous similarity → L₁ distance

### 10.2 Fuzzy-Boolean Interpretation

The name "Fuzzy-Boolean Hyper-Lattice" reflects:
- **Fuzzy:** Values are continuous (0-255), not binary
- **Boolean:** XOR binding follows Boolean algebra
- **Hyper:** High-dimensional (32 bytes = 256 bits of information)
- **Lattice:** Arithmetic mean creates lattice-like averaging structure

---

## 11. Future Directions

1. **Adaptive Thresholds** - Learn optimal thresholds from evaluation data
2. **Geometry-Aware Calibration** - Tune thresholds and heuristics as a function of `D`
3. **Weighted Bundle** - Non-uniform weighting for concept importance
4. **Median Bundle** - Alternative to mean for outlier resistance

---

*End of Chapter 18*
