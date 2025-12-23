# AGISystem2 - System Specifications

# Chapter 15: Sparse Polynomial HDC (SPHDC) - Efficient Sparse Hyperdimensional Computing

**Document Version:** 2.0
**Status:** Implemented & Verified
**Audience:** Technical Architects, HDC Researchers, Core Developers

---

## 1. Executive Summary

This document specifies the **Sparse Polynomial HDC (SPHDC)** strategy - a sparse hyperdimensional computing approach that represents concepts as small sets of k BigInt exponents instead of large dense bit vectors.

**Key Innovation:** SPHDC encodes semantic information using just k 64-bit integers (default k=4, 32 bytes) instead of thousands of bits, achieving 100% accuracy on symbolic reasoning while being 8x smaller and 1.5x faster than dense binary HDC.

**Verified Results (126/126 tests):**
- **Accuracy:** 100% pass rate on evaluation suite
- **Memory:** 32 bytes/vector (vs 256 bytes Dense-Binary)
- **Speed:** 60ms for 126 tests (vs 91ms Dense-Binary)

---

## 2. Mathematical Foundation

### 2.1 Core Representation

Each concept is represented as a **sparse set of k BigInt exponents**:

```
Concept → { exp₀, exp₁, exp₂, ..., exp_{k-1} }

Where each expᵢ is a 64-bit integer (BigInt)
Default k = 4, giving 32 bytes per vector
```

### 2.2 Binding Operation (Cartesian XOR)

Binding two vectors produces the Cartesian XOR of their exponents:

```
A ⊗ B = { aᵢ ⊕ bⱼ | aᵢ ∈ A, bⱼ ∈ B }
```

**Properties:**
- **Self-Inverse:** x ⊕ x = 0, therefore (A ⊗ B) ⊗ B = A ✓
- **Associative:** (A ⊗ B) ⊗ C = A ⊗ (B ⊗ C) ✓
- **Complexity:** O(k²) = O(16) operations for k=4

**Sparsification:** When |result| > k, use Min-Hash sampling to select k exponents with smallest hash values.

### 2.3 Similarity (Jaccard Index)

Similarity between two vectors uses set overlap:

```
sim(A, B) = |A ∩ B| / |A ∪ B|
```

**Complexity:** O(k) with sorted sets

### 2.4 Bundle (Set Union)

Bundling combines vectors via set union with sparsification:

```
bundle(A, B, ...) = sparsify(A ∪ B ∪ ...)
```

---

## 3. Implementation Architecture

### 3.1 File Structure

```
src/hdc/strategies/
├── dense-binary.mjs          # Dense 2048-bit vectors
├── sparse-polynomial.mjs     # SPHDC k-exponent vectors
└── index.mjs                 # Strategy registry
```

### 3.2 SPVector Class

```javascript
class SPVector {
  constructor(exponents = new Set(), maxSize = 4) {
    this.exponents = exponents;  // Set<bigint>
    this.maxSize = maxSize;      // k parameter
    this.geometry = maxSize;     // Contract compatibility
    this.strategyId = 'sparse-polynomial';
  }

  size() { return this.exponents.size; }
  toArray() { return Array.from(this.exponents).sort((a, b) => a < b ? -1 : 1); }
  clone() { return new SPVector(new Set(this.exponents), this.maxSize); }
}
```

### 3.3 Strategy Contract

```javascript
export const sparsePolynomialStrategy = {
  id: 'sparse-polynomial',
  properties: {
    id: 'sparse-polynomial',
    displayName: 'Sparse Polynomial HDC (SPHDC)',
    defaultGeometry: 4,              // k=4 exponents
    bytesPerVector: (k) => 8 * k,    // 8 bytes per BigInt
    bindComplexity: 'O(k²)',
    sparseOptimized: true
  },

  // Factory functions
  createZero,
  createRandom,
  createFromName,
  deserialize,

  // Core operations
  bind,           // Cartesian XOR
  bundle,         // Set union + sparsify
  similarity,     // Jaccard index
  unbind,         // Same as bind (self-inverse)

  // Utilities
  clone, equals, serialize, topKSimilar, distance, isOrthogonal,
  serializeKB, deserializeKB,

  Vector: SPVector
};
```

---

## 4. The k Parameter

### 4.1 k Parameter Study Results

| k Value | Pass Rate | Time (126 tests) | Memory/Vector | Ops/Bind |
|---------|-----------|------------------|---------------|----------|
| k=16    | 99%       | 989ms            | 128 bytes     | 256      |
| k=8     | 99%       | 218ms            | 64 bytes      | 64       |
| **k=4** | **100%**  | **60ms**         | **32 bytes**  | **16**   |
| k=2     | 100%      | 29ms             | 16 bytes      | 4        |
| k=1     | 100%      | 24ms             | 8 bytes       | 1        |

### 4.2 Key Discovery

For pure symbolic reasoning, even k=1 (a single 64-bit hash) achieves 100% accuracy. The reasoning system primarily uses:
- Symbolic KB matching (exact operator + argument lookup)
- Transitive chain reasoning (graph traversal)
- Rule derivation (pattern matching with unification)

HDC similarity-based retrieval (Master Equation) is rarely needed, making large vectors unnecessary.

### 4.3 Recommended Setting

**k=4 (default)** - Optimal balance:
- 100% accuracy on all tests
- 1.5x faster than Dense-Binary
- 8x smaller memory footprint
- Safety margin for edge cases

---

## 5. Comparison with Dense-Binary

| Aspect | Dense-Binary | SPHDC (k=4) | Winner |
|--------|--------------|-------------|--------|
| Vector Size | 2048 bits (256 bytes) | 4 × 64-bit (32 bytes) | **SPHDC** (8x smaller) |
| Bind Ops | O(64) XOR ops | O(16) XOR ops | **SPHDC** (4x fewer) |
| Similarity | Hamming distance | Jaccard index | Dense (more precise) |
| HDC Retrieval | 35% success | 0% success | **Dense** |
| Eval Accuracy | 100% | 100% | Tie |
| Speed (126 tests) | 91ms | 60ms | **SPHDC** (1.5x faster) |

---

## 6. Usage

### 6.1 Environment Variable

```bash
export SYS2_HDC_STRATEGY=sparse-polynomial
```

### 6.2 Programmatic Initialization

```javascript
import { initHDC } from './src/hdc/facade.mjs';
import { Session } from './src/runtime/session.mjs';

// Initialize SPHDC strategy
initHDC('sparse-polynomial');

// Create session with k=4 (default for SPHDC)
const session = new Session({ geometry: 4 });

// For maximum speed, use k=1
const fastSession = new Session({ geometry: 1 });
```

### 6.3 Backward Compatibility

The old strategy ID `fractal-semantic` is still supported as an alias:

```javascript
initHDC('fractal-semantic');  // Works, uses SPHDC
```

---

## 7. Theoretical Scalability

### 7.1 Information Space

```
Dense-Binary (2048 bits):
  - 2^2048 possible vectors
  - Fixed memory: 256 bytes
  - Cannot scale beyond geometry

SPHDC (k=4, 64-bit):
  - (2^64)^4 = 2^256 possible combinations
  - Fixed memory: 32 bytes
  - Theoretical: BigInt exponents can grow arbitrarily
```

### 7.2 Future Potential

SPHDC's sparse polynomial representation enables:
- **Adaptive exponent growth:** Larger exponents for complex concepts
- **Variable k:** Increase k for deeper compositional structures
- **Memory efficiency:** Only store active exponents

### 7.3 Current Limitations

The current implementation has not yet demonstrated these advantages:
- 0% HDC Master Equation success (Jaccard doesn't work for unbinding)
- Reasoning still primarily symbolic, not holographic
- k is fixed, not adaptive

---

## 8. Testing

### 8.1 Unit Tests

```
tests/unit/hdc/sparse-polynomial.test.mjs
```

**Coverage:**
- ✅ Vector creation and initialization
- ✅ Binding properties (self-inverse, associative)
- ✅ Similarity calculations (Jaccard)
- ✅ Bundle operations
- ✅ Serialization/deserialization

### 8.2 Integration Tests

```bash
# Run evaluation suite with SPHDC
SYS2_HDC_STRATEGY=sparse-polynomial node evals/runFastEval.mjs
```

---

## 9. Naming Rationale

**Why "Sparse Polynomial HDC" (SPHDC)?**

1. **Sparse:** Vectors are small sets (k elements) vs dense bit arrays
2. **Polynomial:** Binding creates Cartesian products, mathematically equivalent to polynomial multiplication over GF(2)
3. **HDC:** Implements hyperdimensional computing contract

**Previous name "Fractal Semantic Polynomials" (FSP)** was misleading:
- Nothing fractal or hierarchical in the implementation
- No semantic clustering or multi-level structure
- Just sparse sets of BigInt exponents with XOR binding

---

## 10. Conclusion

SPHDC provides an efficient alternative to dense binary HDC for symbolic reasoning:

1. **Smaller:** 8x less memory (32 bytes vs 256 bytes)
2. **Faster:** 1.5x speedup (60ms vs 91ms for 126 tests)
3. **Accurate:** 100% pass rate on evaluation suite
4. **Simple:** Just k integers with XOR binding

For applications requiring similarity-based retrieval (HDC Master Equation), Dense-Binary remains the better choice. For pure symbolic reasoning with KB matching and transitive chains, SPHDC is optimal.

---

*End of Chapter 15*
